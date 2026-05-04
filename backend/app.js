const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const http = require("http");
const db = require("./config/Database");
const socket = require("./socket");

// ─── Boot-time safety checks ──────────────────────────────────────────────
// Refuse to start if critical secrets are missing. Better to fail loudly than
// silently default to insecure values (e.g., a JWT signed with `undefined`).
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error(
    "❌ FATAL: JWT_SECRET is missing or too short (need 16+ chars). " +
      "Set it in backend/.env and restart."
  );
  process.exit(1);
}

const IS_PROD = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 3000;

const app = express();

// Trust the first proxy (Railway/Vercel/etc.) so req.ip is accurate behind
// their load balancers. Harmless in local dev.
app.set("trust proxy", 1);

// ─── Security & infrastructure middleware ────────────────────────────────
// helmet sets a sane set of security HTTP headers.
// crossOriginResourcePolicy is loosened so the frontend can load avatar
// images served from /uploads in the browser.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // disabled because the API is JSON-only
  })
);
app.use(compression());

// Request logging — concise format in production, dev format on localhost.
app.use(morgan(IS_PROD ? "combined" : "dev"));

// CORS allowlist driven by env. Defaults to the Vite dev server so the
// localhost flow keeps working even if CORS_ORIGINS isn't set.
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow tools like curl / Postman (no Origin header) and same-origin requests.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Body parsers with sane size caps. Default Express limit is 100kb which is
// fine for most JSON; bumping to 1mb for journal entries.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── Static (uploaded) files ─────────────────────────────────────────────
// In local dev, avatars live on disk in backend/uploads/. In production we'll
// switch to Cloudinary; this static handler is a no-op when there are no files.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Rate limiters ───────────────────────────────────────────────────────
// Global, generous: catches obvious abuse without bothering real users.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  limit: 200,                 // 200 req/min/IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests. Slow down a moment." },
});

// Tight: anything that handles credentials.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  limit: 20,                  // 20 attempts per 15 min/IP across all auth endpoints
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed attempts toward the limit
  message: { message: "Too many authentication attempts. Try again later." },
});

app.use(generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const moodRoutes = require("./routes/moods");
const journalRoutes = require("./routes/journals");
const breathingRoutes = require("./routes/breathing");
const insightRoutes = require("./routes/insights");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/users");
const friendRoutes = require("./routes/friends");
const messageRoutes = require("./routes/messages");
const memoryRoutes = require("./routes/memories");

// Mount auth under the tighter limiter
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/moods", moodRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/breathing", breathingRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/memories", memoryRoutes);

// Health endpoint for uptime checks / deploy probes.
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", env: IS_PROD ? "production" : "development", time: new Date().toISOString() })
);

// Base route — short summary at /
app.get("/", (_req, res) => {
  res.json({
    name: "MindMate API",
    docs: "see /api/health",
    env: IS_PROD ? "production" : "development",
  });
});

// ─── Error & 404 handlers ────────────────────────────────────────────────
// 404 first
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Generic error handler. Hide stack traces in production to avoid leaking
// internal info; print full error to the server log either way.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  if (err?.message?.startsWith("CORS:")) {
    return res.status(403).json({ message: err.message });
  }
  res.status(err.status || 500).json({
    message: IS_PROD ? "Internal server error" : err.message || "Internal server error",
  });
});

// ─── Start server ────────────────────────────────────────────────────────
const server = http.createServer(app);
socket.init(server);

server.listen(PORT, async () => {
  try {
    await db.query("SELECT 1");
    console.log("✅ Connected to MySQL database");
    console.log(`🚀 MindMate API running on port ${PORT} (${IS_PROD ? "production" : "development"})`);
    console.log(`💬 Socket.io ready for real-time chat`);
    console.log(`🛡️  CORS allowed origins: ${allowedOrigins.join(", ")}`);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
});

module.exports = app;
