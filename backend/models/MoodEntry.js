const db = require("../config/Database");

// Schema: mood_id, user_id, mood_date, mood_type, emoji, note,
//         sleep_hours, exercised, caffeine_cups, created_at
const MoodEntry = {
  findAllByUser: async (userId) => {
    const [rows] = await db.query(
      "SELECT * FROM MoodEntries WHERE user_id = ? ORDER BY mood_date DESC",
      [userId]
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.query(
      "SELECT * FROM MoodEntries WHERE mood_id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  create: async ({
    user_id,
    mood_type,
    emoji = "",
    note = "",
    mood_date,
    sleep_hours = null,
    exercised = null,
    caffeine_cups = null,
  }) => {
    const date = mood_date ? new Date(mood_date) : new Date();
    const [result] = await db.query(
      `INSERT INTO MoodEntries
        (user_id, mood_type, emoji, note, mood_date, sleep_hours, exercised, caffeine_cups)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        mood_type,
        emoji,
        note,
        date,
        sleep_hours,
        exercised === null || exercised === undefined ? null : exercised ? 1 : 0,
        caffeine_cups,
      ]
    );
    return MoodEntry.findById(result.insertId);
  },

  update: async (id, updates) => {
    const allowed = [
      "mood_type",
      "emoji",
      "note",
      "mood_date",
      "sleep_hours",
      "exercised",
      "caffeine_cups",
    ];
    const keys = Object.keys(updates).filter((k) => allowed.includes(k));
    if (keys.length === 0) return MoodEntry.findById(id);

    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => {
      if (k === "exercised") {
        const v = updates[k];
        return v === null || v === undefined ? null : v ? 1 : 0;
      }
      return updates[k];
    });
    values.push(id);

    await db.query(
      `UPDATE MoodEntries SET ${setClause} WHERE mood_id = ?`,
      values
    );
    return MoodEntry.findById(id);
  },

  delete: async (id) => {
    const [result] = await db.query(
      "DELETE FROM MoodEntries WHERE mood_id = ?",
      [id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = MoodEntry;
