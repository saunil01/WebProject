const db = require("../config/Database");

// Schema: journal_id, user_id, mood_id, entry_date, title, content, created_at
const JournalEntry = {
  findAllByUser: async (userId) => {
    const [rows] = await db.query(
      "SELECT * FROM JournalEntries WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.query(
      "SELECT * FROM JournalEntries WHERE journal_id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  create: async ({ user_id, mood_id = null, title, content }) => {
    const [result] = await db.query(
      "INSERT INTO JournalEntries (user_id, mood_id, title, content) VALUES (?, ?, ?, ?)",
      [user_id, mood_id, title, content]
    );
    return JournalEntry.findById(result.insertId);
  },

  update: async (id, updates) => {
    const allowed = ["title", "content", "mood_id", "entry_date"];
    const keys = Object.keys(updates).filter((k) => allowed.includes(k));
    if (keys.length === 0) return JournalEntry.findById(id);

    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => updates[k]);
    values.push(id);

    await db.query(
      `UPDATE JournalEntries SET ${setClause} WHERE journal_id = ?`,
      values
    );
    return JournalEntry.findById(id);
  },

  delete: async (id) => {
    const [result] = await db.query(
      "DELETE FROM JournalEntries WHERE journal_id = ?",
      [id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = JournalEntry;
