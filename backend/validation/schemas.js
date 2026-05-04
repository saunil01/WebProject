// Central place for all request-validation schemas.
// Each schema defines the SHAPE the controller is allowed to receive.
// Anything not in the schema is silently dropped (.strict() rejects it,
// .strip() — the default — drops it). For most cases we let zod drop unknown
// fields, except where we want to *reject* them (e.g. to surface privilege
// escalation attempts during testing).

const { z } = require("zod");

// ──── Building blocks ────────────────────────────────────────────────────
const username = z
  .string()
  .trim()
  .min(2, "Username must be at least 2 characters")
  .max(50, "Username must be 50 characters or fewer");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address")
  .max(120, "Email is too long");

const password = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password is too long");

const moodType = z.enum(["happy", "neutral", "sad", "anxious", "stressed"]);

const idParam = z.object({
  id: z.coerce.number().int().positive("Invalid ID"),
});

const friendIdParam = z.object({
  id: z.coerce.number().int().positive("Invalid friend ID"),
});

// ──── Auth ───────────────────────────────────────────────────────────────
// NOTE: `role` is intentionally NOT in this schema. Even if a client sends
// `{ role: "admin" }`, zod will strip it before the controller sees it.
// Only admins-promoting-other-admins (a future endpoint) should be able to
// change roles, never self-registration.
const register = z.object({
  username,
  email,
  password,
});

const login = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200),
});

const forgotPassword = z.object({
  email,
});

const resetPassword = z.object({
  newPassword: password,
});

const updateProfile = z
  .object({
    username: username.optional(),
    email: email.optional(),
    password: password.optional(),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").nullable().optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    about_me: z.string().max(1000, "About is too long").nullable().optional(),
    theme: z.enum(["light", "dark"]).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No fields to update",
  });

// ──── Mood entries ───────────────────────────────────────────────────────
// Lifestyle fields are all optional — users who don't care about correlations
// can keep logging moods exactly like before.
const sleepHours = z.coerce.number().int().min(0).max(24).nullable().optional();
const exercised = z.union([
  z.boolean(),
  z.coerce.number().int().min(0).max(1),
]).nullable().optional();
const caffeineCups = z.coerce.number().int().min(0).max(20).nullable().optional();

const moodCreate = z.object({
  mood_type: moodType,
  emoji: z.string().max(10).optional(),
  note: z.string().max(2000, "Note is too long").nullable().optional(),
  sleep_hours: sleepHours,
  exercised: exercised,
  caffeine_cups: caffeineCups,
});

const moodUpdate = z
  .object({
    mood_type: moodType.optional(),
    emoji: z.string().max(10).optional(),
    note: z.string().max(2000).nullable().optional(),
    mood_date: z.string().optional(),
    sleep_hours: sleepHours,
    exercised: exercised,
    caffeine_cups: caffeineCups,
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No fields to update",
  });

// ──── Journal entries ────────────────────────────────────────────────────
const journalCreate = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  content: z.string().trim().min(1, "Content is required").max(20000, "Entry is too long"),
  mood_id: z.coerce.number().int().positive().nullable().optional(),
});

const journalUpdate = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).max(20000).optional(),
    mood_id: z.coerce.number().int().positive().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No fields to update",
  });

// ──── Breathing sessions ─────────────────────────────────────────────────
const breathingCreate = z.object({
  duration: z.coerce.number().int().min(1, "Duration must be at least 1 min").max(60, "Duration is too long"),
  actual_duration: z.coerce.number().int().min(1).max(60).optional().nullable(),
  status: z.enum(["completed", "incomplete"]).optional(),
  type: z.string().max(40).optional(),
  session_date: z.string().optional(),
});

// ──── Insights / weekly reflections (the user-written kind) ──────────────
const insightCreate = z.object({
  week_start: z.string().min(1, "Week start is required"),
  summary: z.string().trim().min(1, "Summary is required").max(5000, "Summary is too long"),
});

// ──── Socket.io: chat messages ───────────────────────────────────────────
const messageSend = z.object({
  recipient_id: z.coerce.number().int().positive("Recipient is required"),
  content: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message is too long"),
  clientTempId: z.string().max(100).optional(),
});

const markRead = z.object({
  friend_id: z.coerce.number().int().positive(),
});

module.exports = {
  // params
  idParam,
  friendIdParam,
  // auth
  register,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  // moods
  moodCreate,
  moodUpdate,
  // journals
  journalCreate,
  journalUpdate,
  // breathing
  breathingCreate,
  // insights
  insightCreate,
  // socket
  messageSend,
  markRead,
};
