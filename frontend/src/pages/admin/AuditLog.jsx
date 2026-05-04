import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BookOpen,
  ClipboardList,
  Heart,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import api from "../../api";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";

// Each row of the audit log gets a small icon + tone based on action_type
// so admins can scan visually for "delete a user" vs "delete a mood".
const ACTION_META = {
  delete_user: {
    icon: UserMinus,
    label: "Deleted user",
    tone: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
  delete_journal: {
    icon: BookOpen,
    label: "Removed journal entry",
    tone: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
  },
  delete_mood: {
    icon: Heart,
    label: "Removed mood entry",
    tone: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  },
};

function relativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatExact(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/admin/audit-log");
        setRows(res.data || []);
      } catch {
        toast.error("Failed to load audit log.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (actionFilter === "all") return rows;
    return rows.filter((r) => r.action_type === actionFilter);
  }, [rows, actionFilter]);

  const stats = useMemo(() => {
    const counts = { total: rows.length, delete_user: 0, delete_journal: 0, delete_mood: 0 };
    for (const r of rows) {
      if (counts[r.action_type] != null) counts[r.action_type]++;
    }
    const last24h = rows.filter(
      (r) => Date.now() - new Date(r.created_at).getTime() < 24 * 3600e3
    ).length;
    return { ...counts, last24h };
  }, [rows]);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Audit log"
        subtitle="Every privileged admin action — who did what, when, and to whom."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={ClipboardList} label="Total events" value={stats.total} tone="primary" />
        <StatTile icon={Trash2} label="Last 24h" value={stats.last24h} tone="rose" />
        <StatTile icon={UserMinus} label="Users deleted" value={stats.delete_user} tone="rose" />
        <StatTile icon={ShieldCheck} label="Content removed" value={stats.delete_journal + stats.delete_mood} tone="accent" />
      </div>

      <div className="card p-4 mt-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-surface-500 mr-1">Filter:</span>
        {[
          { key: "all", label: "All actions" },
          { key: "delete_user", label: "User deletions" },
          { key: "delete_journal", label: "Journal removals" },
          { key: "delete_mood", label: "Mood removals" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setActionFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              actionFilter === f.key
                ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
                : "bg-surface-100 text-surface-600 hover:text-surface-900 dark:bg-surface-800 dark:text-surface-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-surface-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon={ClipboardList}
              title={rows.length === 0 ? "No admin actions yet" : "No matches"}
              description={rows.length === 0 ? "When an admin deletes a user, journal, or mood, the action lands here." : "Try a different filter."}
            />
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <AuditRow key={r.log_id} row={r} />
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
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
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

function AuditRow({ row }) {
  const meta = ACTION_META[row.action_type] || {
    icon: ClipboardList,
    label: row.action_type,
    tone: "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300",
  };
  const Icon = meta.icon;
  return (
    <li className="card p-4 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.tone}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{meta.label}</span>
          {row.target_resource_id != null && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              {row.target_resource_type} #{row.target_resource_id}
            </span>
          )}
        </div>
        <div className="text-xs text-surface-600 dark:text-surface-300 mt-1">
          <span className="font-semibold">{row.admin_username}</span>{" "}
          {row.target_username ? (
            <>
              <span className="text-surface-500">→ user </span>
              <span className="font-semibold">{row.target_username}</span>
            </>
          ) : null}
        </div>
        <div className="text-[11px] text-surface-500 mt-1" title={formatExact(row.created_at)}>
          {relativeTime(row.created_at)} · {formatExact(row.created_at)}
        </div>
      </div>
    </li>
  );
}
