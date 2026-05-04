const express = require("express");
const router = express.Router();
const journalController = require("../controllers/journalController");
const { authenticateToken } = require("../Middleware/auth");
const { validate } = require("../Middleware/validate");
const schemas = require("../validation/schemas");

router.get("/", authenticateToken, journalController.getAllJournals);

router.post(
  "/",
  authenticateToken,
  validate(schemas.journalCreate),
  journalController.createJournal
);

router.put(
  "/:id",
  authenticateToken,
  validate(schemas.idParam, "params"),
  validate(schemas.journalUpdate),
  journalController.updateJournal
);

router.delete(
  "/:id",
  authenticateToken,
  validate(schemas.idParam, "params"),
  journalController.deleteJournal
);

module.exports = router;
