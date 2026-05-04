const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../Middleware/auth");
const role = require("../Middleware/role");
const { validate } = require("../Middleware/validate");
const schemas = require("../validation/schemas");
const adminController = require("../controllers/adminController");

const requireAdmin = [authenticateToken, role("admin")];

// Only admins can access these
router.get("/users", ...requireAdmin, adminController.getAllUsers);
router.delete("/user/:id", ...requireAdmin, validate(schemas.idParam, "params"), adminController.deleteUser);

router.get("/moods", ...requireAdmin, adminController.getAllMoods);
router.delete("/mood/:id", ...requireAdmin, validate(schemas.idParam, "params"), adminController.deleteMood);

router.get("/journals", ...requireAdmin, adminController.getAllJournals);
router.delete("/journal/:id", ...requireAdmin, validate(schemas.idParam, "params"), adminController.deleteJournal);

router.get("/analytics", ...requireAdmin, adminController.getAnalytics);
router.get("/activity", ...requireAdmin, adminController.getActivity);
router.get("/needs-care", ...requireAdmin, adminController.getNeedsCare);
router.get("/audit-log", ...requireAdmin, adminController.getAuditLog);

module.exports = router;
