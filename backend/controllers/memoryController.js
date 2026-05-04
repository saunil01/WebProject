const db = require("../config/Database");

// Builds a list of "on this day" target dates relative to today.
// We probe a handful of distances (1w, 1m, 3m, 6m, 1y, 2y, 3y) so the
// memories page has variety even for new-ish users.
function buildTargets(now = new Date()) {
  const targets = [];
  const push = (label, d) => targets.push({ label, date: ymd(d) });

  const minus = (parts) => {
    const d = new Date(now);
    if (parts.days) d.setDate(d.getDate() - parts.days);
    if (parts.months) d.setMonth(d.getMonth() - parts.months);
    if (parts.years) d.setFullYear(d.getFullYear() - parts.years);
    return d;
  };

  push("A week ago",      minus({ days: 7 }));
  push("A month ago",     minus({ months: 1 }));
  push("3 months ago",    minus({ months: 3 }));
  push("6 months ago",    minus({ months: 6 }));
  push("A year ago",      minus({ years: 1 }));
  push("2 years ago",     minus({ years: 2 }));
  push("3 years ago",     minus({ years: 3 }));
  return targets;
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const memoryController = {
  // GET /api/memories
  // Returns one bucket per past time-window, each with { moods, journals,
  // breathing } that happened on that specific date. Empty buckets are
  // omitted so the UI doesn't render "nothing here" cards.
  list: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const targets = buildTargets();

      // Run all the lookups in parallel for speed.
      const buckets = await Promise.all(
        targets.map(async (t) => {
          const [moods] = await db.query(
            `SELECT mood_id, mood_type, mood_date, note, emoji
               FROM MoodEntries
              WHERE user_id = ? AND DATE(mood_date) = ?
              ORDER BY mood_date ASC`,
            [userId, t.date]
          );
          const [journals] = await db.query(
            `SELECT journal_id, title, content, created_at
               FROM JournalEntries
              WHERE user_id = ? AND DATE(created_at) = ?
              ORDER BY created_at ASC`,
            [userId, t.date]
          );
          const [breathing] = await db.query(
            `SELECT session_id, duration, actual_duration, status, session_date
               FROM BreathingSessions
              WHERE user_id = ? AND DATE(session_date) = ?
              ORDER BY session_date ASC`,
            [userId, t.date]
          );
          return {
            label: t.label,
            date: t.date,
            moods,
            journals,
            breathing,
            empty: moods.length + journals.length + breathing.length === 0,
          };
        })
      );

      // Drop empties — there's no point rendering a "3 years ago: nothing
      // happened" card. (For a brand-new user, the response will be empty
      // and the frontend shows a friendly empty state.)
      const populated = buckets.filter((b) => !b.empty);

      res.json({
        today: ymd(new Date()),
        buckets: populated,
      });
    } catch (err) {
      console.error("Memories error:", err);
      res.status(500).json({ message: "Failed to load memories." });
    }
  },
};

module.exports = memoryController;
