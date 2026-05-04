import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BookOpen, EyeOff, Lock, Search, Trash2 } from "lucide-react";
import api from "../../api";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import { useConfirm } from "../../context/ConfirmContext";
import { avatarUrl, initialsOf } from "../../utils/avatar";

function lengthLabel(words) {
  if (words < 30) return "Short";
  if (words < 150) return "Medium";
  if (words < 500) return "Long";
  return "Very long";
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ViewJournals() {
  const [journals, setJournals] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  const load = async () => {
    try {
      const res = await api.get("/admin/journals");
      setJournals(res.data || []);
    } catch {
      toast.error("Failed to load journals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (j) => {
    const ok = await confirm({
      title: "Delete this journal entry?",
      message: `Permanently removes a ${lengthLabel(j.word_count).toLowerCase()} entry by ${j.username || "this user"}. The contents are private to the user — neither you nor we can read them. This cannot be undone.`,
      confirmText: "Delete entry",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/journal/${j.journal_id}`);
      setJournals((js) => js.filter((x) => x.journal_id !== j.journal_id));
      toast.success("Entry removed.");
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return journals;
    return journals.filter((j) => j.username?.toLowerCase().includes(q));
  }, [journals, query]);

  const stats = useMemo(() => {
    const today = journals.filter((j) => {
      if (!j.created_at) return false;
      return Date.now() - new Date(j.created_at).getTime() < 24 * 3600e3;
    }).length;
    const week = journals.filter((j) => {
      if (!j.created_at) return false;
      return Date.now() - new Date(j.created_at).getTime() < 7 * 864e5;
    }).length;
    return { total: journals.length, today, week };
  }, [journals]);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="All journal entries"
        subtitle="Moderation view — counts, dates, and authors. Contents stay private."
      />

      {/* Privacy notice — explicit and unmissable */}
      <div className="rounded-2xl border border-primary-200 dark:border-primary-900/50 bg-primary-50/60 dark:bg-primary-900/15 p-4 flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 flex items-center justify-center shrink-0">
          <Lock size={18} />
        </div>
        <div className="text-sm text-surface-800 dark:text-surface-100 leading-relaxed">
          <strong className="font-semibold">Journal contents are private.</strong>{" "}
          Even as an admin, you can't read what users wrote — that's by design.
          You can see who wrote, when, and how long the entry is, and you can
          remove entries on report or for spam. Every deletion is recorded in the
          audit log.
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Total" value={stats.total} />
        <StatTile label="Last 7 days" value={stats.week} />
        <StatTile label="Today" value={stats.today} />
      </div>

      {/* Filter */}
      <div className="card p-4 mt-5">
        <div className="relative w-full max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Filter by username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Journal metadata cards */}
      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-surface-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon={BookOpen}
              title={journals.length === 0 ? "No journals yet" : "No matches"}
              description={journals.length === 0 ? "Entries appear here as users write." : "Try a different filter."}
            />
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((j) => (
              <JournalRow key={j.journal_id} journal={j} onDelete={() => remove(j)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-surface-500">{label}</div>
      <div className="mt-1 text-2xl font-display font-bold">{value ?? "—"}</div>
    </div>
  );
}

function JournalRow({ journal: j, onDelete }) {
  const pic = avatarUrl(j.avatar);
  const initials = initialsOf(j.username);
  const wordCount = j.word_count || 0;
  return (
    <li className="card p-4 flex items-center gap-4 group">
      {pic ? (
        <img
          src={pic}
          alt={j.username || ""}
          className="w-9 h-9 rounded-full object-cover border border-surface-200 dark:border-surface-700 shrink-0"
        />
      ) : (
        <div className="avatar w-9 h-9 text-xs shrink-0">{initials}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{j.username || "(unknown user)"}</span>
          <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300 inline-flex items-center gap-1">
            <EyeOff size={9} /> Content hidden
          </span>
        </div>
        <div className="text-xs text-surface-500 mt-0.5">
          {formatDate(j.created_at)} · {formatTime(j.created_at)} ·{" "}
          {wordCount} word{wordCount === 1 ? "" : "s"} ({lengthLabel(wordCount)})
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
