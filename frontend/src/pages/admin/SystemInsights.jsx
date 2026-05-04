import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Activity, EyeOff, Heart, Lock, Search, Trash2 } from "lucide-react";
import api from "../../api";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import { useConfirm } from "../../context/ConfirmContext";
import { avatarUrl, initialsOf } from "../../utils/avatar";

const MOOD_EMOJI = {
  happy: "😊",
  neutral: "😐",
  sad: "😔",
  anxious: "😟",
  stressed: "😣",
};

const MOOD_TONE = {
  happy: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  neutral: "bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300",
  sad: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  anxious: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  stressed: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SystemInsights() {
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState("all");
  const confirm = useConfirm();

  const load = async () => {
    try {
      const res = await api.get("/admin/moods");
      setMoods(res.data || []);
    } catch {
      toast.error("Failed to load mood data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (m) => {
    const ok = await confirm({
      title: "Delete this mood entry?",
      message: `Removes a "${m.mood_type}" entry by ${m.username || "this user"}. The note (if any) is private and not visible to admins. This cannot be undone.`,
      confirmText: "Delete entry",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/mood/${m.mood_id}`);
      setMoods((arr) => arr.filter((x) => x.mood_id !== m.mood_id));
      toast.success("Mood entry removed.");
    } catch {
      toast.error("Failed to delete mood entry.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return moods.filter((m) => {
      if (moodFilter !== "all" && m.mood_type !== moodFilter) return false;
      if (!q) return true;
      return m.username?.toLowerCase().includes(q);
    });
  }, [moods, query, moodFilter]);

  const stats = useMemo(() => {
    const counts = { happy: 0, neutral: 0, sad: 0, anxious: 0, stressed: 0 };
    for (const m of moods) counts[m.mood_type] = (counts[m.mood_type] || 0) + 1;
    return { total: moods.length, ...counts };
  }, [moods]);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Moods data"
        subtitle="System-wide view — anonymized notes, public emotion tracking only."
      />

      {/* Privacy notice */}
      <div className="rounded-2xl border border-primary-200 dark:border-primary-900/50 bg-primary-50/60 dark:bg-primary-900/15 p-4 flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 flex items-center justify-center shrink-0">
          <Lock size={18} />
        </div>
        <div className="text-sm text-surface-800 dark:text-surface-100 leading-relaxed">
          <strong className="font-semibold">Mood notes and lifestyle details are private.</strong>{" "}
          You see who logged a mood and what emotion they reported — but never
          the optional note, sleep hours, exercise toggle, or caffeine count.
          That's health data, kept between the user and the database.
        </div>
      </div>

      {/* Mood breakdown stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wider text-surface-500">Total</div>
          <div className="mt-1 text-2xl font-display font-bold">{stats.total}</div>
        </div>
        {["happy", "neutral", "sad", "anxious", "stressed"].map((k) => (
          <div key={k} className="card p-4">
            <div className="text-xs uppercase tracking-wider text-surface-500 capitalize flex items-center gap-1">
              <span>{MOOD_EMOJI[k]}</span> {k}
            </div>
            <div className="mt-1 text-2xl font-display font-bold">{stats[k] || 0}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mt-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Filter by username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={moodFilter}
          onChange={(e) => setMoodFilter(e.target.value)}
        >
          <option value="all">All moods</option>
          <option value="happy">Happy</option>
          <option value="neutral">Neutral</option>
          <option value="sad">Sad</option>
          <option value="anxious">Anxious</option>
          <option value="stressed">Stressed</option>
        </select>
      </div>

      {/* Mood entries */}
      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-surface-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon={Activity}
              title={moods.length === 0 ? "No mood data yet" : "No matches"}
              description={moods.length === 0 ? "Entries will appear as users log moods." : "Try a different filter."}
            />
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((m) => (
              <MoodRow key={m.mood_id} mood={m} onDelete={() => remove(m)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MoodRow({ mood: m, onDelete }) {
  const pic = avatarUrl(m.avatar);
  const initials = initialsOf(m.username);
  const tone = MOOD_TONE[m.mood_type] || MOOD_TONE.neutral;
  const emoji = MOOD_EMOJI[m.mood_type] || "🙂";

  return (
    <li className="card p-4 flex items-center gap-4 group">
      {pic ? (
        <img
          src={pic}
          alt={m.username || ""}
          className="w-9 h-9 rounded-full object-cover border border-surface-200 dark:border-surface-700 shrink-0"
        />
      ) : (
        <div className="avatar w-9 h-9 text-xs shrink-0">{initials}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{m.username || "(unknown user)"}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md capitalize inline-flex items-center gap-1 ${tone}`}>
            <span>{emoji}</span>
            {m.mood_type}
          </span>
          {(m.has_note || m.has_lifestyle) && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300 inline-flex items-center gap-1">
              <EyeOff size={9} /> Private details
            </span>
          )}
        </div>
        <div className="text-xs text-surface-500 mt-0.5">
          {formatDate(m.mood_date)} · {formatTime(m.mood_date)}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 btn-ghost text-danger transition"
        aria-label="Delete entry"
      >
        <Trash2 size={14} /> Delete
      </button>
    </li>
  );
}
