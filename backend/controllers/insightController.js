const db = require("../config/Database");
const Insight = require("../models/Insight");

// Convert a mood_type string to a 1–5 numeric score.
// Same mapping the dashboard uses elsewhere.
const MOOD_SCORE = {
  happy: 5,
  neutral: 3,
  sad: 2,
  anxious: 2,
  stressed: 1,
};

// Round to 2 decimals for display.
const round2 = (n) => Math.round(n * 100) / 100;

// Average a list of numbers, ignoring null/undefined.
function mean(arr) {
  const xs = arr.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Generate a single insight card object.
function makeInsight({ key, headline, detail, value, samples, sentiment }) {
  return { key, headline, detail, value, samples, sentiment };
}

const insightController = {
  // ──── User-written reflections (existing feature) ────────────────────
  getAllInsights: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const insights = await Insight.findAllByUser(userId);
      res.json(insights || []);
    } catch (err) {
      console.error("Error fetching insights:", err);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  },

  createInsight: async (req, res) => {
    try {
      const { week_start, summary } = req.body;
      const userId = req.user.user_id;

      const newInsight = await Insight.create({
        user_id: userId,
        week_start,
        summary,
      });

      res.status(201).json({
        message: "Insight created successfully",
        insight: newInsight,
      });
    } catch (err) {
      console.error("Error creating insight:", err);
      res.status(500).json({ message: "Failed to create insight" });
    }
  },

  deleteInsight: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await Insight.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: "Insight not found" });
      }
      res.json({ message: "Insight deleted successfully" });
    } catch (err) {
      console.error("Error deleting insight:", err);
      res.status(500).json({ message: "Failed to delete insight" });
    }
  },

  // ──── NEW: lifestyle correlations ────────────────────────────────────
  // GET /api/insights/correlations
  // Returns an array of insight cards based on the user's mood + lifestyle data.
  // Each card is plain-English ("You feel ~30% better on days you sleep 7+ hours").
  // Cards with too little data are skipped.
  getCorrelations: async (req, res) => {
    try {
      const userId = req.user.user_id;

      // Pull last 90 days of moods so trends have meaning but we don't drown
      // the query in years of history.
      const [moods] = await db.query(
        `SELECT mood_id, mood_type, mood_date, sleep_hours, exercised, caffeine_cups
           FROM MoodEntries
          WHERE user_id = ?
            AND mood_date >= (NOW() - INTERVAL 90 DAY)
          ORDER BY mood_date ASC`,
        [userId]
      );

      // Also pull journals to compute the "journaling helps" comparison.
      const [journals] = await db.query(
        `SELECT DATE(created_at) AS d
           FROM JournalEntries
          WHERE user_id = ?
            AND created_at >= (NOW() - INTERVAL 90 DAY)`,
        [userId]
      );

      // Quick lookup of which dates the user journaled on.
      const journalDays = new Set(
        journals.map((r) => new Date(r.d).toISOString().slice(0, 10))
      );

      const totalSamples = moods.length;
      const insights = [];

      // Need at least a handful of moods overall for any correlation to mean anything.
      const MIN_TOTAL = 3;
      if (totalSamples < MIN_TOTAL) {
        return res.json({
          totalSamples,
          insights: [],
          diagnostics: null,
          message:
            "Log a few more moods (with optional lifestyle details) and I'll show what affects how you feel.",
        });
      }

      // Pre-compute mood scores for every entry.
      const enriched = moods.map((m) => ({
        ...m,
        score: MOOD_SCORE[m.mood_type] ?? 3,
        dateKey: new Date(m.mood_date).toISOString().slice(0, 10),
      }));

      const overall = mean(enriched.map((e) => e.score));

      // ─── Sleep ─────────────────────────────────────────────────────
      // Group: 7+ hours vs <7 hours
      const sleepGood = enriched.filter((e) => e.sleep_hours != null && e.sleep_hours >= 7);
      const sleepBad = enriched.filter((e) => e.sleep_hours != null && e.sleep_hours < 7);
      if (sleepGood.length >= 2 && sleepBad.length >= 2) {
        const goodMean = mean(sleepGood.map((e) => e.score));
        const badMean = mean(sleepBad.map((e) => e.score));
        const diff = goodMean - badMean;
        if (Math.abs(diff) >= 0.3) {
          if (diff > 0) {
            insights.push(
              makeInsight({
                key: "sleep",
                headline: "Sleep lifts your mood",
                detail: `Your average mood is ${round2(goodMean)} on nights you sleep 7+ hours, vs. ${round2(badMean)} on shorter nights.`,
                value: round2(diff),
                samples: sleepGood.length + sleepBad.length,
                sentiment: "positive",
              })
            );
          } else {
            insights.push(
              makeInsight({
                key: "sleep",
                headline: "Long sleep isn't helping",
                detail: `On 7+ hour nights your average mood is ${round2(goodMean)}, vs. ${round2(badMean)} on shorter nights — counterintuitive, but worth noticing.`,
                value: round2(diff),
                samples: sleepGood.length + sleepBad.length,
                sentiment: "neutral",
              })
            );
          }
        }
      }

      // ─── Exercise ──────────────────────────────────────────────────
      // mysql2 returns TINYINT as a number, so === 1 / === 0 checks are right.
      const exYes = enriched.filter((e) => e.exercised === 1);
      const exNo = enriched.filter((e) => e.exercised === 0);
      if (exYes.length >= 2 && exNo.length >= 2) {
        const yesMean = mean(exYes.map((e) => e.score));
        const noMean = mean(exNo.map((e) => e.score));
        const diff = yesMean - noMean;
        if (Math.abs(diff) >= 0.3) {
          insights.push(
            makeInsight({
              key: "exercise",
              headline: diff > 0 ? "Exercise lifts your mood" : "Exercise days feel heavier",
              detail:
                diff > 0
                  ? `Days you exercise average ${round2(yesMean)} mood, vs. ${round2(noMean)} on days you don't.`
                  : `Days you exercise average ${round2(yesMean)} vs. ${round2(noMean)} on rest days. Maybe you're pushing too hard, or moving on already-hard days.`,
              value: round2(diff),
              samples: exYes.length + exNo.length,
              sentiment: diff > 0 ? "positive" : "neutral",
            })
          );
        }
      }

      // ─── Caffeine ──────────────────────────────────────────────────
      const cafLow = enriched.filter((e) => e.caffeine_cups != null && e.caffeine_cups <= 1);
      const cafHigh = enriched.filter((e) => e.caffeine_cups != null && e.caffeine_cups >= 3);
      if (cafLow.length >= 2 && cafHigh.length >= 2) {
        const lowMean = mean(cafLow.map((e) => e.score));
        const highMean = mean(cafHigh.map((e) => e.score));
        const diff = highMean - lowMean;
        if (Math.abs(diff) >= 0.3) {
          insights.push(
            makeInsight({
              key: "caffeine",
              headline: diff < 0 ? "Caffeine seems to drag you down" : "More caffeine, brighter days",
              detail:
                diff < 0
                  ? `On 3+ caffeine days your average mood is ${round2(highMean)}, vs. ${round2(lowMean)} on lighter days. Could be worth dialing back.`
                  : `On 3+ caffeine days your average mood is ${round2(highMean)}, vs. ${round2(lowMean)} on lighter days.`,
              value: round2(diff),
              samples: cafLow.length + cafHigh.length,
              sentiment: diff < 0 ? "negative" : "positive",
            })
          );
        }
      }

      // ─── Day of week ───────────────────────────────────────────────
      const dayBuckets = [[], [], [], [], [], [], []]; // Sun..Sat
      for (const e of enriched) {
        dayBuckets[new Date(e.mood_date).getDay()].push(e.score);
      }
      const dayNames = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
      const dayMeans = dayBuckets.map((arr) => (arr.length >= 1 ? mean(arr) : null));
      const validDays = dayMeans
        .map((m, i) => ({ i, m, n: dayBuckets[i].length }))
        .filter((d) => d.m !== null);

      if (validDays.length >= 2) {
        const sorted = [...validDays].sort((a, b) => a.m - b.m);
        const worst = sorted[0];
        const best = sorted[sorted.length - 1];
        if (best.m - worst.m >= 0.4) {
          insights.push(
            makeInsight({
              key: "dayOfWeek",
              headline: `${dayNames[worst.i]} are your hardest day`,
              detail: `${dayNames[worst.i]} average ${round2(worst.m)}, your lowest. ${dayNames[best.i]} average ${round2(best.m)}, your brightest.`,
              value: round2(best.m - worst.m),
              samples: validDays.reduce((a, b) => a + b.n, 0),
              sentiment: "neutral",
            })
          );
        }
      }

      // ─── Journaling ────────────────────────────────────────────────
      const journaled = enriched.filter((e) => journalDays.has(e.dateKey));
      const notJournaled = enriched.filter((e) => !journalDays.has(e.dateKey));
      if (journaled.length >= 2 && notJournaled.length >= 2) {
        const jMean = mean(journaled.map((e) => e.score));
        const nMean = mean(notJournaled.map((e) => e.score));
        const diff = jMean - nMean;
        if (Math.abs(diff) >= 0.3) {
          insights.push(
            makeInsight({
              key: "journaling",
              headline: diff > 0 ? "Journaling brightens your day" : "Journaling on heavy days",
              detail:
                diff > 0
                  ? `Days you write average ${round2(jMean)} mood, vs. ${round2(nMean)} on days you don't.`
                  : `You tend to journal on harder days — ${round2(jMean)} avg vs. ${round2(nMean)} on non-journal days. That's a healthy instinct.`,
              value: round2(diff),
              samples: journaled.length + notJournaled.length,
              sentiment: "positive",
            })
          );
        }
      }

      // Diagnostics — used by the frontend to render a *specific* hint
      // when no insights fired. Tells the user what data they're missing.
      const sleepData = enriched.filter((e) => e.sleep_hours != null);
      const exData = enriched.filter((e) => e.exercised === 0 || e.exercised === 1);
      const cafData = enriched.filter((e) => e.caffeine_cups != null);
      const distinctDays = new Set(enriched.map((e) => e.dateKey)).size;

      const diagnostics = {
        totalMoods: totalSamples,
        distinctDays,
        sleep: {
          count: sleepData.length,
          highCount: sleepGood.length,
          lowCount: sleepBad.length,
        },
        exercise: {
          count: exData.length,
          yesCount: exYes.length,
          noCount: exNo.length,
        },
        caffeine: {
          count: cafData.length,
          lowCount: cafLow.length,
          highCount: cafHigh.length,
        },
        journaling: {
          journalDays: journaled.length,
          nonJournalDays: notJournaled.length,
        },
      };

      res.json({
        totalSamples,
        averageMood: overall != null ? round2(overall) : null,
        insights,
        diagnostics,
      });
    } catch (err) {
      console.error("Correlations error:", err);
      res.status(500).json({ message: "Failed to compute correlations." });
    }
  },
};

module.exports = insightController;
