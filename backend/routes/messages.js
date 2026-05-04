const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { authenticateToken } = require("../Middleware/auth");
const { validate } = require("../Middleware/validate");
const ctrl = require("../controllers/messageController");

const friendIdParam = z.object({
  friendId: z.coerce.number().int().positive("Invalid friend ID"),
});

router.get("/threads", authenticateToken, ctrl.getThreads);
router.get("/unread/counts", authenticateToken, ctrl.getUnreadCounts);
router.get(
  "/:friendId",
  authenticateToken,
  validate(friendIdParam, "params"),
  ctrl.getConversation
);

module.exports = router;
