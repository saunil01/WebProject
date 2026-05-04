import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bell,
  BellOff,
  Camera,
  KeyRound,
  Mail,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import LoadingScreen from "../components/LoadingScreen";
import { AuthContext } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { avatarUrl, initialsOf } from "../utils/avatar";
import { loadReminder, saveReminder } from "../utils/reminder";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [reminder, setReminder] = useState(loadReminder());
  const fileInputRef = useRef(null);
  const { user, setUser, logout } = useContext(AuthContext);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (!deletePassword) {
      return toast.error("Please enter your password to confirm.");
    }
    const ok = await confirm({
      title: "Delete your account permanently?",
      message:
        "Your moods, journals, breathing sessions, friends, messages, and profile picture will all be removed. This cannot be undone.",
      confirmText: "Delete forever",
      danger: true,
    });
    if (!ok) return;

    try {
      setDeleting(true);
      // axios.delete with a body needs the `data` key — easy to miss.
      await api.delete("/auth/delete", { data: { password: deletePassword } });
      toast.success("Your account has been deleted. Take care.");
      logout();
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete your account.");
    } finally {
      setDeleting(false);
    }
  };

  const updateReminder = (changes) => {
    const next = { ...reminder, ...changes };
    setReminder(next);
    saveReminder(next);
    if (changes.enabled === true && typeof Notification !== "undefined") {
      // Asking permission here gives the browser a clear user-gesture origin.
      Notification.requestPermission?.();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/auth/profile");
        const data = res.data || {};
        const dob = data.dob ? data.dob.split("T")[0] : "";
        setProfile({ ...data, dob });
      } catch {
        toast.error("Could not load your profile.");
      }
    })();
  }, []);

  if (!profile) return <LoadingScreen label="Loading your profile..." />;

  const initials = initialsOf(profile.username);
  const currentAvatar = avatarUrl(profile.avatar);

  const age = (() => {
    if (!profile.dob) return null;
    const [y, m, d] = profile.dob.split("-").map(Number);
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const md = today.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  })();

  const startEdit = () => {
    setDraft({ ...profile });
    setEditing(true);
  };

  // Merge any subset of user fields into AuthContext + localStorage
  // so the sidebar, topbar, and every other consumer of `user` updates instantly.
  const persistToAuth = (changes) => {
    if (!user) return;
    const updated = { ...user, ...changes };
    setUser(updated);
    try {
      localStorage.setItem("user", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const persistAvatarToContext = (newAvatar) => persistToAuth({ avatar: newAvatar });

  const save = async () => {
    try {
      setSaving(true);
      const payload = { ...draft, dob: draft.dob || null };
      await api.put("/auth/update", payload);
      setProfile({ ...draft });
      setEditing(false);
      // Propagate any user-facing fields that may have changed
      persistToAuth({
        username: draft.username,
        email: draft.email,
        gender: draft.gender,
        dob: draft.dob || null,
        about_me: draft.about_me,
      });
      toast.success("Profile updated.");
    } catch {
      toast.error("Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset input so re-picking the same file fires onChange
    if (!file) return;

    // Some browsers/OSes don't reliably set `file.type` (HEIC photos, files
    // copied from network drives, etc.). Fall back to extension check so the
    // user isn't blocked on a bad MIME guess.
    const looksLikeImage =
      (file.type && file.type.startsWith("image/")) ||
      /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
    if (!looksLikeImage) {
      return toast.error("Please choose an image file (JPG, PNG, WEBP, GIF, BMP, HEIC, or AVIF).");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image must be 5MB or smaller.");
    }
    try {
      setUploadingAvatar(true);
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await api.post("/auth/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newAvatar = res.data?.avatar || null;
      setProfile((p) => ({ ...p, avatar: newAvatar }));
      persistAvatarToContext(newAvatar);
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not upload picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!profile.avatar) return;
    const ok = await confirm({
      title: "Remove your profile picture?",
      message: "We'll go back to your initials. You can upload a new picture anytime.",
      confirmText: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete("/auth/avatar");
      setProfile((p) => ({ ...p, avatar: null }));
      persistAvatarToContext(null);
      toast.success("Profile picture removed.");
    } catch {
      toast.error("Could not remove picture.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Your profile" subtitle="Keep your details up to date." />

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt={profile.username}
                className="w-20 h-20 rounded-full object-cover border border-surface-200 dark:border-surface-700"
              />
            ) : (
              <div className="avatar w-20 h-20 text-xl">{initials}</div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md hover:bg-primary-700 disabled:opacity-60"
              aria-label="Change profile picture"
              title="Change profile picture"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFilePicked}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-xl truncate">
              {profile.username}
            </h2>
            <p className="text-sm text-surface-500 flex items-center gap-1.5 truncate">
              <Mail size={14} /> {profile.email}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
              <span className="badge-primary capitalize">{profile.role || "member"}</span>
              {profile.created_at && (
                <span className="badge-muted">
                  Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              )}
              {profile.avatar && (
                <button
                  onClick={removeAvatar}
                  className="text-xs inline-flex items-center gap-1 text-surface-500 hover:text-danger"
                >
                  <Trash2 size={12} /> Remove picture
                </button>
              )}
            </div>
          </div>

          {!editing && (
            <button onClick={startEdit} className="btn-secondary">
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>

        {uploadingAvatar && (
          <p className="mt-3 text-xs text-surface-500">Uploading picture...</p>
        )}

        <hr className="hr-soft my-6" />

        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Gender" value={profile.gender ? profile.gender[0].toUpperCase() + profile.gender.slice(1) : "Not specified"} />
            <Field
              label="Date of birth"
              value={
                profile.dob
                  ? `${profile.dob.split("-").reverse().join("/")}${age != null ? `  ·  ${age} yrs` : ""}`
                  : "Not provided"
              }
            />
            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wider text-surface-500 mb-1">About you</div>
              <p className="text-surface-700 dark:text-surface-200">
                {profile.about_me || <span className="text-surface-400 italic">No bio yet.</span>}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                value={draft.username || ""}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={draft.email || ""}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Date of birth</label>
              <input
                type="date"
                className="input"
                value={draft.dob || ""}
                onChange={(e) => setDraft({ ...draft, dob: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Gender</label>
              <select
                className="input"
                value={draft.gender || ""}
                onChange={(e) => setDraft({ ...draft, gender: e.target.value })}
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">About you</label>
              <textarea
                rows={4}
                className="input resize-none"
                value={draft.about_me || ""}
                onChange={(e) => setDraft({ ...draft, about_me: e.target.value })}
                placeholder="A short note about yourself..."
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-end gap-2">
              <button onClick={() => setEditing(false)} className="btn-ghost">
                <X size={14} /> Cancel
              </button>
              <button onClick={save} disabled={saving} className="btn-primary">
                <Save size={14} /> {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        )}

        <hr className="hr-soft my-6" />

        {/* Reminder settings — stored in localStorage, no backend round-trip */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-primary-700 dark:text-primary-300">
            {reminder.enabled ? <Bell size={16} /> : <BellOff size={16} />}
            <h3 className="font-display font-semibold">Daily check-in reminder</h3>
          </div>
          <p className="text-sm text-surface-600 dark:text-surface-300 mb-4">
            Pick a time and we'll nudge you to log your mood. The reminder fires
            in-app when you next open MindMate, and as a browser notification if
            you allow them.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary-600"
                checked={reminder.enabled}
                onChange={(e) => updateReminder({ enabled: e.target.checked })}
              />
              <span className="text-sm font-medium">Enable reminder</span>
            </label>
            <input
              type="time"
              className="input w-auto"
              value={reminder.time}
              disabled={!reminder.enabled}
              onChange={(e) => updateReminder({ time: e.target.value })}
            />
            {reminder.enabled && (
              <span className="text-xs text-surface-500">
                We'll remind you at {reminder.time} each day.
              </span>
            )}
          </div>
        </div>

        <hr className="hr-soft my-6" />

        {/* Account actions — Change password + Delete account, side by side. */}
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/forgot-password" className="btn-secondary">
            <KeyRound size={14} /> Change password
          </Link>
          <button
            type="button"
            onClick={() => {
              setShowDeletePanel((v) => !v);
              setDeletePassword("");
            }}
            className="btn-ghost text-danger hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            <Trash2 size={14} /> Delete account
          </button>
        </div>

        {showDeletePanel && (
          <div className="mt-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-900/10 p-5">
            <p className="text-sm text-surface-700 dark:text-surface-200 leading-relaxed">
              This permanently removes your account and everything in it — moods, journals,
              breathing sessions, friends, messages, and your profile picture. You won't be
              able to log back in.{" "}
              <strong className="text-rose-700 dark:text-rose-300">This cannot be undone.</strong>
            </p>
            <div className="mt-4">
              <label className="label">Enter your password to confirm</label>
              <input
                type="password"
                className="input"
                placeholder="Your current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeletePanel(false);
                  setDeletePassword("");
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting || !deletePassword}
                className="btn-danger"
              >
                <Trash2 size={14} /> {deleting ? "Deleting..." : "Delete my account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-surface-500 mb-1">{label}</div>
      <div className="text-surface-800 dark:text-surface-100">{value}</div>
    </div>
  );
}
