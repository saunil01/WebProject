import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BookOpen,
  Heart,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import api from "../../api";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import { useConfirm } from "../../context/ConfirmContext";
import { avatarUrl, initialsOf } from "../../utils/avatar";

function relativeTime(ts) {
  if (!ts) return "never";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // all | admin | user
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  const load = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data || []);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (u) => {
    const ok = await confirm({
      title: `Delete ${u.username}?`,
      message:
        "This permanently removes the account and everything connected to it — moods, journals, breathing sessions, friend links, messages. Cannot be undone.",
      confirmText: "Delete user",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/user/${u.user_id}`);
      setUsers((us) => us.filter((x) => x.user_id !== u.user_id));
      toast.success(`${u.username} removed.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete user.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter]);

  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === "admin").length;
    const last7 = users.filter((u) => {
      if (!u.created_at) return false;
      return Date.now() - new Date(u.created_at).getTime() < 7 * 864e5;
    }).length;
    return { total: users.length, admins, regular: users.length - admins, last7 };
  }, [users]);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Manage users" subtitle="Find, review, and remove user accounts." />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Users} label="Total" value={stats.total} tone="primary" />
        <StatTile icon={ShieldCheck} label="Admins" value={stats.admins} tone="accent" />
        <StatTile icon={Users} label="Members" value={stats.regular} tone="primary" />
        <StatTile icon={Heart} label="New (last 7d)" value={stats.last7} tone="emerald" />
      </div>

      {/* Filters */}
      <div className="card p-4 mt-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl p-1 text-xs">
          {[
            { key: "all", label: "All" },
            { key: "admin", label: "Admins" },
            { key: "user", label: "Members" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                roleFilter === f.key
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 shadow-sm"
                  : "text-surface-600 dark:text-surface-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* User cards */}
      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-surface-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon={Users}
              title={users.length === 0 ? "No users yet" : "No matches"}
              description={users.length === 0 ? "Invite someone to sign up." : "Try a different search or filter."}
            />
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((u) => (
              <UserCard key={u.user_id} user={u} onDelete={() => remove(u)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone = "primary" }) {
  const tones = {
    primary: "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
    accent: "bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  }[tone];
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tones}`}>
        <Icon size={18} />
      </div>
      <div className="text-xs uppercase tracking-wider text-surface-500">{label}</div>
      <div className="mt-1 text-2xl font-display font-bold">{value ?? "—"}</div>
    </div>
  );
}

function UserCard({ user, onDelete }) {
  const pic = avatarUrl(user.avatar);
  const isAdmin = user.role === "admin";
  return (
    <li className="card p-5 flex flex-col">
      <div className="flex items-start gap-3">
        {pic ? (
          <img
            src={pic}
            alt={user.username}
            className="w-12 h-12 rounded-full object-cover border border-surface-200 dark:border-surface-700 shrink-0"
          />
        ) : (
          <div className="avatar w-12 h-12 text-sm shrink-0">{initialsOf(user.username)}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-display font-semibold truncate">{user.username}</h3>
            {isAdmin && (
              <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                <ShieldCheck size={10} /> Admin
              </span>
            )}
          </div>
          <p className="text-xs text-surface-500 truncate">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
        <div className="rounded-lg bg-surface-50 dark:bg-surface-800/60 p-2.5">
          <div className="flex items-center gap-1 text-primary-700 dark:text-primary-300">
            <Heart size={11} />
            <span className="text-[10px] uppercase tracking-wider font-semibold">Moods</span>
          </div>
          <div className="font-display font-bold text-base mt-0.5">{user.mood_count ?? 0}</div>
        </div>
        <div className="rounded-lg bg-surface-50 dark:bg-surface-800/60 p-2.5">
          <div className="flex items-center gap-1 text-accent-700 dark:text-accent-300">
            <BookOpen size={11} />
            <span className="text-[10px] uppercase tracking-wider font-semibold">Journals</span>
          </div>
          <div className="font-display font-bold text-base mt-0.5">{user.journal_count ?? 0}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-surface-500">
        <span>Joined {relativeTime(user.created_at)}</span>
        <span>Active {relativeTime(user.last_login)}</span>
      </div>

      <button
        onClick={onDelete}
        disabled={isAdmin}
        className="btn-ghost text-danger hover:bg-rose-50 dark:hover:bg-rose-900/20 mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed"
        title={isAdmin ? "Admins can't be deleted from here" : "Delete this user"}
      >
        <Trash2 size={14} /> {isAdmin ? "Admin (protected)" : "Delete user"}
      </button>
    </li>
  );
}
