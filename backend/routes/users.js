// Thin routing layer — delegates to userController so the SQL lives in one
// place. Previously this file had its own inline queries that shadowed the
// controller (notably WHERE u.role='user', which silently excluded admins
// from the Connect / Find People list).

const express = require("express");
const router = express.Router();
const db = require("../config/Database");
const { authenticateToken } = require("../Middleware/auth");
const userController = require("../controllers/userController");

// Public list — every user (admins included) with their public mood stats.
router.get("/public", authenticateToken, userController.getPublicProfiles);

// Single public profile by id.
router.get("/profile/:id", authenticateToken, userController.getUserProfileById);

// Self profile (a thin alternative to /api/auth/profile).
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT user_id, username, email, role, gender, dob, about_me,
              avatar, theme, created_at, last_login
       FROM Users
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.user_id]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("/users/me error:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

module.exports = router;
