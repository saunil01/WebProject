import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bell,
  Clock3,
  Flame,
  Heart,
  Wind,
  X,
} from "lucide-react";
import api from "../api";
import { AuthContext } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import LoadingScreen from "../components/LoadingScreen";
import OnboardingTour from "../components/OnboardingTour";
import { computeStreaks } from "../utils/streaks";
import {
  loadReminder,
  maybeFireBrowserNotification,
  shouldShowReminder,
} from "../utils/reminder";

const MOOD_SCORE = { happy: 5, neutral: 3, sad: 2, anxious: 2, stressed: 1 };
const MOOD_EMOJI = { happy: "😊", neutral: "😐", sad: "😔", anxious: "😟", stressed: "😣" };

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [moods, setMoods] = useState([]);
  const [journals, setJournals] = useState([]);
  const [breathing, setBreathing] = useState([]);
  const [reminder] = useState(loadReminder());
  const [reminderDismissed, setReminderDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [m, j, b] = await Promise.all([
          api.get("/moods").catch(() => ({ data: [] })),
          api.get("/journals").catch(() => ({ data: [] })),
          api.get("/breathing").catch(() => ({ data: [] })),
        ]);
        setMoods(m.data || []);
        setJournals(j.data || []);
        setBreathing(b.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const last7 = moods.filter((m) => {
      const d = new Date(m.mood_date);
      return Date.now() - d.getTime() < 7 * 864e5;
    });
    const avgScore =
      last7.length > 0
        ? (
            last7.reduce((s, m) => s + (MOOD_SCORE[m.mood_type] || 0), 0) /
            last7.length
          ).toFixed(1)
        : "—";
    return {
      totalMoods: moods.length,
      totalJournals: journals.length,
      totalBreathing: breathing.length,
      avgScore,
    };
  }, [moods, journals, breathing]);

  const streaks = useMemo(() => computeStreaks(moods), [moods]);

  // Time-machine: pick something from this day a week ago, a month ago, or
  // a year ago — whichever has content. Prefer journal entries (more interesting).
  const timeMachine = useMemo(
    () => findOnThisDay({ moods, journals }),
    [moods, journals]
  );

  // Show reminder banner if the user has opted in and conditions are met.
  const showReminder =
    !reminderDismissed &&
    shouldShowReminder(reminder, streaks.lastLogDate);

  // Fire a browser notification (best-effort) when banner first becomes visible.
  useEffect(() => {
    if (showReminder) maybeFireBrowserNotification(reminder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReminder]);

  if (loading) return <LoadingScreen label="Preparing your overview..." />;

  const firstName = user?.username?.split(" ")[0] || "there";

  return (
    <div className="max-w-6xl mx-auto">
      <OnboardingTour />

      <PageHeader
        title={`Good to see you, ${firstName}.`}
        subtitle="A gentle snapshot of your wellbeing this week."
      />

      {showReminder && (
        <ReminderBanner
          time={reminder.time}
          onDismiss={() => setReminderDismissed(true)}
        />
      )}

      {/* Today hero — quick logger or today's mood */}
      <TodayHero
        moods={moods}
        streak={streaks.current}
        onMoodLogged={(newMood) => setMoods((prev) => [newMood, ...prev])}
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StreakTile current={streaks.current} longest={streaks.longest} />
        <StatTile
          icon={Heart}
          label="Moods logged"
          value={stats.totalMoods}
          accent="primary"
          to="/mood"
        />
        <StatTile
          icon={BookOpen}
          label="Journal entries"
          value={stats.totalJournals}
          accent="accent"
          to="/journal"
        />
        <StatTile
          icon={Activity}
          label="Avg. mood (7d)"
          value={stats.avgScore}
          suffix="/ 5"
          accent="accent"
          to="/insights"
        />
      </div>

      {/* Two-up: recent moods + (time machine over quick links) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-lg mb-4">
            Recent mood check-ins
          </h3>
          {moods.length === 0 ? (
            <p className="text-sm text-surface-500">
              No moods logged yet. Start by logging how you feel today.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {moods.slice(0, 5).map((m) => (
                <li
                  key={m.mood_id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {MOOD_EMOJI[m.mood_type] || "🙂"}
                    </span>
                    <div>
                      <div className="capitalize font-medium">{m.mood_type}</div>
                      {m.note && (
                        <div className="text-xs text-surface-500 line-clamp-1">
                          {m.note}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-surface-500">
                    {new Date(m.mood_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/mood"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline"
          >
            Go to mood tracker <ArrowRight size={14} />
          </Link>
        </div>

        <div className="space-y-5">
          <TimeMachineCard item={timeMachine} />

          <div className="card p-6">
            <h3 className="font-display font-semibold text-lg mb-4">
              Quick actions
            </h3>
            <ul className="space-y-2.5">
              <QuickLink to="/breathing" icon={Wind} label="Start breathing" desc="1–5 minute guided session" />
              <QuickLink to="/journal" icon={BookOpen} label="Write a journal entry" desc="Let your thoughts land" />
              <QuickLink to="/mood" icon={Heart} label="Log your mood" desc="A quick check-in" />
              <QuickLink to="/insights" icon={Activity} label="See your insights" desc="Trends and patterns" />
            </ul>
          </div>
        </div>
      </div>

      {/* Reminder card (the big motivational one — different from the daily nudge banner) */}
      <div className="mt-8 rounded-3xl bg-gradient-to-r from-primary-600 to-accent-600 text-white p-8 shadow-lifted">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-display font-bold">Need a gentle reset?</h3>
            <p className="opacity-90 mt-1">Take a few minutes to breathe. Your mind will thank you.</p>
          </div>
          <Link
            to="/breathing"
            className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-5 py-3 rounded-xl hover:bg-primary-50 transition"
          >
            Start a session <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

const QUICK_MOODS = [
  { key: "happy",    label: "Happy",    emoji: "😊" },
  { key: "neutral",  label: "Neutral",  emoji: "😐" },
  { key: "sad",      label: "Sad",      emoji: "😔" },
  { key: "anxious",  label: "Anxious",  emoji: "😟" },
  { key: "stressed", label: "Stressed", emoji: "😣" },
];

function todayLocalKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Hero card at the top of the dashboard.
// Two states:
//   - User hasn't logged today → 5-emoji quick logger (one-tap save).
//   - User has already logged today → celebration with today's mood + streak.
function TodayHero({ moods, streak, onMoodLogged }) {
  const [saving, setSaving] = useState(false);

  // Find today's most recent mood, if any.
  const today = todayLocalKey();
  const todayMood = moods.find((m) => {
    const d = new Date(m.mood_date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return k === today;
  });

  const quickLog = async (mood_type) => {
    if (saving) return;
    try {
      setSaving(true);
      const res = await api.post("/moods", { mood_type });
      const created = res.data?.mood || {
        // The backend sometimes returns the row inline, sometimes wrapped.
        // Build a fallback so the UI updates even if the shape varies.
        mood_id: Date.now(),
        mood_type,
        mood_date: new Date().toISOString(),
      };
      toast.success("Logged.");
      onMoodLogged(created);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save your mood.");
    } finally {
      setSaving(false);
    }
  };

  if (todayMood) {
    const meta = QUICK_MOODS.find((m) => m.key === todayMood.mood_type);
    return (
      <div className="rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 text-white p-6 sm:p-7 shadow-lifted mb-6">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div className="text-6xl sm:text-7xl leading-none" aria-hidden>
            {meta?.emoji || "🙂"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-[0.2em] opacity-80">Today</div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl leading-tight">
              You're feeling{" "}
              <span className="capitalize">{todayMood.mood_type}</span>
            </h2>
            <div className="mt-2 flex items-center gap-3 text-sm opacity-90">
              {streak > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Flame size={14} /> {streak}-day streak
                </span>
              )}
              <Link
                to="/mood"
                className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                See history <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-2 mb-3 text-primary-700 dark:text-primary-300">
        <Heart size={16} />
        <h3 className="font-display font-semibold">How are you right now?</h3>
      </div>
      <p className="text-sm text-surface-500 mb-4">
        One tap. Takes a second. Builds the picture over time.
      </p>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {QUICK_MOODS.map((m) => (
          <button
            key={m.key}
            onClick={() => quickLog(m.key)}
            disabled={saving}
            className="flex flex-col items-center gap-1 p-3 sm:p-4 rounded-xl border border-surface-200 bg-white hover:bg-primary-50 hover:border-primary-300 dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-primary-900/30 dark:hover:border-primary-700 transition disabled:opacity-50"
            aria-label={`Log ${m.label}`}
          >
            <span className="text-2xl sm:text-3xl" aria-hidden>{m.emoji}</span>
            <span className="text-xs font-medium text-surface-700 dark:text-surface-200">
              {m.label}
            </span>
          </button>
        ))}
      </div>
      <Link
        to="/mood"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline"
      >
        Add a note or lifestyle details <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function ReminderBanner({ time, onDismiss }) {
  return (
    <div className="mb-5 card p-4 border-primary-200 dark:border-primary-900/50 bg-primary-50/60 dark:bg-primary-900/20 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 flex items-center justify-center shrink-0">
        <Bell size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold">Time for your check-in</div>
        <p className="text-sm text-surface-600 dark:text-surface-300 mt-0.5">
          You set a reminder for {time}. Take a moment to log how you're feeling.
        </p>
        <Link
          to="/mood"
          className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-primary-700 dark:text-primary-300 hover:underline"
        >
          Log my mood <ArrowRight size={14} />
        </Link>
      </div>
      <button onClick={onDismiss} className="btn-ghost p-1.5" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

function StreakTile({ current, longest }) {
  const isAlive = current > 0;
  return (
    <Link to="/mood" className="card card-hover p-5 block">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
          isAlive
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
        }`}
      >
        <Flame size={18} />
      </div>
      <div className="text-xs uppercase tracking-wider text-surface-500">Current streak</div>
      <div className="mt-1 text-2xl font-display font-bold text-surface-900 dark:text-surface-50">
        {current}
        <span className="text-sm text-surface-500 ml-1">{current === 1 ? "day" : "days"}</span>
      </div>
      <div className="text-[11px] text-surface-500 mt-2">
        {longest > 0 ? `Longest: ${longest} ${longest === 1 ? "day" : "days"}` : "Log moods to start a streak"}
      </div>
    </Link>
  );
}

function TimeMachineCard({ item }) {
  if (!item) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2 text-primary-700 dark:text-primary-300">
          <Clock3 size={16} />
          <h3 className="font-display font-semibold">Time machine</h3>
        </div>
        <p className="text-xs text-surface-500">
          Once you've used MindMate for a week or two, this card will show what you wrote
          on this day in past weeks, months, or years.
        </p>
      </div>
    );
  }

  const date = new Date(item.date);
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1 text-primary-700 dark:text-primary-300">
        <Clock3 size={16} />
        <h3 className="font-display font-semibold">{item.label}</h3>
      </div>
      <div className="text-xs text-surface-500 mb-3">{dateLabel}</div>

      {item.kind === "journal" ? (
        <Link to="/journal" className="block group">
          <div className="text-sm font-semibold group-hover:text-primary-700 dark:group-hover:text-primary-300 transition">
            {item.title || "(untitled)"}
          </div>
          <p className="text-sm text-surface-600 dark:text-surface-300 mt-1 line-clamp-3">
            {item.preview}
          </p>
        </Link>
      ) : (
        <Link to="/mood" className="flex items-center gap-3 group">
          <span className="text-3xl">{MOOD_EMOJI[item.mood_type] || "🙂"}</span>
          <div>
            <div className="capitalize font-semibold group-hover:text-primary-700 dark:group-hover:text-primary-300 transition">
              You felt {item.mood_type}
            </div>
            {item.note && (
              <p className="text-xs text-surface-500 line-clamp-2 mt-0.5">{item.note}</p>
            )}
          </div>
        </Link>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, suffix, accent, to }) {
  const color =
    accent === "accent"
      ? "bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
      : "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300";
  const Wrap = to ? Link : "div";
  return (
    <Wrap to={to} className="card card-hover p-5 block">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <div className="text-xs uppercase tracking-wider text-surface-500">{label}</div>
      <div className="mt-1 text-2xl font-display font-bold text-surface-900 dark:text-surface-50">
        {value}
        {suffix && <span className="text-sm text-surface-500 ml-1">{suffix}</span>}
      </div>
    </Wrap>
  );
}

function QuickLink({ to, icon: Icon, label, desc }) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/60 transition"
      >
        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 flex items-center justify-center">
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{label}</div>
          <div className="text-xs text-surface-500">{desc}</div>
        </div>
        <ArrowRight size={14} className="text-surface-400" />
      </Link>
    </li>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

// Returns { kind, label, date, ... } for the most interesting "on this day"
// item, preferring journals over moods, and the most distant time bucket
// available (year > month > week ago).
function findOnThisDay({ moods, journals }) {
  const today = new Date();
  const md = today.getMonth();
  const dd = today.getDate();

  const buckets = [
    { label: "On this day, last year", year: today.getFullYear() - 1 },
    { label: "On this day, last month", subtractMonths: 1 },
    { label: "On this day, last week", subtractDays: 7 },
  ];

  for (const bucket of buckets) {
    const target = new Date(today);
    if (bucket.year != null) target.setFullYear(bucket.year);
    if (bucket.subtractMonths != null) target.setMonth(target.getMonth() - bucket.subtractMonths);
    if (bucket.subtractDays != null) target.setDate(target.getDate() - bucket.subtractDays);

    const jHit = journals.find((j) => sameLocalDay(new Date(j.created_at), target));
    if (jHit) {
      return {
        kind: "journal",
        label: bucket.label,
        date: jHit.created_at,
        title: jHit.title,
        preview: (jHit.content || "").slice(0, 220),
      };
    }
    const mHit = moods.find((m) => sameLocalDay(new Date(m.mood_date), target));
    if (mHit) {
      return {
        kind: "mood",
        label: bucket.label,
        date: mHit.mood_date,
        mood_type: mHit.mood_type,
        note: mHit.note,
      };
    }
  }
  return null;
}

function sameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
