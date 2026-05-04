const db = require("../config/Database");

module.exports = {
  createUser: async (username, email, passwordHash, role = "user") => {
    return db.query(
      "INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [username, email, passwordHash, role]
    );
  },

  getByEmail: async (email) => {
    return db.query("SELECT * FROM Users WHERE email = ? LIMIT 1", [email]);
  },

  getById: async (id) => {
    return db.query("SELECT * FROM Users WHERE user_id = ? LIMIT 1", [id]);
  },

  updateUser: async (id, updates) => {
    const fields = Object.keys(updates)
      .map((field) => `${field} = ?`)
      .join(", ");

    const values = Object.values(updates);
    values.push(id);

    return db.query(`UPDATE Users SET ${fields} WHERE user_id = ?`, values);
  },

  deleteUser: async (id) => {
    return db.query("DELETE FROM Users WHERE user_id = ?", [id]);
  },
};