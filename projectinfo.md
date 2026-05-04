# MindMate — Project Report

**A mental wellness web companion combining mood tracking, private journaling, guided breathing, and friend-only support, designed with a privacy-first approach to user data.**

---

## 1. Project Summary and Goals

### 1.1 Overview

MindMate is a full-stack web application that supports the daily practice of mental self-awareness. The platform allows individuals to record their emotional states, write private journal entries, complete guided breathing exercises, observe long-term patterns in their wellbeing, and exchange supportive messages with a personal network of accepted friends. The application is delivered as a Progressive Web Application (PWA), allowing it to be installed onto a mobile or desktop device and used in a manner comparable to a native application, while still being a single web codebase.

### 1.2 Target Audience

The application is intended for individuals between approximately fifteen and forty-five years of age who wish to develop a regular reflective practice without the cost or commitment of a clinical service. The target audience includes university students managing academic stress, working professionals experiencing burnout, individuals already engaged in therapy who require a structured tool to support their sessions, and anyone seeking a low-friction means of building emotional self-awareness.

### 1.3 Problem Statement

Existing mainstream wellness applications often suffer from one or more of the following limitations:

1. They display passive content (motivational quotations, generic affirmations) that does not adapt to the individual user.
2. They request large amounts of personal information without offering the user genuine ownership or portability of that data.
3. They embed engagement-maximisation patterns (streaks that punish lapses, frequent push notifications) that conflict with the wellbeing-oriented mission.
4. They expose private user content to administrative or operational staff in a manner that is rarely justified by the moderation requirements of the platform.

### 1.4 Solution and Goals

MindMate addresses the limitations identified above through four explicit design goals:

* **Personalisation through correlation, not generic content.** The application analyses each user's mood log alongside their optional lifestyle entries (sleep, exercise, caffeine) and surfaces individualised observations, such as the average difference in mood on days of varying sleep duration.
* **Data ownership.** Users are able to export a clinically formatted PDF summary suitable for sharing with a therapist, and a complete account-deletion pathway permanently removes all associated data from the database and external storage.
* **Humane engagement loops.** Streaks are leniently calculated (a missed day does not immediately reset the streak), and reminders are entirely opt-in with a user-selected time of day.
* **Privacy by default.** Administrators possess sufficient moderation authority (deletion of users, journal entries, and mood entries) without being granted read access to private journal content, mood notes, or health-related lifestyle data. Every administrative action is recorded in an immutable audit log.

---

## 2. Implemented Feature List

### 2.1 Minimum Viable Product (User-Facing)

| Feature | Description |
|---|---|
| Authentication | Account creation with auto-login on registration, password-based login, password reset via single-use SHA-256-hashed tokens, account deletion with password re-confirmation. |
| Mood Tracker | Five-state mood log (happy, neutral, sad, anxious, stressed) with optional free-text note and optional lifestyle fields (sleep hours, exercise yes/no, caffeine cups). |
| Journal | Long-form private writing with title and content, full-text client-side search, and pre-fill via URL query parameters. |
| Guided Breathing | A 4-second inhale, 4-second hold, 6-second exhale visual cycle, with selectable session length, automatic save on completion, and partial-session save when stopped early. |
| Wellness Insights | Bar, line, doughnut, and radar charts of mood data; auto-generated lifestyle correlations such as "average mood on nights with seven or more hours of sleep is X." |
| Therapist Export | One-click generation of a multi-page PDF summary including mood breakdown, lifestyle observations, and full journal entries from a user-selected date range. |
| Memories | A dedicated page surfacing the user's mood entries, journal entries, and breathing sessions from the same calendar date one week, one month, three months, six months, one year, two years, and three years prior. |
| Streaks and Time Machine | A consecutive-day mood-logging counter (with one day of grace), and a dashboard card surfacing one historical entry as a teaser. |
| Daily Check-In Reminder | Opt-in, user-configurable time of day, surfaced as both an in-application banner and a browser-native notification. |
| Social Network | Friend requests (send, accept, decline, remove), browsable community of all members, real-time chat using WebSockets, and admin-detectable badges. |
| Profile | Editable username, email, date of birth, gender, biography; avatar upload (stored in Cloudinary in production, on local disk in development); change-password and delete-account actions. |
| Onboarding | Three-card welcome modal shown once after first registration, introducing mood tracking, journaling, and breathing. |
| Progressive Web Application | Manifest, service worker, installable to phone or desktop home screens, offline shell. |
| Email Typo Detection | Real-time detection of common typos in email domains (such as `gmail.cm` versus `gmail.com`), with a confirmable correction suggestion before submission. |

