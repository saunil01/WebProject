import { useEffect, useMemo, useState } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import toast from "react-hot-toast";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Download,
  Heart,
  HeartPulse,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import LoadingScreen from "../components/LoadingScreen";
import EmptyState from "../components/EmptyState";
import { avatarUrl, initialsOf } from "../utils/avatar";
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

ChartJS.register(
  ArcElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler
);

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "all", label: "All time" },
];

const MOOD_COLORS = {
  happy: "#10b981",
  neutral: "#94a3b8",
  sad: "#6366f1",
  anxious: "#f59e0b",
  stressed: "#ef4444",
};
const MOOD_EMOJI = {
  happy: "😊",
  neutral: "😐",
  sad: "😔",
  anxious: "😟",
  stressed: "😣",
};

function moodLabelForScore(score) {
  if (score >= 4.2) return { emoji: "😊", label: "Bright" };
  if (score >= 3.4) return { emoji: "🙂", label: "Steady" };
  if (score >= 2.6) return { emoji: "😐", label: "Mixed" };
  if (score >= 1.8) return { emoji: "😔", label: "Heavy" };
  if (score > 0)    return { emoji: "😣", label: "Tough" };
  return { emoji: "—", label: "No data" };
}

function relativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Inline-SVG sparkline (cheap and crisp at this size)
function Sparkline({ points = [], color = "#1aa88c" }) {
  if (points.length === 0) {
    return <div className="h-7 text-[10px] text-surface-400">No activity</div>;
  }
  const w = 100;
  const h = 28;
  const max = Math.max(1, ...points.map((p) => Number(p.count)));
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - (Number(p.count) / max) * (h - 2) - 1;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `${path} L ${(points.length - 1) * stepX} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-7">
      <path d={area} fill={color} fillOpacity="0.15" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminPanel() {
  const [range, setRange] = useState("7");
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [needsCare, setNeedsCare] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [s, a, n] = await Promise.all([
          api.get(`/admin/analytics?range=${range}`),
          api.get(`/admin/activity?limit=12`),
          api.get(`/admin/needs-care?days=14`),
        ]);
        if (cancelled) return;
        setStats(s.data || null);
        setActivity(a.data || []);
        setNeedsCare(n.data || []);
      } catch {
        if (!cancelled) toast.error("Failed to load admin dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const trend = useMemo(() => {
    if (!stats?.trend) return [];
    return stats.trend.map((t) => ({
      day: new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: Number(t.avg_score) || 0,
    }));
  }, [stats]);

  const trendData = {
    labels: trend.map((t) => t.day),
    datasets: [
      {
        label: "Avg mood",
        data: trend.map((t) => t.score),
        borderColor: "#1aa88c",
        backgroundColor: "rgba(26,168,140,0.18)",
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: "#1aa88c",
        fill: true,
      },
    ],
  };
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 5, grid: { color: "rgba(100,116,139,0.15)" } },
      x: { grid: { display: false } },
    },
  };

  const distributionData = useMemo(() => {
    const d = stats?.moodDistribution || {};
    const types = ["happy", "neutral", "sad", "anxious", "stressed"];
    return {
      labels: types.map((t) => t[0].toUpperCase() + t.slice(1)),
      datasets: [
        {
          data: types.map((t) => d[t] || 0),
          backgroundColor: types.map((t) => MOOD_COLORS[t]),
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);
  const distributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
  };
  const distributionTotal = useMemo(() => {
    const d = stats?.moodDistribution || {};
    return Object.values(d).reduce((a, b) => a + Number(b || 0), 0);
  }, [stats]);

  const exportCSV = () => {
    if (!stats) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Users", stats.users],
      ["Total Journals", stats.journals],
      ["Total Mood Entries", stats.moods],
      ["Average Mood Score", stats.averageMood],
      ["Active Today", stats.activeToday],
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindmate_admin_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingScreen label="Loading admin dashboard..." />;
  if (!stats) return null;

  const today = moodLabelForScore(Number(stats.todayMoodAverage) || 0);
  const overall = moodLabelForScore(Number(stats.averageMood) || 0);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Admin console"
        subtitle="A live view of how your community is doing."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl p-1 text-xs">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    range === r.key
                      ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 shadow-sm"
                      : "text-surface-600 dark:text-surface-300 hover:text-surface-900"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button className="btn-secondary" onClick={exportCSV}>
              <Download size={14} /> Export
            </button>
          </div>
        }
      />

      {/* HERO BAND — today's pulse */}
      <div className="rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 text-white p-6 sm:p-8 shadow-lifted">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] opacity-80">Active today</div>
            <div className="mt-1 flex items-baseline gap-3">
              <div className="text-5xl sm:text-6xl font-display font-bold leading-none">
                {stats.activeToday}
              </div>
              <div className="text-sm opacity-80">
                of {stats.users} {stats.users === 1 ? "member" : "members"}
              </div>
            </div>
            <div className="mt-3 text-sm opacity-90 max-w-md">
              People who logged a mood or wrote a journal entry in the last 24 hours.
            </div>
          </div>

          <div className="md:border-l md:border-white/20 md:pl-6">
            <div className="text-xs uppercase tracking-[0.2em] opacity-80">Community mood today</div>
            <div className="mt-1 flex items-center gap-4">
              <div className="text-5xl">{today.emoji}</div>
              <div>
                <div className="text-3xl sm:text-4xl font-display font-bold leading-none">
                  {Number(stats.todayMoodAverage || 0).toFixed(2)}
                  <span className="text-base font-normal opacity-70 ml-1">/ 5</span>
                </div>
                <div className="mt-1 text-sm opacity-90">{today.label} overall</div>
              </div>
            </div>
            <div className="mt-3 text-xs opacity-80">
              {RANGES.find((r) => r.key === range)?.label} average:{" "}
              <span className="font-semibold">{Number(stats.averageMood || 0).toFixed(2)}</span>{" "}
              ({overall.label})
            </div>
          </div>
        </div>
      </div>

      {/* METRIC CARDS with sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <MetricCard
          icon={Users}
          tone="primary"
          label="Total users"
          value={stats.users}
          spark={stats.sparklines?.users}
          sparkColor="#1aa88c"
        />
        <MetricCard
          icon={BookOpen}
          tone="accent"
          label="Journals"
          value={stats.journals}
          spark={stats.sparklines?.journals}
          sparkColor="#3b82f6"
        />
        <MetricCard
          icon={Heart}
          tone="rose"
          label="Mood entries"
          value={stats.moods}
          spark={stats.sparklines?.moods}
          sparkColor="#ec4899"
        />
        <MetricCard
          icon={Activity}
          tone="emerald"
          label="Avg mood"
          value={Number(stats.averageMood || 0).toFixed(2)}
          suffix="/ 5"
          spark={stats.sparklines?.moods}
          sparkColor="#10b981"
        />
      </div>

      {/* TREND + MOOD MIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg">Mood trend</h3>
            <span className="text-xs text-surface-500">Last {trend.length || 0} days</span>
          </div>
          <div className="h-72">
            {trend.length > 0 ? (
              <Line data={trendData} options={trendOptions} />
            ) : (
              <EmptyState icon={Activity} title="No trend yet" description="Trends appear once members start logging moods." />
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg">Mood mix</h3>
            <span className="text-xs text-surface-500">{distributionTotal} entries</span>
          </div>
          <div className="h-60">
            {distributionTotal > 0 ? (
              <Doughnut data={distributionData} options={distributionOptions} />
            ) : (
              <EmptyState icon={Sparkles} title="No moods in window" description="Try a wider time range." />
            )}
          </div>
        </div>
      </div>

      {/* WELLBEING WATCHLIST + ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1 text-rose-600 dark:text-rose-400">
            <HeartPulse size={18} />
            <h3 className="font-display font-semibold text-lg text-surface-900 dark:text-surface-50">
              Wellbeing watchlist
            </h3>
          </div>
          <p className="text-xs text-surface-500 mb-4">
            Members whose recent moods skew low — a soft signal, not a diagnosis.
          </p>
          {needsCare.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Nobody needs attention"
              description="No member's recent moods are trending negative."
            />
          ) : (
            <ul className="divide-y divide-surface-200 dark:divide-surface-800 max-h-[22rem] overflow-y-auto">
              {needsCare.map((u) => {
                const pic = avatarUrl(u.avatar);
                const ratio = Math.round(u.negative_ratio * 100);
                return (
                  <li key={u.user_id} className="py-3 flex items-center gap-3">
                    {pic ? (
                      <img
                        src={pic}
                        alt={u.username}
                        className="w-9 h-9 rounded-full object-cover border border-surface-200 dark:border-surface-700"
                      />
                    ) : (
                      <div className="avatar w-9 h-9 text-xs">{initialsOf(u.username)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{u.username}</div>
                      <div className="text-xs text-surface-500 truncate">
                        Last mood{" "}
                        <span className="capitalize">
                          {MOOD_EMOJI[u.last_mood_type] || ""} {u.last_mood_type}
                        </span>
                        {" · "}
                        {relativeTime(u.last_mood_at)}
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 whitespace-nowrap"
                      title={`${u.negative_count} of ${u.recent_count} recent moods were negative`}
                    >
                      {ratio}% low
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1 text-primary-600 dark:text-primary-400">
            <Activity size={18} />
            <h3 className="font-display font-semibold text-lg text-surface-900 dark:text-surface-50">
              Latest activity
            </h3>
          </div>
          <p className="text-xs text-surface-500 mb-4">
            Newest signups, moods, and journals across the platform.
          </p>
          {activity.length === 0 ? (
            <EmptyState icon={Activity} title="Nothing yet" description="Activity will appear here." />
          ) : (
            <ul className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
              {activity.map((item, i) => (
                <ActivityRow key={`${item.type}-${i}`} item={item} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* INACTIVE USERS — kept */}
      {stats.inactiveUsers?.length > 0 && (
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-2 mb-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={18} />
            <h3 className="font-display font-semibold text-lg text-surface-900 dark:text-surface-50">
              Inactive 7+ days
            </h3>
          </div>
          <p className="text-xs text-surface-500 mb-4">Members who haven't signed in for at least a week.</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
            {stats.inactiveUsers.map((u) => {
              const pic = avatarUrl(u.avatar);
              return (
                <li key={u.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                  {pic ? (
                    <img
                      src={pic}
                      alt={u.username}
                      className="w-9 h-9 rounded-full object-cover border border-surface-200 dark:border-surface-700"
                    />
                  ) : (
                    <div className="avatar w-9 h-9 text-xs">{initialsOf(u.username)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.username}</div>
                    <div className="text-xs text-surface-500 truncate">{u.email}</div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 whitespace-nowrap">
                    {u.days_inactive}d
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, suffix, tone = "primary", spark, sparkColor }) {
  const toneClasses = {
    primary: "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
    accent: "bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  }[tone];

  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${toneClasses}`}>
        <Icon size={18} />
      </div>
      <div className="text-xs uppercase tracking-wider text-surface-500">{label}</div>
      <div className="mt-1 text-2xl sm:text-3xl font-display font-bold text-surface-900 dark:text-surface-50">
        {value ?? "—"}
        {suffix && <span className="text-sm text-surface-500 ml-1">{suffix}</span>}
      </div>
      <div className="mt-3">
        <Sparkline points={spark || []} color={sparkColor} />
        <div className="mt-1 text-[10px] uppercase tracking-wider text-surface-400">Last 7 days</div>
      </div>
    </div>
  );
}

