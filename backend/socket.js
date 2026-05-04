const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const db = require("./config/Database");
const schemas = require("./validation/schemas");

let io = null;

// Returns true if userA and userB have an accepted friendship in either direction.
async function areFriends(a, b) {
  if (Number(a) === Number(b)) return false;
  const [rows] = await db.query(
    `SELECT 1 FROM FriendRequests
     WHERE status='accepted'
       AND ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?))
     LIMIT 1`,
    [a, b, b, a]
  );
  return rows.length > 0;
}

function roomFor(userId) {
  return `user:${userId}`;
}

function init(httpServer) {
  // Match the same CORS allowlist as the Express HTTP server.
  // Defaults to localhost:5173 (Vite dev) when CORS_ORIGINS isn't set,
  // so local development keeps working out of the box.
  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Socket CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    },
  });

  // Auth handshake — require a JWT in handshake.auth.token
  io.use((socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) return next(new Error("No token"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { user_id: decoded.user_id, role: decoded.role };
      next();
    } catch (e) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const me = socket.user.user_id;
    socket.join(roomFor(me));

    // Send a chat message
    // payload: { recipient_id, content, clientTempId? }
    socket.on("send_message", async (payload, ack) => {
      try {
        const parsed = schemas.messageSend.safeParse(payload);
        if (!parsed.success) {
          return ack?.({
            ok: false,
            error: parsed.error.issues[0]?.message || "Invalid message.",
          });
        }
        const { recipient_id: recipientId, content, clientTempId } = parsed.data;

        const friend = await areFriends(me, recipientId);
        if (!friend) {
          return ack?.({ ok: false, error: "You can only message your friends." });
        }

        const [result] = await db.query(
          "INSERT INTO Messages (sender_id, recipient_id, content) VALUES (?, ?, ?)",
          [me, recipientId, content]
        );
        const [rows] = await db.query(
          "SELECT * FROM Messages WHERE message_id = ?",
          [result.insertId]
        );
        const message = rows[0];

        // Echo to sender (for cross-device sync) AND deliver to recipient
        io.to(roomFor(me)).emit("message", { message, clientTempId });
        io.to(roomFor(recipientId)).emit("message", { message });

        ack?.({ ok: true, message });
      } catch (err) {
        console.error("send_message error:", err);
        ack?.({ ok: false, error: "Server error sending message." });
      }
    });

    // Mark all messages from a friend as read
    // payload: { friend_id }
    socket.on("mark_read", async (payload, ack) => {
      try {
        const parsed = schemas.markRead.safeParse(payload);
        if (!parsed.success) return ack?.({ ok: false });
        const friendId = parsed.data.friend_id;
        await db.query(
          "UPDATE Messages SET read_at = NOW() WHERE recipient_id=? AND sender_id=? AND read_at IS NULL",
          [me, friendId]
        );
        // Tell the friend we've read their messages so they can show ✓✓
        io.to(roomFor(friendId)).emit("messages_read", { by: me });
        ack?.({ ok: true });
      } catch (err) {
        console.error("mark_read error:", err);
        ack?.({ ok: false });
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { init, getIO, areFriends, roomFor };
