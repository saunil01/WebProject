# MindMate

A mental-wellness web companion. Track moods, write journals, breathe, see what affects you, and stay connected with friends — all in a calm, healthcare-themed interface that's installable on your phone.

![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Express%20%2B%20MySQL-1aa88c)
![PWA](https://img.shields.io/badge/PWA-installable-blue)
![Realtime](https://img.shields.io/badge/Realtime-Socket.io-010101)
![License](https://img.shields.io/badge/license-MIT-green)

> Built as a full-stack portfolio project. Production-hardened, validated end-to-end, deployable to free-tier hosting.

> 📄 **Project report (academic write-up):** see [`projectinfo.md`](./projectinfo.md) for the full formal document — goals, architecture diagram, data model, complete API reference, testing notes, and reflection.

---

## Features

### For users
- **Mood tracker** — five-mood log with optional lifestyle fields (sleep, exercise, caffeine), plus a one-tap quick-logger on the dashboard.
- **Journal** — long-form private writing with full-text search; entries can be pre-filled via URL query parameters.
- **Guided breathing** — a 4-4-6 box-breathing animation with completion tracking. Supports partial sessions if you stop early.
- **Wellness insights** — bar / line / doughnut / radar charts, plus auto-detected lifestyle correlations (*"You feel better on days you sleep 7+ hours"*).
- **Therapist-ready PDF export** — one click on the Insights page generates a multi-page summary you can bring to an appointment.
- **Memories** — Snapchat-style "on this day" surface showing your moods, journals, and breathing sessions from the same calendar date one week / one month / six months / one year / two years ago.
- **Friends + real-time chat** — Socket.io-powered messenger that only allows DMs between accepted friends.
- **Daily check-in reminder** — opt-in, configurable time, fires in-app and as a browser notification when permitted.
- **Streaks + Time Machine** — gentle, recoverable streak counter; "on this day" historical card on the dashboard.
- **Onboarding tour** — three-card welcome modal on first registration introducing mood, journal, and breathing.
- **Account control** — change password, upload/remove avatar (Cloudinary), permanently delete account with password verification.
- **Email typo guard** — register catches common email-domain typos (`gmail.cm` → `gmail.com`) before you submit.
- **PWA** — installable to phone home screen; offline-friendly app shell.

### For admins
- **Admin console** — hero band with active-today + community-mood, sparkline metrics, mood trend chart + mood-mix doughnut, **wellbeing watchlist** (members whose recent moods skew negative), live activity feed, inactive users.
- **Privacy-first moderation** — administrators can delete users, journals, and mood entries but **cannot read journal content, mood notes, or lifestyle data**. Moderation works on metadata only.
- **Audit log** — every privileged admin action (user / journal / mood deletion) is permanently recorded with the responsible admin, target user, target resource, and timestamp.
- **User management** — searchable, filterable card grid with avatars, role badges, and per-user activity counts.
- **CSV export** of admin metrics.

---

## Tech stack

**Frontend** — React 19, Vite, React Router v7, Tailwind CSS, Chart.js + react-chartjs-2, Socket.io client, jsPDF, vite-plugin-pwa.

**Backend** — Node.js + Express 5, MySQL 8 via mysql2, Socket.io, JWT + bcrypt, helmet, compression, express-rate-limit, morgan, zod, multer, Cloudinary.

---

## Architecture at a glance

```
┌────────────────┐      HTTPS / WSS       ┌──────────────────┐       MySQL pool       ┌──────────┐
│  React + PWA   │ ─────────────────────► │  Express + Socket│ ─────────────────────► │  MySQL   │
│   (Vite, 5173) │ ◄───────────────────── │     .io (3000)   │ ◄───────────────────── │ (3306)   │
└────────────────┘                        └──────────────────┘                        └──────────┘
        │                                          │
        │                                          │ avatar uploads
        │                                          ▼
        │                                  ┌──────────────────┐
        └─────── direct CDN reads ───────► │   Cloudinary     │
                                           └──────────────────┘
```

- Frontend talks only to the backend (`VITE_API_URL`). It never touches MySQL or Cloudinary directly.
- Socket.io powers chat; auth is performed via a JWT in the WebSocket handshake.
- Avatar uploads stream to Cloudinary in production; in local dev they fall back to `backend/uploads/` automatically.

---

## Quick start (local dev)

### Prerequisites
- Node.js 18+
- MySQL 8 (or 5.7+) running locally

### 1. Install
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Set up the database
1. Open MySQL Workbench, connect to your local server.
2. Open `backend/Mindmate.sql` and run it. It creates the `MindMate` database and all nine tables.

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env` minimum:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<your_mysql_password>
DB_NAME=Mindmate
JWT_SECRET=<a long random string>
CORS_ORIGINS=http://localhost:5173
```

Cloudinary is **optional** for local dev — leave those vars blank and uploads go to disk. For deploy, sign up at [cloudinary.com](https://cloudinary.com) (free, no card) and set:
```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

`frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
```

### 4. Run it
```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```
Visit **http://localhost:5173**.

### 5. Make yourself an admin (optional)
```sql
USE MindMate;
UPDATE Users SET role='admin' WHERE email='you@example.com';
```
Log out and back in. The Admin link appears in the sidebar.

---

## Deploy

### Recommended free-tier stack
- **Frontend → [Vercel](https://vercel.com)** — Vite is first-class, custom domain free.
- **Backend → [Railway](https://railway.app)** — Node + Socket.io + managed MySQL on one platform.
- **Avatars → [Cloudinary](https://cloudinary.com)** — free 25GB.

### Deploy steps

**Backend (Railway):**
1. New project → "Deploy from GitHub repo" → pick the `backend/` folder.
2. Add a MySQL service from Railway's catalog. Copy the connection vars into your service env.
3. Set the rest of the env vars from `backend/.env.example` — especially `JWT_SECRET`, `CORS_ORIGINS=https://your-frontend.vercel.app`, Cloudinary creds, `FRONTEND_URL=https://your-frontend.vercel.app`, `NODE_ENV=production`.
4. Run `Mindmate.sql` against the Railway MySQL via Workbench.

**Frontend (Vercel):**
1. New Project → import your GitHub repo → set the root directory to `frontend/`.
2. Add env var `VITE_API_URL=https://your-backend.up.railway.app`.
3. Deploy. Vercel auto-detects Vite.

After both are up, open the Vercel URL on your phone and "Add to Home Screen" — MindMate installs as an app.

---

## Project structure

```
backend/
  app.js                       # Express + Socket.io entry, security middleware
  socket.js                    # Socket.io setup + JWT handshake + chat events
  config/Database.js           # mysql2 connection pool
  Middleware/                  # auth, role, validate, upload (Cloudinary or disk)
  validation/schemas.js        # zod schemas for every write endpoint
  controllers/                 # business logic per domain (auth, mood, journal,
                               #   breathing, insight, friend, message, memory,
                               #   admin, user)
  routes/                      # thin route definitions, mount controllers
  models/                      # parameterized SQL helpers
  Mindmate.sql                 # full schema (run once into MySQL)

frontend/
  src/
    api.js                     # axios client with JWT + 401 handling
    context/                   # Auth, Theme, Socket, Confirm
    components/
      AppLayout.jsx            # sidebar + topbar shell
      OnboardingTour.jsx       # first-run 3-step modal
      ConnectTabs.jsx          # shared tab strip for the social pages
      ScrollToTop.jsx          # resets scroll on every route change
      PageHeader.jsx, EmptyState.jsx, LoadingScreen.jsx
    pages/
      Dashboard.jsx            # quick logger, today hero, streak, time machine
      MoodTracker.jsx, Journal.jsx, Breathing.jsx, Insights.jsx
      Memories.jsx             # on-this-day historical surface
      FriendsList.jsx, FriendRequests.jsx, UserList.jsx, UserProfileCard.jsx
      Chat.jsx                 # two-pane real-time messenger
      Profile.jsx, Login.jsx, Register.jsx, ForgotPassword.jsx, ResetPassword.jsx
      AdminPanel.jsx
      admin/                   # ManageUsers, ViewJournals, SystemInsights, AuditLog
    utils/
      avatar.js                # avatar URL resolution (Cloudinary or disk)
      streaks.js               # streak math
      reminder.js              # daily check-in reminder
      pdfExport.js             # therapist-ready PDF
      emailTypo.js             # common email-domain typo detection
  public/
    icon.svg, icon-maskable.svg, favicon.svg
  vite.config.js               # Vite + PWA plugin
```

---

## Security & privacy

- **Passwords**: bcrypt hashed (10 rounds).
- **Auth**: JWT, signed with a secret asserted at boot (server refuses to start if `JWT_SECRET` is missing or under 16 chars). 7-day default expiry.
- **Password reset**: tokens stored as SHA-256 hashes in the DB, single-use, 15-minute expiry. Old tokens invalidated on successful reset. The forgot-password endpoint never reveals which emails are registered (no enumeration).
- **Rate limiting**: 200 req/min globally, 20 *failed* auth attempts per 15-min per IP.
- **CORS**: env-driven allowlist. Defaults to `localhost:5173` for dev; production must set `CORS_ORIGINS`.
- **Input validation**: every write endpoint runs through a zod schema; unknown fields are stripped, length and type bounds enforced. Privilege-escalation guards: `role` is never accepted from a register payload.
- **File uploads**: 5 MB cap, MIME + extension allowlist (no SVG — XSS-prone), Cloudinary 512×512 face-aware resize at upload time.
- **Chat**: friend-status checked on every message and conversation read; non-friends can never read or write.
- **Admin privacy redactions**: administrators see metadata (counts, dates, mood types) but never private content (journal text, mood notes, sleep / exercise / caffeine fields). Every admin deletion is recorded in an immutable audit log.
- **Account deletion**: requires password re-verification. Cascades through every related table; avatar is also removed from Cloudinary.

---

## Roadmap / what's intentionally not built

- **Native mobile app** (React Native). PWA covers 90% of the value with 5% of the effort.
- **Email notifications**. Daily reminders are local-only; production email would add Resend/Postmark/SES and a scheduled worker.
- **Voice-to-text dictation**. Prototyped using the Web Speech API; removed because reliance on Google's recognition servers produced inconsistent network-error failures.
- **Audio meditations / sleep stories**. That's a content project, not a software project.

---

## Documentation

- **`README.md`** (this file) — developer-facing build and deploy instructions.
- **`projectinfo.md`** — formal academic project report covering goals, architecture diagram, data model, full API reference, testing methodology, and reflection.
- **`backend/Mindmate.sql`** — complete database schema. Run this once into MySQL to set up the tables.
- **`backend/.env.example` / `frontend/.env.example`** — annotated environment variable templates.

---

## License

MIT
