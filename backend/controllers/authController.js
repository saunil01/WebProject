const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/Database");
const User = require("../models/User");
const crypto = require("crypto");

const RESET_TOKEN_EXPIRY_MIN = 15; // 15 minutes
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// SHA-256 hex of a raw token. Used for storing tokens at rest, so leaking the
// table doesn't expose usable tokens.
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Cleans up the prior avatar — works for both local-disk and Cloudinary
// storage. Best effort; never throws (we don't want avatar bookkeeping to
// fail an upload).
async function deletePreviousAvatar(previous) {
  if (!previous) return;
  try {
    if (previous.startsWith("/uploads/avatars/")) {
      const fs = require("fs");
      const path = require("path");
      const oldFile = path.join(__dirname, "..", previous);
      fs.unlink(oldFile, () => {}); // ignore ENOENT etc.
      return;
    }
    if (/^https?:\/\/res\.cloudinary\.com\//i.test(previous)) {
      // Extract the public_id from a Cloudinary URL like:
      //   https://res.cloudinary.com/<cloud>/image/upload/v<version>/mindmate/avatars/user-7-123.png
      // Public ID = "mindmate/avatars/user-7-123" (no extension)
      const match = previous.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
      const publicId = match?.[1];
      if (publicId) {
        const { cloudinary } = require("../Middleware/upload");
        await cloudinary.uploader.destroy(publicId).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("deletePreviousAvatar best-effort failed:", e?.message || e);
  }
}

const authController = {

  register: async (req, res) => {
    try {
      // SECURITY: never honour `role` from the request body. Self-registration
      // always creates a regular user. Admin promotion is a separate operation.
      const { username, email, password } = req.body;
      const role = "user";

      // Check if user exists
      const [existingUser] = await db.query(
        "SELECT user_id FROM Users WHERE email = ? LIMIT 1",
        [email]
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Insert user
      const [result] = await db.query(
        "INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [username, email, password_hash, role]
      );

      const user_id = result.insertId;

      // Generate JWT
      const token = jwt.sign(
        { user_id, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: { user_id, username, email, role },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  },


  // Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const [rows] = await db.query("SELECT * FROM Users WHERE email = ? LIMIT 1", [email]);
      const user = rows[0];
      if (!user)
        return res.status(400).json({ message: "Invalid credentials" });

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

      // Update last login timestamp
      await db.query("UPDATE Users SET last_login = NOW() WHERE user_id = ?", [
          user.user_id,
        ]);

      // Generate JWT
      const token = jwt.sign(
        { user_id: user.user_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      res.json({
  message: "Login successful",
  token,
  user: {
    user_id: user.user_id,
    username: user.username,
    email: user.email,
    role: user.role,
    gender: user.gender,
    dob: user.dob,
    about_me: user.about_me,
    avatar: user.avatar,
    theme: user.theme,
    created_at: user.created_at,
    last_login: user.last_login
  }
});

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  },


  // Get user profile
  getProfile: async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await db.query(
      `SELECT
        user_id,
        username,
        email,
        gender,
        DATE_FORMAT(dob, "%Y-%m-%d") AS dob,
        about_me,
        avatar,
        theme,
        role,
        created_at,
        last_login
       FROM Users
       WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
},


  // Update user info
  updateUser: async (req, res) => {
  try {
    const { username, email, password, dob, gender, about_me, theme } = req.body;
    const userId = req.user.user_id;

    let query = "UPDATE Users SET ";
    const values = [];

    if (username) { query += "username = ?, "; values.push(username); }
    if (email) { query += "email = ?, "; values.push(email); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      query += "password_hash = ?, ";
      values.push(hashed);
    }
    if (dob) {
      const cleanDOB = dob.includes("T") ? dob.split("T")[0] : dob;
      query += "dob = ?, ";
      values.push(cleanDOB);
    }
    if (gender) { query += "gender = ?, "; values.push(gender); }
    if (about_me) { query += "about_me = ?, "; values.push(about_me); }
    if (theme) { query += "theme = ?, "; values.push(theme); }

    if (values.length === 0) return res.status(400).json({ message: "No fields to update" });

    query = query.slice(0, -2) + " WHERE user_id = ?";
    values.push(userId);

    await db.query(query, values);
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error during profile update" });
  }
},


  // Upload / replace avatar
  uploadAvatar: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided." });
      }
      const userId = req.user.user_id;

      const { useCloudinary, uploadBufferToCloudinary } = require("../Middleware/upload");

      let publicPath;
      if (useCloudinary) {
        // In cloud mode multer kept the file in memory; stream it to Cloudinary.
        const result = await uploadBufferToCloudinary(req.file.buffer, {
          folder: "mindmate/avatars",
          public_id: `user-${userId}-${Date.now()}`,
          resource_type: "image",
          // Resize at upload time so we never serve oversized originals.
          transformation: [
            { width: 512, height: 512, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
          ],
        });
        publicPath = result.secure_url; // full https URL
      } else {
        // Local-disk mode: multer already wrote the file. Build the public path.
        publicPath = `/uploads/avatars/${req.file.filename}`;
      }

      const [rows] = await db.query(
        "SELECT avatar FROM Users WHERE user_id = ?",
        [userId]
      );
      const previous = rows[0]?.avatar;

      await db.query("UPDATE Users SET avatar = ? WHERE user_id = ?", [
        publicPath,
        userId,
      ]);

      // Best-effort delete of the previous avatar so we don't accumulate junk.
      await deletePreviousAvatar(previous);

      res.json({ message: "Avatar updated.", avatar: publicPath });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ message: "Could not save avatar." });
    }
  },

  // Remove avatar
  removeAvatar: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const [rows] = await db.query(
        "SELECT avatar FROM Users WHERE user_id = ?",
        [userId]
      );
      const previous = rows[0]?.avatar;

      await db.query("UPDATE Users SET avatar = NULL WHERE user_id = ?", [
        userId,
      ]);
      await deletePreviousAvatar(previous);

      res.json({ message: "Avatar removed.", avatar: null });
    } catch (error) {
      console.error("Avatar remove error:", error);
      res.status(500).json({ message: "Could not remove avatar." });
    }
  },

  // DELETE /api/auth/delete
  // Permanently removes the user's account and everything connected to it.
  // Requires the current password in the request body for confirmation.
  // Cascades:
  //   - MoodEntries / JournalEntries / BreathingSessions / Insights /
  //     PasswordResets / Reflections (none right now) / Messages /
  //     FriendRequests — all have ON DELETE CASCADE on user_id, so MySQL
  //     wipes them automatically.
  //   - Cloudinary avatar — handled here as a best-effort cleanup so we
  //     don't leave orphaned images.
  deleteUser: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const { password } = req.body || {};

      if (!password || typeof password !== "string") {
        return res
          .status(400)
          .json({ message: "Password confirmation is required to delete your account." });
      }

      // Look up the user + current password hash + current avatar.
      const [rows] = await db.query(
        "SELECT password_hash, avatar FROM Users WHERE user_id = ? LIMIT 1",
        [userId]
      );
      const user = rows[0];
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Verify the password — protects against a stolen JWT being used to
      // wipe the account silently.
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(400).json({ message: "Incorrect password." });
      }

      // Best-effort: remove the avatar from Cloudinary or local disk.
      await deletePreviousAvatar(user.avatar);

      const [result] = await db.query("DELETE FROM Users WHERE user_id = ?", [userId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      res.json({ message: "Account deleted." });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Server error while deleting account." });
    }
  },

  // POST /api/auth/forgot-password
  // Always responds with the same generic message, whether or not the email
  // exists. This avoids letting attackers enumerate which emails are registered.
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required." });
      }

      const genericResponse = {
        message:
          "If an account with that email exists, a password reset link has been generated.",
      };

      const [rows] = await db.query(
        "SELECT user_id FROM Users WHERE email = ? LIMIT 1",
        [email]
      );
      const user = rows[0];

      // No user → still return success (no enumeration leak)
      if (!user) {
        // Tiny artificial delay so timing doesn't leak existence either.
        await new Promise((r) => setTimeout(r, 100));
        return res.json(genericResponse);
      }

      // Generate a token, store its hash + expiry
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);

      await db.query(
        `INSERT INTO PasswordResets (user_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [user.user_id, tokenHash, RESET_TOKEN_EXPIRY_MIN]
      );

      const resetLink = `${FRONTEND_URL}/reset-password/${rawToken}`;

      // For local development we log the link to the backend console so you
      // can copy/paste it. In a real deployment this would be sent over email
      // (Resend, Postmark, SES, etc.) — left as a future task.
      console.log(`🔐 Password reset link for ${email}: ${resetLink}`);

      // Only expose the link in the HTTP response when NOT in production —
      // useful in dev, dangerous in prod.
      const response = { ...genericResponse };
      if (process.env.NODE_ENV !== "production") {
        response.resetLink = resetLink;
      }
      res.json(response);
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Error generating reset link." });
    }
  },


  // POST /api/auth/reset-password/:token
  // Look up the hashed token, verify it's not expired/used, then update the password.
  resetPassword: async (req, res) => {
    try {
      const { token } = req.params;
      const { newPassword } = req.body || {};

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Reset token is required." });
      }
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters." });
      }

      const tokenHash = hashToken(token);
      const [rows] = await db.query(
        `SELECT pr.reset_id, pr.user_id, pr.expires_at, pr.used_at
           FROM PasswordResets pr
          WHERE pr.token_hash = ?
          LIMIT 1`,
        [tokenHash]
      );
      const tokenRow = rows[0];

      if (!tokenRow || tokenRow.used_at) {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }
      if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }

      const [userRows] = await db.query(
        "SELECT user_id, password_hash FROM Users WHERE user_id = ? LIMIT 1",
        [tokenRow.user_id]
      );
      const user = userRows[0];
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token." });
      }

      // Reject reusing the same password
      const isSame = await bcrypt.compare(newPassword, user.password_hash);
      if (isSame) {
        return res
          .status(400)
          .json({ message: "New password cannot be the same as the old one." });
      }

      const newHash = await bcrypt.hash(newPassword, 10);

      // Update password + mark token as used. Also invalidate any other live
      // tokens for this user as a defence-in-depth measure.
      await db.query("UPDATE Users SET password_hash = ? WHERE user_id = ?", [
        newHash,
        user.user_id,
      ]);
      await db.query(
        "UPDATE PasswordResets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
        [user.user_id]
      );

      res.json({ message: "Password reset successful." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Error resetting password." });
    }
  },
};

module.exports = authController;