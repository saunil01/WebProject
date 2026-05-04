const express = require("express");
const router = express.Router();
const moodController = require("../controllers/moodController");
const { authenticateToken } = require("../Middleware/auth");
const { validate } = require("../Middleware/validate");
const schemas = require("../validation/schemas");

router.get("/", authenticateToken, moodController.getAllMoods);

router.get(
  "/:id",
  authenticateToken,
  validate(schemas.idParam, "params"),
  moodController.getMoodById
);

router.post(
  "/",
  authenticateToken,
  validate(schemas.moodCreate),
  moodController.createMood
);

router.put(
  "/:id",
  authenticateToken,
  validate(schemas.idParam, "params"),
  validate(schemas.moodUpdate),
  moodController.updateMood
);

router.delete(
  "/:id",
  authenticateToken,
  validate(schemas.idParam, "params"),
  moodController.deleteMood
);

module.exports = router;