### 2.2 Minimum Viable Product (Administrative)

| Feature | Description |
|---|---|
| Admin Dashboard | Hero band displaying active users today and community mood; sparkline metrics for new users, journals, and moods; mood-trend line chart and mood-distribution doughnut; wellbeing watchlist of users whose recent moods skew negative; live activity feed; inactive-user list. |
| User Management | Card-based grid with avatars, role badges, mood and journal counts, joined and last-active timestamps; role and search filters; protected against self-deletion. |
| Journal Moderation | Metadata-only listing of journal entries (author, timestamp, word count, length category); administrators cannot view title or content. |
| Mood Moderation | Metadata-only listing of mood entries (author, mood type, timestamp); administrators cannot view notes or lifestyle data; flag indicating whether private details exist. |
| Audit Log | Permanent record of every privileged action (deletion of users, journals, or moods), including the responsible administrator, the affected user, and the timestamp. |
| Time-Range Filter | Selectable seven-day, thirty-day, ninety-day, and all-time windows on the dashboard for adaptable reporting. |
| CSV Export | Export of headline metrics for offline analysis. |

### 2.3 Stretch Features Considered but Not Implemented

The following features were evaluated and intentionally excluded from the present scope:

* **Native mobile applications** for iOS and Android were not built; the Progressive Web Application provides equivalent install-to-home-screen functionality with substantially lower development cost.
* **Email-based notifications** require an external transactional email provider (Resend, Postmark, or similar) and a scheduled worker process; only browser notifications are presently implemented.
* **Group community channels** were excluded due to the moderation overhead inherent in any open mental-health forum.
* **Voice-to-text dictation** was prototyped using the Web Speech API but removed after empirical testing demonstrated unreliable connectivity to Google's recognition servers, which produced inconsistent user experiences.

---

## 3. System Architecture

### 3.1 Architectural Overview

MindMate follows a conventional three-tier architecture comprising a single-page client application, a stateless application server, and a relational database. External object storage is used for user-uploaded images. WebSocket connections supplement HTTP for the real-time messaging feature.

### 3.2 Architecture Diagram

```
┌────────────────────────┐       HTTPS        ┌────────────────────────┐
│                        │ ─────────────────► │                        │
│   Client (Browser)     │                    │   Application Server   │
│   ─────────────────    │ ◄───────────────── │   ─────────────────    │
│   React + Vite + PWA   │                    │   Node.js + Express 5  │
│   Service Worker       │       WSS          │   Socket.io            │
│   (offline shell)      │ ────── ◄ ─────►    │   JWT authentication   │
│   localhost:5173       │  WebSocket events  │   localhost:3000       │
│   in development       │                    │                        │
└──────────┬─────────────┘                    └────────────┬───────────┘
           │                                               │
           │  Direct CDN reads                             │  MySQL pool
           │  for avatar images                            │  (mysql2/promise)
           ▼                                               ▼
┌────────────────────────┐                     ┌────────────────────────┐
│                        │                     │                        │
│   Cloudinary           │                     │   MySQL 8 Database     │
│   (object storage,     │                     │   ─────────────────    │
│    transforms,         │                     │   localhost:3306       │
│    auto-optimisation)  │                     │   InnoDB engine        │
│                        │                     │                        │
└────────────────────────┘                     └────────────────────────┘
```

### 3.3 Architectural Choices and Justifications

