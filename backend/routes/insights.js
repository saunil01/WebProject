const express = require("express");
const router = express.Router();
const insightController = require("../controllers/insightController");
const { authenticateToken } = require("../Middleware/auth");
const { validate } = require("../Middleware/validate");
const schemas = require("../validation/schemas");

router.get("/", authenticateToken, insightController.getAllInsights);
router.get("/correlations", authenticateToken, insightController.getCorrelations);

router.post(
  "/",
  authenticateToken,
  validate(schemas.insightCreate),
  insightController.createInsight
);

router.delete(
  "/:id",
  authenticateToken,
  validate(schemas.idParam, "params"),
  insightController.deleteInsight
);

module.exports = router;
