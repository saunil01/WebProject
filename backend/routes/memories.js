const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../Middleware/auth");
const ctrl = require("../controllers/memoryController");

router.get("/", authenticateToken, ctrl.list);

module.exports = router;