* **Stateless backend.** All authentication state is encoded in JSON Web Tokens (JWT), which permits the application server to be horizontally scaled or restarted without disrupting active sessions.
* **Connection pooling via mysql2/promise.** Pre-established database connections eliminate per-request connection overhead and enforce a configurable concurrency limit (default ten).
* **Socket.io for real-time messaging.** Provides automatic transport fallback (from WebSocket to long-polling when necessary) and an authentication handshake that validates the JWT before allowing any event subscription.
* **Cloudinary for image storage.** Eliminates the requirement for the application server to host persistent storage, applies a face-aware 512×512 resize at upload time, and delivers images via a global content-delivery network. Local-disk fallback is supported for development environments.
* **Progressive Web Application via vite-plugin-pwa.** Generates a Workbox-based service worker offering an offline application shell and a network-first runtime cache for API responses with a five-second timeout fallback to the cache.

### 3.4 Security Posture

* `helmet` applies a baseline of security HTTP headers.
* CORS is configured by an environment-driven allowlist; requests from unrecognised origins are rejected.
* Rate limiting via `express-rate-limit` applies a global cap of two hundred requests per minute and a tighter twenty-failed-attempt cap per fifteen-minute window on authentication endpoints.
* Body sizes are capped at one megabyte to mitigate denial-of-service via large payloads.
* The `JWT_SECRET` environment variable is asserted at server boot, preventing accidental operation with a missing or trivial secret.
* Password reset tokens are stored as SHA-256 hashes; the original token is only ever transmitted in the link delivered to the user.
* The `forgot-password` endpoint returns identical responses for known and unknown email addresses to prevent account enumeration.
* The `register` endpoint silently strips any `role` field from the request body, preventing self-promotion to administrator.

---

## 4. Data Model

### 4.1 Tables

The relational schema consists of nine tables, all managed under the InnoDB engine with foreign-key constraints and `ON DELETE CASCADE` behaviour where appropriate.

#### Users

| Column | Type | Notes |
|---|---|---|
| user_id | INT, PK, AUTO_INCREMENT | Primary key |
| username | VARCHAR(50), UNIQUE, NOT NULL | Display name |
| email | VARCHAR(100), UNIQUE, NOT NULL | Login identifier |
| password_hash | VARCHAR(255), NOT NULL | bcrypt, ten salt rounds |
| role | ENUM('admin','user','guest') | Defaults to `user` |
| created_at | TIMESTAMP | Account creation |
| last_login | DATETIME, nullable | Updated on successful login |
| avatar | VARCHAR(255), nullable | Cloudinary URL or relative path |
| dob | DATE, nullable | Date of birth |
| gender | ENUM('male','female','other'), nullable |  |
| about_me | TEXT, nullable | Free-text biography |
| theme | ENUM('light','dark') | Defaults to `light` |

#### MoodEntries

| Column | Type | Notes |
|---|---|---|
| mood_id | INT, PK | |
| user_id | INT, FK → Users.user_id | Cascade delete |
| mood_date | DATETIME | Entry timestamp |
| mood_type | ENUM(...) | One of happy / neutral / sad / anxious / stressed |
| emoji | VARCHAR(10), nullable | |
| note | TEXT, nullable | Private to user |
| sleep_hours | TINYINT, nullable | Lifestyle field |
| exercised | TINYINT, nullable | Lifestyle field (0 or 1) |
| caffeine_cups | TINYINT, nullable | Lifestyle field |
| created_at | TIMESTAMP | |

#### JournalEntries

| Column | Type | Notes |
|---|---|---|
| journal_id | INT, PK | |
| user_id | INT, FK → Users.user_id | Cascade delete |
| mood_id | INT, FK → MoodEntries.mood_id, nullable | Optional linkage |
| entry_date | DATE, default current date | |
| title | VARCHAR(200) | |
| content | TEXT, NOT NULL | Private to user |
| created_at | TIMESTAMP | |

#### BreathingSessions

| Column | Type | Notes |
|---|---|---|
| session_id | INT, PK | |
| user_id | INT, FK → Users.user_id | Cascade delete |
| session_date | DATETIME | |
| duration | INT, NOT NULL | Planned minutes |
| actual_duration | INT, nullable | Actual minutes if stopped early |
| status | ENUM('completed','incomplete') | Defaults to `completed` |
| created_at | TIMESTAMP | |

#### Insights (User-Written Weekly Reflections)

