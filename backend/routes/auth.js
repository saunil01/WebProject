const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../Middleware/auth");
const { uploadAvatar } = require("../Middleware/upload");
const { validate } = require("../Middleware/validate");
const schemas = require("../validation/schemas");

// Public routes
router.post("/register", validate(schemas.register), authController.register);
router.post("/login", validate(schemas.login), authController.login);
router.post("/forgot-password", validate(schemas.forgotPassword), authController.forgotPassword);
router.post("/reset-password/:token", validate(schemas.resetPassword), authController.resetPassword);

// Protected routes
router.get("/profile", authenticateToken, authController.getProfile);
router.put("/update", authenticateToken, validate(schemas.updateProfile), authController.updateUser);
router.delete("/delete", authenticateToken, authController.deleteUser);

// Avatar upload — multer must run AFTER auth so req.user.user_id is set
router.post(
  "/avatar",
  authenticateToken,
  (req, res, next) => {
    uploadAvatar(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  authController.uploadAvatar
);
router.delete("/avatar", authenticateToken, authController.removeAvatar);

module.exports = router;
