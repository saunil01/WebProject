const db = require("../config/Database");

// Schema: session_id, user_id, session_date, duration, actual_duration, status, created_at
const BreathingSession = {
  findAllByUser: async (userId) => {
    const [rows] = await db.query(
      "SELECT * FROM BreathingSessions WHERE user_id = ? ORDER BY session_date DESC",
      [userId]
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.query(
      "SELECT * FROM BreathingSessions WHERE session_id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  create: async ({
    user_id,
    duration,
    actual_duration = null,
    status = "completed",
    session_date,
  }) => {
    const date = session_date ? new Date(session_date) : new Date();
    const actual = actual_duration ?? duration; // fall back to planned
    const safeStatus = status === "incomplete" ? "incomplete" : "completed";

    const [result] = await db.query(
      `INSERT INTO BreathingSessions
        (user_id, duration, actual_duration, status, session_date)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, duration, actual, safeStatus, date]
    );
    return BreathingSession.findById(result.insertId);
  },

  delete: async (id) => {
    const [result] = await db.query(
      "DELETE FROM BreathingSessions WHERE session_id = ?",
      [id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = BreathingSession;