| Column | Type | Notes |
|---|---|---|
| insight_id | INT, PK | |
| user_id | INT, FK → Users.user_id | Cascade delete |
| week_start | DATE, NOT NULL | Monday of the reflected week |
| summary | TEXT | Free-text weekly summary |
| created_at | TIMESTAMP | |

#### FriendRequests

| Column | Type | Notes |
|---|---|---|
| request_id | INT, PK | |
| sender_id | INT, FK → Users.user_id | |
| receiver_id | INT, FK → Users.user_id | |
| status | ENUM('pending','accepted','rejected') | |
| created_at | TIMESTAMP | |

#### Messages

| Column | Type | Notes |
|---|---|---|
| message_id | INT, PK | |
| sender_id | INT, FK → Users.user_id | Cascade delete |
| recipient_id | INT, FK → Users.user_id | Cascade delete |
| content | TEXT, NOT NULL | |
| created_at | TIMESTAMP | |
| read_at | TIMESTAMP, nullable | |

Three composite indexes (`idx_pair`, `idx_pair_rev`, `idx_unread`) accelerate common access patterns: conversation history retrieval and unread-count aggregation.

#### PasswordResets

| Column | Type | Notes |
|---|---|---|
| reset_id | INT, PK | |
| user_id | INT, FK → Users.user_id | Cascade delete |
| token_hash | CHAR(64), UNIQUE | SHA-256 of the raw token |
| expires_at | DATETIME, NOT NULL | Fifteen minutes from creation |
| used_at | DATETIME, nullable | Set on first successful redemption |
| created_at | TIMESTAMP | |

#### AdminAuditLog

| Column | Type | Notes |
|---|---|---|
| log_id | INT, PK | |
| admin_id | INT, nullable | Set null if admin account is later deleted |
| admin_username | VARCHAR(50), NOT NULL | Denormalised, survives admin deletion |
| action_type | VARCHAR(50), NOT NULL | E.g., `delete_journal`, `delete_user` |
| target_user_id | INT, nullable | The affected user |
| target_username | VARCHAR(50), nullable | Denormalised |
| target_resource_type | VARCHAR(40), nullable | E.g., `mood`, `journal`, `user` |
| target_resource_id | INT, nullable | The affected resource identifier |
| details | TEXT, nullable | JSON-encoded contextual data, never private content |
| created_at | TIMESTAMP | |

### 4.2 Key Relationships

* One `User` to many `MoodEntries`, `JournalEntries`, `BreathingSessions`, `Insights`, `Messages` (sent and received), and `FriendRequests` (sent and received). Cascade delete ensures complete removal of all associated data when a user account is deleted.
* Optional one-to-one association between `JournalEntries` and `MoodEntries` via `mood_id`, enabling future "what mood was I in when I wrote this" features.
* `FriendRequests` represents an undirected friendship via two directed rows when accepted; the application treats `(sender_id, receiver_id)` as logically symmetric for accepted records.

---

## 5. API Design

The application server exposes a RESTful HTTP API mounted under the `/api` prefix and a Socket.io WebSocket service for real-time messaging.

### 5.1 Authentication

All authenticated endpoints require an `Authorization: Bearer <jwt>` header. The JWT is obtained from the login or register endpoints and remains valid for seven days by default.

### 5.2 Endpoint Inventory

#### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a new user account. |
| POST | `/api/auth/login` | Authenticate and receive a JWT. |
| POST | `/api/auth/forgot-password` | Generate a password-reset token. |
| POST | `/api/auth/reset-password/:token` | Redeem a token to set a new password. |
| GET | `/api/auth/profile` | Retrieve the authenticated user's profile. |
| PUT | `/api/auth/update` | Update the authenticated user's profile. |
| DELETE | `/api/auth/delete` | Permanently delete the authenticated user's account (password required). |
| POST | `/api/auth/avatar` | Upload an avatar image (multipart/form-data). |
| DELETE | `/api/auth/avatar` | Remove the current avatar. |

#### Mood Entries

| Method | Path | Description |
|---|---|---|
| GET | `/api/moods` | List the authenticated user's mood entries. |
| POST | `/api/moods` | Create a mood entry. |
| GET | `/api/moods/:id` | Retrieve a single mood entry. |
| PUT | `/api/moods/:id` | Update a mood entry. |
| DELETE | `/api/moods/:id` | Delete a mood entry. |