function ActivityRow({ item }) {
  const pic = avatarUrl(item.user?.avatar);
  const initials = initialsOf(item.user?.username);
  const time = relativeTime(item.at);

  let badge = null;
  let body = null;

  if (item.type === "signup") {
    badge = (
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        Joined
      </span>
    );
    body = (
      <div className="text-sm">
        <span className="font-medium">{item.user?.username}</span>{" "}
        <span className="text-surface-500">joined the community</span>
      </div>
    );
  } else if (item.type === "mood") {
    badge = (
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
        Mood
      </span>
    );
    body = (
      <div className="text-sm">
        <span className="font-medium">{item.user?.username}</span>{" "}
        <span className="text-surface-500">felt</span>{" "}
        <span className="capitalize font-medium">
          {MOOD_EMOJI[item.mood_type]} {item.mood_type}
        </span>
        {item.note && (
          <p className="text-xs text-surface-500 mt-0.5 line-clamp-2 italic">"{item.note}"</p>
        )}
      </div>
    );
  } else if (item.type === "journal") {
    badge = (
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
        Journal
      </span>
    );
    body = (
      <div className="text-sm min-w-0">
        <span className="font-medium">{item.user?.username}</span>{" "}
        <span className="text-surface-500">wrote</span>{" "}
        <span className="font-medium truncate">{item.title || "(untitled)"}</span>
        {item.preview && (
          <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{item.preview}</p>
        )}
      </div>
    );
  }

  return (
    <li className="flex items-start gap-3">
      {pic ? (
        <img
          src={pic}
          alt={item.user?.username}
          className="w-8 h-8 rounded-full object-cover border border-surface-200 dark:border-surface-700 shrink-0"
        />
      ) : (
        <div className="avatar w-8 h-8 text-[11px] shrink-0">{initials}</div>
      )}
      <div className="flex-1 min-w-0">{body}</div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {badge}
        <span className="text-[11px] text-surface-400 whitespace-nowrap">{time}</span>
      </div>
    </li>
  );
}
