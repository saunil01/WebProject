import { useContext, useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line, Radar } from "react-chartjs-2";
import toast from "react-hot-toast";
import {
  Activity,
  BookOpen,
  CalendarDays,
  Coffee,
  Download,
  Dumbbell,
  Heart,
  Moon,
  NotebookPen,
  Sparkles,
  Trash2,
} from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { AuthContext } from "../context/AuthContext";
import { exportWellnessPDF } from "../utils/pdfExport";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale
);

const MOOD_SCORE = { happy: 5, neutral: 3, sad: 2, anxious: 2, stressed: 1 };
const MOOD_COLORS = {
  happy: "#10b981",
  neutral: "#94a3b8",
  sad: "#6366f1",
  anxious: "#f59e0b",
  stressed: "#e11d48",
};

export default function Insights() {
  const { user } = useContext(AuthContext);
  const [insights, setInsights] = useState([]);
  const [moods, setMoods] = useState([]);
  const [journals, setJournals] = useState([]);
  const [correlations, setCorrelations] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [i, m, c, j] = await Promise.all([
        api.get("/insights").catch(() => ({ data: [] })),
        api.get("/moods").catch(() => ({ data: [] })),
        api.get("/insights/correlations").catch(() => ({ data: null })),
        api.get("/journals").catch(() => ({ data: [] })),
      ]);
      setInsights(i.data || []);
      setMoods(m.data || []);
      setCorrelations(c.data || null);
      setJournals(j.data || []);
    } catch {
      toast.error("Could not load insights.");
    }
  };

  const filteredMoods = useMemo(() => {
    if (!startDate || !endDate) return moods;
    const s = new Date(startDate);
    const e = new Date(endDate);
    return moods.filter((m) => {
      const d = new Date(m.mood_date);
      return d >= s && d <= e;
    });
  }, [moods, startDate, endDate]);

  const filteredInsights = useMemo(() => {
    if (!startDate || !endDate) return insights;
    const s = new Date(startDate);
    const e = new Date(endDate);
    return insights.filter((i) => {
      const d = new Date(i.week_start);
      return d >= s && d <= e;
    });
  }, [insights, startDate, endDate]);

  const filteredJournals = useMemo(() => {
    if (!startDate || !endDate) return journals;
    const s = new Date(startDate);
    const e = new Date(endDate);
    return journals.filter((j) => {
      const d = new Date(j.created_at);
      return d >= s && d <= e;
    });
  }, [journals, startDate, endDate]);

  const handleExportPDF = async () => {
    if (filteredMoods.length === 0 && filteredJournals.length === 0 && filteredInsights.length === 0) {
      return toast.error("Nothing to export in this date range.");
    }
    try {
      setExporting(true);
      exportWellnessPDF({
        user,
        moods: filteredMoods,
        journals: filteredJournals,
        reflections: filteredInsights,
        correlations,
        startDate,
        endDate,
      });
      toast.success("Report downloaded.");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Could not generate the PDF.");
    } finally {
      setExporting(false);
    }
  };

  const moodCounts = useMemo(() => {
    return filteredMoods.reduce((acc, m) => {
      acc[m.mood_type] = (acc[m.mood_type] || 0) + 1;
      return acc;
    }, {});
  }, [filteredMoods]);

  const dailyScores = useMemo(() => {
    const grouped = {};
    filteredMoods.forEach((m) => {
      const d = new Date(m.mood_date).toLocaleDateString("en-US");
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(MOOD_SCORE[m.mood_type] || 0);
    });
    return Object.entries(grouped)
      .map(([date, scores]) => ({
        date,
        avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredMoods]);

  const labels = Object.keys(moodCounts);
  const counts = Object.values(moodCounts);

  const barData = {
    labels,
    datasets: [
      {
        label: "Moods",
        data: counts,
        backgroundColor: labels.map((k) => MOOD_COLORS[k] || "#6366f1"),
        borderRadius: 8,
        barThickness: 22,
      },
    ],
  };

  const pieData = {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: labels.map((k) => MOOD_COLORS[k] || "#6366f1"),
        borderWidth: 0,
      },
    ],
  };

  const lineData = {
    labels: dailyScores.map((d) => d.date),
    datasets: [
      {
        label: "Daily wellness score",
        data: dailyScores.map((d) => Number(d.avg)),
        borderColor: "#1aa88c",
        backgroundColor: "rgba(26,168,140,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: "#1aa88c",
      },
    ],
  };

  const radarData = {
    labels: ["Happy", "Neutral", "Sad", "Anxious", "Stressed"],
    datasets: [
      {
        label: "Mood balance",
        data: [
          moodCounts.happy || 0,
          moodCounts.neutral || 0,
          moodCounts.sad || 0,
          moodCounts.anxious || 0,
          moodCounts.stressed || 0,
        ],
        backgroundColor: "rgba(26,168,140,0.18)",
        borderColor: "#1aa88c",
        borderWidth: 2,
        pointBackgroundColor: "#1aa88c",
        pointRadius: 3,
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  const addInsight = async (e) => {
    e?.preventDefault?.();
    if (!weekStart || !summary) return toast.error("Pick a week and write a brief summary.");
    try {
      setSaving(true);
      await api.post("/insights", { week_start: weekStart, summary });
      toast.success("Reflection saved.");
      setWeekStart("");
      setSummary("");
      loadAll();
    } catch {
      toast.error("Failed to save reflection.");
    } finally {
      setSaving(false);
    }
  };

  const deleteInsight = async (id) => {
    try {
      await api.delete(`/insights/${id}`);
      setInsights((xs) => xs.filter((x) => x.insight_id !== id));
      toast.success("Reflection removed.");
    } catch {
      toast.error("Failed to delete reflection.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Wellness insights"
        subtitle="Patterns in your moods and reflections, gently visualized."
      />

      {/* Filter + Export */}
      <div className="card p-4 mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-surface-600 dark:text-surface-300">
          Filter by range
        </span>
        <input
          type="date"
          className="input w-auto"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <span className="text-surface-400 text-sm">to</span>
        <input
          type="date"
          className="input w-auto"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        {(startDate || endDate) && (
          <button
            className="btn-ghost"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="btn-secondary"
          title="Generate a PDF summary you can share with your therapist"
        >
          <Download size={14} /> {exporting ? "Preparing..." : "Export for therapist"}
        </button>
      </div>

      {/* What affects your mood — auto-generated correlations */}
      <CorrelationsPanel data={correlations} />

      {filteredMoods.length === 0 ? (
        <div className="card p-6">
          <EmptyState
            icon={Activity}
            title="Not enough data yet"
            description="Log a few moods to unlock your personal insights."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Mood distribution</h3>
            <div className="h-64">
              <Bar data={barData} options={commonOptions} />
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Mood breakdown</h3>
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={pieData} options={commonOptions} />
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Mood balance</h3>
            <div className="h-64">
              <Radar data={radarData} options={commonOptions} />
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Wellness trend</h3>
            <div className="h-64">
              <Line
                data={lineData}
                options={{
                  ...commonOptions,
                  scales: {
                    y: { beginAtZero: true, min: 0, max: 5, grid: { color: "rgba(100,116,139,0.15)" } },
                    x: { ticks: { autoSkip: true, maxTicksLimit: 7 }, grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reflections */}
      <div className="card p-6 mt-6">
        <div className="flex items-center gap-2 mb-4 text-primary-700 dark:text-primary-300">
          <NotebookPen size={18} />
          <h3 className="font-display font-semibold text-lg">Weekly reflections</h3>
        </div>

        <form onSubmit={addInsight} className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="label">Week of</label>
            <input
              type="date"
              className="input w-44"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label className="label">Brief reflection</label>
            <input
              className="input"
              placeholder="What did this week teach you?"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Add"}
          </button>
        </form>

        {filteredInsights.length === 0 ? (
          <p className="text-sm text-surface-500">No reflections in this range.</p>
        ) : (
          <ul className="divide-y divide-surface-200 dark:divide-surface-800">
            {filteredInsights.map((i) => (
              <li key={i.insight_id} className="py-3 flex items-start justify-between gap-3 group">
                <div>
                  <div className="text-xs uppercase tracking-wider text-surface-500">
                    Week of {new Date(i.week_start).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <p className="italic text-surface-700 dark:text-surface-200 mt-1">
                    {i.summary}
                  </p>
                </div>
                <button
                  onClick={() => deleteInsight(i.insight_id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-surface-400 hover:text-danger transition"
                  aria-label="Delete reflection"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Correlations panel ────────────────────────────────────────────────
// Renders the auto-generated "what affects your mood" insights returned by
// /api/insights/correlations. Shows an empty state if there isn't enough data.

const ICON_BY_KEY = {
  sleep: Moon,
  exercise: Dumbbell,
  caffeine: Coffee,
  dayOfWeek: CalendarDays,
  journaling: BookOpen,
};

const TONE_BY_SENTIMENT = {
  positive: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  neutral: {
    badge: "bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200",
    icon: "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300",
  },
  negative: {
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    icon: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
};

function buildDiagnosticHints(d) {
  if (!d) return [];
  const hints = [];

  if (d.distinctDays < 2) {
    hints.push("Log moods on a few different days — right now everything's on one day, so day-of-week patterns can't show.");
  }
  if (d.sleep.count === 0) {
    hints.push("No sleep data yet — toggle 'Add lifestyle details' next time and enter your hours.");
  } else if (d.sleep.highCount === 0) {
    hints.push(`You've logged ${d.sleep.count} sleep entries but none with 7+ hours — try logging a well-rested day.`);
  } else if (d.sleep.lowCount === 0) {
    hints.push(`You've logged ${d.sleep.count} sleep entries but all 7+ hours — try logging a short-sleep day.`);
  }
  if (d.exercise.count === 0) {
    hints.push("No exercise data yet — toggle Yes/No when you log a mood.");
  } else if (d.exercise.yesCount === 0) {
    hints.push("Always selecting 'No' for exercise — log a few 'Yes' days to see the contrast.");
  } else if (d.exercise.noCount === 0) {
    hints.push("Always selecting 'Yes' for exercise — log a 'No' day or two to see the contrast.");
  }
  if (d.caffeine.count === 0) {
    hints.push("No caffeine data yet — log how many cups when you check in.");
  } else if (d.caffeine.lowCount === 0) {
    hints.push("All your caffeine entries are 3+ cups — log a low-caffeine day to compare.");
  } else if (d.caffeine.highCount === 0) {
    hints.push("All your caffeine entries are 1 cup or less — log a high-caffeine day to compare.");
  }
  return hints;
}

function CorrelationsPanel({ data }) {
  // Don't render anything until the request finishes — avoids a flash of
  // empty state on first load.
  if (!data) return null;

  const insights = data.insights || [];
  const total = data.totalSamples || 0;
  const diagnostics = data.diagnostics || null;
  const hints = buildDiagnosticHints(diagnostics);

  return (
    <div className="card p-6 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 flex items-center justify-center">
          <Sparkles size={16} />
        </div>
        <h3 className="font-display font-semibold text-lg">What affects your mood</h3>
      </div>
      <p className="text-xs text-surface-500 mb-5">
        Auto-detected patterns from the last 90 days — observations, not advice.
      </p>

      {/* Not enough data */}
      {total < 3 ? (
        <EmptyState
          icon={Heart}
          title="Not enough moods yet"
          description="Log a handful of moods (and optionally sleep / exercise / caffeine) and your patterns will appear here."
        />
      ) : insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-200 dark:border-surface-700 p-5 text-sm">
          <div className="text-surface-700 dark:text-surface-200 font-medium mb-3">
            We have your moods, but no patterns are clear yet.
          </div>
          {hints.length > 0 ? (
            <>
              <div className="text-xs uppercase tracking-wider text-surface-500 mb-2">
                Try this:
              </div>
              <ul className="space-y-2 text-surface-600 dark:text-surface-300">
                {hints.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary-500 mt-0.5">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-surface-600 dark:text-surface-300">
              Your data has variation, but the differences are too small to call them patterns.
              Keep logging — clearer signals usually emerge after 10+ entries.
            </p>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((card) => {
            const Icon = ICON_BY_KEY[card.key] || Sparkles;
            const tone = TONE_BY_SENTIMENT[card.sentiment] || TONE_BY_SENTIMENT.neutral;
            return (
              <li
                key={card.key}
                className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 flex items-start gap-3 bg-white dark:bg-surface-900"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone.icon}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display font-semibold text-sm">{card.headline}</h4>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${tone.badge}`}
                    >
                      {card.value > 0 ? "+" : ""}
                      {card.value}
                    </span>
                  </div>
                  <p className="text-sm text-surface-600 dark:text-surface-300 mt-1 leading-relaxed">
                    {card.detail}
                  </p>
                  <p className="text-[11px] text-surface-400 mt-2">
                    Based on {card.samples} entries
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