#### Journal Entries

| Method | Path | Description |
|---|---|---|
| GET | `/api/journals` | List the authenticated user's journal entries. |
| POST | `/api/journals` | Create a journal entry. |
| PUT | `/api/journals/:id` | Update a journal entry. |
| DELETE | `/api/journals/:id` | Delete a journal entry. |

#### Breathing Sessions

| Method | Path | Description |
|---|---|---|
| GET | `/api/breathing` | List breathing sessions. |
| POST | `/api/breathing` | Record a new session (completed or partial). |
| DELETE | `/api/breathing/:id` | Delete a session. |

#### Insights

| Method | Path | Description |
|---|---|---|
| GET | `/api/insights` | List user-written weekly reflections. |
| POST | `/api/insights` | Create a weekly reflection. |
| GET | `/api/insights/correlations` | Retrieve auto-generated lifestyle correlations. |
| DELETE | `/api/insights/:id` | Delete a weekly reflection. |

#### Memories

| Method | Path | Description |
|---|---|---|
| GET | `/api/memories` | Retrieve historical entries from the same date in past time windows. |

#### Friends

| Method | Path | Description |
|---|---|---|
| POST | `/api/friends/request/:id` | Send a friend request. |
| GET | `/api/friends/received` | List received friend requests. |
| POST | `/api/friends/accept/:requestId` | Accept a received request. |
| POST | `/api/friends/reject/:requestId` | Decline a received request. |
| GET | `/api/friends` | List accepted friends. |
| GET | `/api/friends/status/:id` | Determine the relationship status with a user. |
| GET | `/api/friends/requests/pending` | Retrieve a count of pending requests. |
| DELETE | `/api/friends/remove/:id` | Remove an accepted friendship. |

#### Messages

| Method | Path | Description |
|---|---|---|
| GET | `/api/messages/threads` | List all conversation threads with last-message preview. |
| GET | `/api/messages/unread/counts` | Retrieve unread counts grouped by sender. |
| GET | `/api/messages/:friendId` | Retrieve the conversation history with a friend. |

#### Users

| Method | Path | Description |
|---|---|---|
| GET | `/api/users/public` | Retrieve all users with aggregated mood statistics (community directory). |
| GET | `/api/users/me` | Retrieve the authenticated user's profile (alias). |

#### Administration (admin role required)

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users with mood and journal counts. |
| DELETE | `/api/admin/user/:id` | Delete a user (audited). |
| GET | `/api/admin/moods` | List all mood entries (metadata only). |
| DELETE | `/api/admin/mood/:id` | Delete a mood entry (audited). |
| GET | `/api/admin/journals` | List all journal entries (metadata only). |
| DELETE | `/api/admin/journal/:id` | Delete a journal entry (audited). |
| GET | `/api/admin/analytics` | Aggregate analytics with optional `range` query parameter. |
| GET | `/api/admin/activity` | Real-time activity feed of signups, moods, and journals. |
| GET | `/api/admin/needs-care` | Wellbeing watchlist of users with negative mood trends. |
| GET | `/api/admin/audit-log` | Retrieve administrative audit-log entries. |

### 5.3 Representative Request and Response Examples

**Register (POST /api/auth/register)**

Request:
```json
{
  "username": "Priyen",
  "email": "priyen@example.com",
  "password": "secure-pass-123"
}
```

