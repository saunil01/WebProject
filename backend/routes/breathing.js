const express = require("express");
const router = express.Router();
const breathingController = require("../controllers/breathingController");
const { authenticateToken } = require("../Middleware/auth");
const { validate } = require("../Middleware/validate");
const schemas = require("../validation/schemas");

router.get("/", authenticateToken, breathingController.getAllSessions);

router.post(
  "/",
  authenticateToken,
  validate(schemas.breathingCreate),
  breathingController.createSession
);

router.delete(
  "/:id",
  authenticateToken,
  validate(schemas.idParam, "params"),
  breathingController.deleteSession
);

module.exports = router;
