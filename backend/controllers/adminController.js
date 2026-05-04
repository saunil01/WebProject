const db = require("../config/Database");

// ─── Helpers ─────────────────────────────────────────────────────────

// Translate mood_type → 1-5 score. Same mapping as everywhere else.
const MOOD_SCORE_SQL = `
  CASE
    WHEN mood_type='happy'    THEN 5
    WHEN mood_type='neutral'  THEN 3
    WHEN mood_type='sad'      THEN 2
    WHEN mood_type='anxious'  THEN 2
    WHEN mood_type='stressed' THEN 1
    ELSE 0
  END
`;

function rangeDays(range) {
  if (range === "7") return 7;
  if (range === "30") return 30;
  if (range === "90") return 90;
  if (range === "all" || !range) return null;
  const n = Number(range);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function dateFilter(col, days) {
  return days ? `${col} >= (NOW() - INTERVAL ${Number(days)} DAY)` : "1=1";
}

// Resolve an admin's username from their JWT user_id. Lightweight, cached
// briefly to avoid one extra query per audit write within a single request.
async function lookupAdminUsername(adminId) {
  const [rows] = await db.query(
    "SELECT username FROM Users WHERE user_id = ? LIMIT 1",
    [adminId]
  );
  return rows[0]?.username || `admin#${adminId}`;
}

// Write a single audit log row. Never throws — auditing must not block the
// underlying admin action. Failures get logged to the server console only.
async function audit({
  req,
  actionType,
  targetUserId = null,
  targetUsername = null,
  targetResourceType = null,
  targetResourceId = null,
  details = null,
}) {
  try {
    const adminId = req.user?.user_id;
    const adminUsername = await lookupAdminUsername(adminId);
    await db.query(
      `INSERT INTO AdminAuditLog
        (admin_id, admin_username, action_type, target_user_id, target_username,
         target_resource_type, target_resource_id, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId || null,
        adminUsername,
        actionType,
        targetUserId,
        targetUsername,
        targetResourceType,
        targetResourceId,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (err) {
    console.error("[audit] failed to write entry:", err?.message || err);
  }
}

// ─── Controller ──────────────────────────────────────────────────────

const adminController = {
  // ─── User moderation ────────────────────────────────────────────
  getAllUsers: async (_req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT
            u.user_id, u.username, u.email, u.role, u.avatar,
            u.created_at, u.last_login,
            (SELECT COUNT(*) FROM MoodEntries m WHERE m.user_id = u.user_id) AS mood_count,
            (SELECT COUNT(*) FROM JournalEntries j WHERE j.user_id = u.user_id) AS journal_count
         FROM Users u
         ORDER BY u.created_at DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error("getAllUsers error:", err);
      res.status(500).json({ message: "Error fetching users" });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const targetId = req.params.id;
      // Look up first so we can audit with the username for context.
      const [rows] = await db.query(
        "SELECT user_id, username FROM Users WHERE user_id = ? LIMIT 1",
        [targetId]
      );
      const target = rows[0];
      if (!target) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't let an admin delete themselves through this endpoint — they
      // should use the regular account-delete flow.
      if (Number(target.user_id) === Number(req.user.user_id)) {
        return res
          .status(400)
          .json({ message: "Use Profile → Delete account to delete your own account." });
      }

      await db.query("DELETE FROM Users WHERE user_id = ?", [targetId]);

      await audit({
        req,
        actionType: "delete_user",
        targetUserId: target.user_id,
        targetUsername: target.username,
        targetResourceType: "user",
        targetResourceId: target.user_id,
      });

      res.json({ message: "User deleted" });
    } catch (err) {
      console.error("deleteUser error:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  },

  // ─── Mood entries (PRIVACY-REDACTED) ────────────────────────────
  // Admins see metadata only — NEVER the user's optional note or
  // lifestyle fields (sleep / exercise / caffeine). Mood TYPE is fine
  // because it's already a coarse label, not personal content.
  getAllMoods: async (_req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          m.mood_id,
          m.user_id,
          u.username,
          m.mood_type,
          m.mood_date,
          (m.note IS NOT NULL AND m.note <> '') AS has_note,
          (m.sleep_hours IS NOT NULL OR m.exercised IS NOT NULL OR m.caffeine_cups IS NOT NULL) AS has_lifestyle
        FROM MoodEntries m
        LEFT JOIN Users u ON u.user_id = m.user_id
        ORDER BY m.mood_date DESC
        LIMIT 500
      `);
      res.json(rows);
    } catch (err) {
      console.error("getAllMoods error:", err);
      res.status(500).json({ message: "Error fetching moods" });
    }
  },

  deleteMood: async (req, res) => {
    try {
      const moodId = req.params.id;
      const [rows] = await db.query(
        `SELECT m.mood_id, m.user_id, u.username
           FROM MoodEntries m
           LEFT JOIN Users u ON u.user_id = m.user_id
          WHERE m.mood_id = ? LIMIT 1`,
        [moodId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "Mood entry not found" });
      }
      const target = rows[0];

      await db.query("DELETE FROM MoodEntries WHERE mood_id = ?", [moodId]);

      await audit({
        req,
        actionType: "delete_mood",
        targetUserId: target.user_id,
        targetUsername: target.username,
        targetResourceType: "mood",
        targetResourceId: target.mood_id,
      });

      res.json({ message: "Mood deleted" });
    } catch (err) {
      console.error("deleteMood error:", err);
      res.status(500).json({ message: "Failed to delete mood" });
    }
  },

  // ─── Journal entries (PRIVACY-REDACTED) ─────────────────────────
  // Admins see metadata only — never title or content. Word count and
  // size category give just enough signal to spot abuse (a 15,000-word
  // entry might be spam) without exposing what the user wrote.
  getAllJournals: async (_req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          j.journal_id,
          j.user_id,
          u.username,
          j.created_at,
          CHAR_LENGTH(COALESCE(j.content, '')) AS char_count,
          (CHAR_LENGTH(COALESCE(j.content, '')) - CHAR_LENGTH(REPLACE(COALESCE(j.content, ''), ' ', '')) + 1) AS word_count
        FROM JournalEntries j
        LEFT JOIN Users u ON u.user_id = j.user_id
        ORDER BY j.created_at DESC
        LIMIT 500
      `);
      res.json(rows);
    } catch (err) {
      console.error("getAllJournals error:", err);
      res.status(500).json({ message: "Error fetching journals" });
    }
  },

  deleteJournal: async (req, res) => {
    try {
      const journalId = req.params.id;
      const [rows] = await db.query(
        `SELECT j.journal_id, j.user_id, u.username
           FROM JournalEntries j
           LEFT JOIN Users u ON u.user_id = j.user_id
          WHERE j.journal_id = ? LIMIT 1`,
        [journalId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "Journal not found" });
      }
      const target = rows[0];

      await db.query("DELETE FROM JournalEntries WHERE journal_id = ?", [journalId]);

      await audit({
        req,
        actionType: "delete_journal",
        targetUserId: target.user_id,
        targetUsername: target.username,
        targetResourceType: "journal",
        targetResourceId: target.journal_id,
      });

      res.json({ message: "Journal deleted" });
    } catch (err) {
      console.error("deleteJournal error:", err);
      res.status(500).json({ message: "Failed to delete journal" });
    }
  },

  // ─── Analytics (already aggregate-only, fine to keep as-is) ─────
  getAnalytics: async (req, res) => {
    try {
      const days = rangeDays(req.query.range);

      const [[userCount]] = await db.query("SELECT COUNT(*) AS totalUsers FROM Users");
      const [[journalCount]] = await db.query("SELECT COUNT(*) AS totalJournals FROM JournalEntries");
      const [[moodCount]] = await db.query("SELECT COUNT(*) AS totalMoods FROM MoodEntries");

      const [[avgMood]] = await db.query(`
        SELECT ROUND(AVG(${MOOD_SCORE_SQL}), 2) AS avg
        FROM MoodEntries
        WHERE ${dateFilter("mood_date", days)}
      `);

      const [[todayMood]] = await db.query(`
        SELECT ROUND(AVG(${MOOD_SCORE_SQL}), 2) AS avg
        FROM MoodEntries
        WHERE DATE(mood_date) = CURDATE()
      `);

      const [[activeToday]] = await db.query(`
        SELECT COUNT(DISTINCT user_id) AS active
        FROM (
          SELECT user_id FROM MoodEntries WHERE DATE(mood_date)=CURDATE()
          UNION
          SELECT user_id FROM JournalEntries WHERE DATE(created_at)=CURDATE()
        ) t
      `);

      const trendDays = days || 14;
      const [trendData] = await db.query(`
        SELECT
          DATE(mood_date) AS date,
          ROUND(AVG(${MOOD_SCORE_SQL}), 2) AS avg_score,
          COUNT(*) AS entries
        FROM MoodEntries
        WHERE mood_date >= (NOW() - INTERVAL ${Number(trendDays)} DAY)
        GROUP BY DATE(mood_date)
        ORDER BY DATE(mood_date)
      `);

      const [distRows] = await db.query(`
        SELECT mood_type, COUNT(*) AS count
        FROM MoodEntries
        WHERE ${dateFilter("mood_date", days)}
        GROUP BY mood_type
      `);
      const moodDistribution = { happy: 0, neutral: 0, sad: 0, anxious: 0, stressed: 0 };
      for (const r of distRows) moodDistribution[r.mood_type] = Number(r.count);

      const sparkSql = (table, col) => `
        SELECT DATE(${col}) AS date, COUNT(*) AS count
        FROM ${table}
        WHERE ${col} >= (NOW() - INTERVAL 7 DAY)
        GROUP BY DATE(${col})
        ORDER BY DATE(${col})
      `;
      const [usersSpark] = await db.query(sparkSql("Users", "created_at"));
      const [journalsSpark] = await db.query(sparkSql("JournalEntries", "created_at"));
      const [moodsSpark] = await db.query(sparkSql("MoodEntries", "mood_date"));

      const [inactiveUsers] = await db.query(`
        SELECT user_id, username, email, avatar, DATEDIFF(NOW(), last_login) AS days_inactive
        FROM Users
        WHERE last_login IS NOT NULL AND DATEDIFF(NOW(), last_login) > 7
        ORDER BY days_inactive DESC
        LIMIT 20
      `);

      res.json({
        users: userCount.totalUsers,
        journals: journalCount.totalJournals,
        moods: moodCount.totalMoods,
        averageMood: avgMood.avg || 0,
        todayMoodAverage: todayMood.avg || 0,
        activeToday: activeToday.active || 0,
        trend: trendData,
        moodDistribution,
        sparklines: {
          users: usersSpark,
          journals: journalsSpark,
          moods: moodsSpark,
        },
        inactiveUsers,
      });
    } catch (err) {
      console.error("Error fetching analytics:", err);
      res.status(500).json({ message: "Error fetching analytics" });
    }
  },

  // ─── Activity feed (REDACTED) ───────────────────────────────────
  // Note titles and previews are intentionally absent — admins know an
  // entry was created, but never what was written.
  getActivity: async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 15, 50);

      const [signups] = await db.query(
        `SELECT user_id, username, email, avatar, created_at
           FROM Users ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );
      const [moods] = await db.query(
        `SELECT m.mood_id, m.mood_type, m.mood_date,
                u.user_id, u.username, u.avatar
           FROM MoodEntries m
           JOIN Users u ON u.user_id = m.user_id
           ORDER BY m.mood_date DESC LIMIT ?`,
        [limit]
      );
      const [journals] = await db.query(
        `SELECT j.journal_id, j.created_at,
                u.user_id, u.username, u.avatar
           FROM JournalEntries j
           JOIN Users u ON u.user_id = j.user_id
           ORDER BY j.created_at DESC LIMIT ?`,
        [limit]
      );

      const items = [
        ...signups.map((s) => ({
          type: "signup",
          at: s.created_at,
          user: { user_id: s.user_id, username: s.username, email: s.email, avatar: s.avatar },
        })),
        ...moods.map((m) => ({
          type: "mood",
          at: m.mood_date,
          mood_id: m.mood_id,
          mood_type: m.mood_type,
          user: { user_id: m.user_id, username: m.username, avatar: m.avatar },
        })),
        ...journals.map((j) => ({
          type: "journal",
          at: j.created_at,
          journal_id: j.journal_id,
          user: { user_id: j.user_id, username: j.username, avatar: j.avatar },
        })),
      ];

      items.sort((a, b) => new Date(b.at) - new Date(a.at));
      res.json(items.slice(0, limit));
    } catch (err) {
      console.error("getActivity error:", err);
      res.status(500).json({ message: "Failed to load activity" });
    }
  },

  // ─── Wellbeing watchlist (already aggregate, no content exposed) ─
  getNeedsCare: async (req, res) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 14, 3), 60);
      const [rows] = await db.query(`
        SELECT
          u.user_id,
          u.username,
          u.email,
          u.avatar,
          COUNT(m.mood_id) AS recent_count,
          SUM(CASE WHEN m.mood_type IN ('sad','anxious','stressed') THEN 1 ELSE 0 END) AS negative_count,
          MAX(m.mood_date) AS last_mood_at,
          (
            SELECT mood_type FROM MoodEntries
             WHERE user_id = u.user_id
             ORDER BY mood_date DESC LIMIT 1
          ) AS last_mood_type
        FROM Users u
        JOIN MoodEntries m
          ON m.user_id = u.user_id
         AND m.mood_date >= (NOW() - INTERVAL ${Number(days)} DAY)
        WHERE u.role <> 'admin'
        GROUP BY u.user_id
        HAVING recent_count >= 3
           AND (negative_count / recent_count) >= 0.6
        ORDER BY (negative_count / recent_count) DESC, recent_count DESC
        LIMIT 20
      `);

      res.json(
        rows.map((r) => ({
          ...r,
          recent_count: Number(r.recent_count),
          negative_count: Number(r.negative_count),
          negative_ratio: Number(r.negative_count) / Number(r.recent_count),
        }))
      );
    } catch (err) {
      console.error("getNeedsCare error:", err);
      res.status(500).json({ message: "Failed to load wellbeing watchlist" });
    }
  },

  // ─── Audit log ──────────────────────────────────────────────────
  getAuditLog: async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const [rows] = await db.query(
        `SELECT log_id, admin_id, admin_username, action_type,
                target_user_id, target_username, target_resource_type,
                target_resource_id, details, created_at
           FROM AdminAuditLog
          ORDER BY created_at DESC
          LIMIT ?`,
        [limit]
      );
      res.json(rows);
    } catch (err) {
      console.error("getAuditLog error:", err);
      res.status(500).json({ message: "Failed to load audit log" });
    }
  },
};

module.exports = adminController;