Response (HTTP 201):
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 7,
    "username": "Priyen",
    "email": "priyen@example.com",
    "role": "user"
  }
}
```

**Create a mood entry (POST /api/moods)**

Request:
```json
{
  "mood_type": "happy",
  "note": "Productive afternoon at the library.",
  "sleep_hours": 8,
  "exercised": true,
  "caffeine_cups": 1
}
```

Response (HTTP 201):
```json
{
  "message": "Mood entry added successfully",
  "mood": {
    "mood_id": 142,
    "user_id": 7,
    "mood_type": "happy",
    "mood_date": "2026-04-28T10:42:00.000Z",
    "note": "Productive afternoon at the library.",
    "sleep_hours": 8,
    "exercised": 1,
    "caffeine_cups": 1
  }
}
```

**Lifestyle correlations (GET /api/insights/correlations)**

Response (HTTP 200, abbreviated):
```json
{
  "totalSamples": 21,
  "averageMood": 3.62,
  "insights": [
    {
      "key": "sleep",
      "headline": "Sleep lifts your mood",
      "detail": "Your average mood is 4.2 on nights you sleep 7+ hours, vs. 2.8 on shorter nights.",
      "value": 1.4,
      "samples": 14,
      "sentiment": "positive"
    }
  ],
  "diagnostics": {
    "totalMoods": 21,
    "distinctDays": 18,
    "sleep":   { "count": 14, "highCount": 9, "lowCount": 5 },
    "exercise":{ "count": 12, "yesCount": 7, "noCount": 5 },
    "caffeine":{ "count": 10, "lowCount": 6, "highCount": 4 }
  }
}
```

**Validation error (POST /api/auth/register, malformed body)**

Response (HTTP 400):
```json
{
  "message": "Username must be at least 2 characters",
  "errors": [
    { "path": "username", "message": "Username must be at least 2 characters" }
  ]
}
```

### 5.4 WebSocket Events (Socket.io)

The Socket.io connection authenticates via a JWT supplied in the handshake auth payload. Each connected user joins a private room named `user:<id>`.

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `send_message` | `{ recipient_id, content, clientTempId? }` |
| Client → Server | `mark_read` | `{ friend_id }` |
| Server → Client | `message` | `{ message: { ... }, clientTempId? }` |
| Server → Client | `messages_read` | `{ by: <user_id> }` |

Friendship is verified server-side on every `send_message` event and on every conversation-history HTTP request.

---

## 6. Setup and Run Instructions

### 6.1 Prerequisites

* Node.js, version 18 or later
* MySQL 8 (or 5.7 or later) with administrative access
* A modern web browser (Google Chrome, Microsoft Edge, or Safari)
* Optionally, a free Cloudinary account for production-grade avatar storage

### 6.2 Database Initialisation

1. Open MySQL Workbench (or any MySQL client) and connect to the local MySQL server.
2. Open the file `backend/Mindmate.sql`.
3. Execute the entire script. The script creates the `MindMate` database and all nine tables described in Section 4.

### 6.3 Backend Configuration

1. Copy `backend/.env.example` to `backend/.env`.
2. Populate the `.env` file with the following required variables:

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<your_mysql_password>
DB_NAME=Mindmate
JWT_SECRET=<a long random string of at least sixteen characters>
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:5173
```

3. Optionally, for Cloudinary-based avatar storage, append:

```
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
```

If these three variables are absent, the application falls back to local-disk storage in `backend/uploads/avatars/`.

4. Install backend dependencies and start the server:

```bash
cd backend
npm install
npm run dev
```

The server listens on the port specified in the `.env` file (default 3000) and prints a confirmation message including the connected database, allowed CORS origins, and Socket.io readiness.

### 6.4 Frontend Configuration

1. Copy `frontend/.env.example` to `frontend/.env`.
2. Populate the `.env` file:

```
VITE_API_URL=http://localhost:3000
```

3. Install frontend dependencies and start the development server:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server starts on `http://localhost:5173`.

### 6.5 Optional: Promoting an Administrator

After registering a user account through the application's web interface, an administrator role may be granted by executing the following SQL statement against the `MindMate` database:

```sql
UPDATE Users SET role = 'admin' WHERE email = '<your_email>';
```

The user must subsequently log out and log back in for the new role to take effect, after which an "Open Admin Panel" link becomes visible in the sidebar.

### 6.6 Production Deployment

The application is designed to be deployed on free-tier infrastructure consisting of Vercel for the frontend, Railway for the backend and managed MySQL service, and Cloudinary for object storage. Detailed deployment instructions are provided in `README.md`.

---

## 7. Testing and Quality Assurance

### 7.1 Testing Approach

Testing was performed via manual end-to-end exercise of every implemented feature, supplemented by structured exploratory testing focused on the boundaries of each form input and the failure modes of each network call. No automated test suite is presently included; this is acknowledged as a future improvement.

