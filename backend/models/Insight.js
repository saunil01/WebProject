const db = require("../config/Database");

// Schema: insight_id, user_id, week_start, summary, created_at
const Insight = {
  findAllByUser: async (userId) => {
    const [rows] = await db.query(
      "SELECT * FROM Insights WHERE user_id = ? ORDER BY week_start DESC",
      [userId]
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.query(
      "SELECT * FROM Insights WHERE insight_id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  create: async ({ user_id, week_start, summary }) => {
    const [result] = await db.query(
      "INSERT INTO Insights (user_id, week_start, summary) VALUES (?, ?, ?)",
      [user_id, week_start, summary]
    );
    return Insight.findById(result.insertId);
  },

  delete: async (id) => {
    const [result] = await db.query(
      "DELETE FROM Insights WHERE insight_id = ?",
      [id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Insight;