### 7.2 Verified Scenarios

| Area | Verified |
|---|---|
| Authentication | Registration with valid and invalid input, automatic login on successful registration, failed-login throttling, password reset via console-logged link, account deletion with password verification. |
| Mood Tracker | Quick logging of all five mood states, optional note and lifestyle field persistence, deletion, and history rendering. |
| Journal | Entry creation, full-text search, deletion, and URL-parameter pre-fill. |
| Breathing | Full-cycle completion, mid-cycle stop with partial-session save, history rendering, completed/incomplete badge correctness, double-save prevention under React Strict Mode. |
| Insights | Chart rendering with varying data densities, correlation generation with mixed and homogeneous data sets, empty-state messaging for insufficient data, and PDF export across multiple time ranges. |
| Memories | Display of historical entries from one week, one month, and one year prior; empty-state messaging when no historical data exists. |
| Friends and Chat | Friend request lifecycle, real-time message delivery between two browsers, unread-count accuracy, read receipt propagation, and friendship verification on attempted out-of-band messages. |
| Profile and Avatars | Image upload with both local-disk and Cloudinary backends, automatic cleanup of previous avatars, change-of-other-fields propagation to sidebar and topbar without refresh. |
| Admin | All deletion paths, audit-log entry creation, role-filter functionality, privacy redaction (verified by inspecting API responses to confirm absence of `content` and `note` fields). |
| Progressive Web Application | Manifest detection, service-worker registration, install-to-home-screen on mobile and desktop, offline shell rendering. |

### 7.3 Defects Identified and Resolved During Development

Several substantive defects were identified through exploratory testing and subsequently resolved:

1. **Template-literal misuse.** Multiple API calls in the original codebase used double-quoted strings (e.g., `"/moods/${id}"`) where backtick template literals were required. The literal placeholder string was being transmitted to the backend rather than the interpolated value. All occurrences were located and corrected.
2. **React Strict Mode double-save.** The breathing session controller invoked `saveSession()` from within a `setRemaining` updater function. React Strict Mode invokes state updater functions twice in development, producing two API calls. The fix was to relocate the side effect outside of the state updater and protect it with a saved flag.
3. **Modal positioning anchored to a transformed ancestor.** The dashboard `<main>` element used `animate-fade-in`, which applies a CSS transform. By the CSS specification, any transformed ancestor breaks `position: fixed` for descendants. Modals therefore anchored to `<main>` rather than the viewport, producing visually misplaced dialogs. The fix was to use React portals to render modal content into `document.body`.
4. **Privilege escalation via the register endpoint.** The original `register` controller honoured a `role` field in the request body, allowing self-promotion to administrator. The endpoint now silently strips the field, and the controller hard-codes the assigned role as `user`.
5. **Shadowed administrative route.** The `routes/users.js` file contained a duplicate `/public` handler that included `WHERE u.role = 'user'`, silently excluding administrators from the public directory. The duplicate was removed and the route refactored to delegate to the controller.
6. **Email enumeration vulnerability.** The original `forgot-password` endpoint returned an HTTP 404 for unknown email addresses, allowing an attacker to enumerate registered accounts. The endpoint now returns identical responses regardless of account existence.

### 7.4 Known Limitations

* No automated test suite is included.
* The Web Speech-based voice dictation feature was prototyped and removed due to unreliable connectivity to Google's recognition servers.
* Email-based reminders and password reset notifications are not delivered to users; reset links are written to the backend console only, requiring manual extraction during local development.
* The application supports only a single language (English).
* Push notifications fire only when the application tab is open; true server-pushed notifications would require a web-push subscription mechanism and a worker process, neither of which is implemented.

### 7.5 Error Handling Strategy

* All API endpoints wrap business logic in `try`/`catch` blocks and respond with a structured error payload containing a `message` field.
* The global error handler in `app.js` hides stack traces in production environments while still printing them to the server console for diagnosis.
* Frontend pages catch axios errors and display the server-supplied message to the user when available, with a sensible fallback otherwise.
* Validation errors return HTTP 400 with both a human-readable summary message and a structured `errors` array detailing each field-level violation.

---

## 8. Reflection and Next Steps

### 8.1 Reflection

The project successfully delivers a production-quality wellness application with a feature set that extends meaningfully beyond standard mood-tracking products through the lifestyle-correlation engine, the therapist-export functionality, the historical Memories surface, and a privacy-first administrative model. Architectural decisions made during development — including the use of JSON Web Tokens, the choice of Socket.io over polling for chat, the dual-mode upload middleware, and the privacy redactions in administrative endpoints — proved to be well-judged in retrospect.

The most significant learning from the project concerns the cumulative cost of small architectural mistakes. Several early issues (template-literal misuse, the duplicated user route, missing controller-method parity) were inexpensive to introduce and disproportionately expensive to debug. Future projects will benefit from adopting tighter conventions earlier in the lifecycle, particularly around validation and error reporting.

### 8.2 Improvements with Additional Time

Given additional development time, the following improvements would be prioritised in approximate order of value:

1. **Automated test coverage.** Unit tests for the validation schemas and the correlation algorithm; integration tests for the authentication, friendship, and messaging flows; end-to-end tests with Playwright or Cypress covering the critical user journeys.
2. **Email integration.** Adoption of a transactional email provider (Resend, Postmark, or SendGrid) for password resets, weekly digest emails, and (optionally) opt-in reminder messages.
3. **Server-side push notifications.** A Web Push subscription mechanism with stored VAPID keys, allowing reminders to fire even when the application is closed.
4. **Internationalisation.** Externalisation of UI strings into a translation layer (e.g., react-intl), with at least one secondary language supported as a proof of concept.
5. **Cognitive Behavioural Therapy (CBT) thought records.** A structured form-based feature in which users record an automatic thought, identify the cognitive distortion, and write a balanced reframe — a basic technique recommended by mainstream therapeutic guidance and currently absent from the application.
6. **Application-level lock.** A user-configurable PIN or biometric lock to be entered at every application launch, addressing the elevated risk of shared devices in a wellness context.
7. **Comprehensive accessibility audit.** Manual review with a screen reader, keyboard-only navigation testing, and colour-contrast validation across light and dark themes.
8. **Performance optimisation.** Code-splitting via dynamic imports for the heavy charts on the Insights and Admin pages; pagination on the journal-history view; query analysis and additional indexes if any slow queries appear under realistic data volumes.
9. **Observability.** Integration of an error-aggregation service (Sentry, Rollbar, or similar) and a structured logging format (JSON, ingested by a log-management platform) for production monitoring.
10. **Continuous integration.** A GitHub Actions workflow that runs the frontend lint and build, and (once tests exist) the test suite, on every push.

### 8.3 Concluding Statement

MindMate demonstrates that a thoughtful and privacy-respecting wellness application can be built with a small, modern technology stack and shipped in a deployable state, without recourse to engagement-maximisation patterns or speculative feature creep. The architecture, security posture, and feature set are appropriate to the domain, and the codebase is positioned to accept the incremental improvements outlined above without structural rework.

---

## Appendix A: Technology Stack Summary

| Layer | Component | Version (approx.) |
|---|---|---|
| Frontend framework | React | 19 |
| Build tool | Vite | 7 |
| Routing | React Router | 7 |
| Styling | Tailwind CSS | 3 |
| Charts | Chart.js with react-chartjs-2 | 4 |
| WebSocket client | socket.io-client | 4 |
| PDF generation | jsPDF | 3 |
| PWA | vite-plugin-pwa | latest |
| Backend runtime | Node.js | 18+ |
| HTTP framework | Express | 5 |
| Database driver | mysql2/promise | 3 |
| WebSocket server | Socket.io | 4 |
| Authentication | jsonwebtoken + bcryptjs | 9 / 3 |
| Security middleware | helmet, compression, cors, express-rate-limit | latest |
| Logging | morgan | 1 |
| Validation | zod | 3 |
| File upload | multer | 1 |
| Object storage | cloudinary | 2 |
| Database | MySQL | 8 |
| Frontend hosting | Vercel | — |
| Backend hosting | Railway | — |

---

*This report was prepared as part of the MindMate full-stack web development project. The companion document `README.md` at the project root provides developer-focused build and deployment instructions.*
