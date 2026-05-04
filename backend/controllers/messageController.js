const db = require("../config/Database");
const { areFriends, getIO, roomFor } = require("../socket");

const messageController = {
  // GET /api/messages/:friendId
  // Returns the full conversation between current user and :friendId,
  // and marks any unread messages from :friendId as read.
  getConversation: async (req, res) => {
    try {
      const me = req.user.user_id;
      const friendId = Number(req.params.friendId);

      if (!friendId || friendId === me) {
        return res.status(400).json({ message: "Invalid conversation." });
      }

      const friend = await areFriends(me, friendId);
      if (!friend) {
        return res.status(403).json({ message: "You can only chat with friends." });
      }

      const [rows] = await db.query(
        `SELECT * FROM Messages
         WHERE (sender_id=? AND recipient_id=?)
            OR (sender_id=? AND recipient_id=?)
         ORDER BY created_at ASC, message_id ASC
         LIMIT 500`,
        [me, friendId, friendId, me]
      );

      // Mark incoming as read
      const [upd] = await db.query(
        "UPDATE Messages SET read_at = NOW() WHERE recipient_id=? AND sender_id=? AND read_at IS NULL",
        [me, friendId]
      );

      if (upd.affectedRows > 0) {
        const io = getIO();
        if (io) io.to(roomFor(friendId)).emit("messages_read", { by: me });
      }

      res.json(rows);
    } catch (err) {
      console.error("Get conversation error:", err);
      res.status(500).json({ message: "Failed to load conversation." });
    }
  },

  // GET /api/messages/unread/counts
  // Returns: { totalUnread: N, byFriend: { friendId: count, ... } }
  getUnreadCounts: async (req, res) => {
    try {
      const me = req.user.user_id;
      const [rows] = await db.query(
        `SELECT sender_id, COUNT(*) AS unread
           FROM Messages
          WHERE recipient_id=? AND read_at IS NULL
          GROUP BY sender_id`,
        [me]
      );

      const byFriend = {};
      let total = 0;
      for (const r of rows) {
        byFriend[r.sender_id] = Number(r.unread);
        total += Number(r.unread);
      }
      res.json({ totalUnread: total, byFriend });
    } catch (err) {
      console.error("Unread counts error:", err);
      res.status(500).json({ message: "Failed to load unread counts." });
    }
  },

  // GET /api/messages/threads
  // Returns each friend along with the last message + unread count
  // (drives the conversation list in the chat sidebar)
  getThreads: async (req, res) => {
    try {
      const me = req.user.user_id;

      const [friends] = await db.query(
        `SELECT DISTINCT u.user_id, u.username, u.email, u.avatar
           FROM FriendRequests fr
           JOIN Users u
             ON (u.user_id = fr.sender_id AND fr.receiver_id = ?)
             OR (u.user_id = fr.receiver_id AND fr.sender_id = ?)
          WHERE fr.status='accepted'`,
        [me, me]
      );

      if (friends.length === 0) return res.json([]);

      const friendIds = friends.map((f) => f.user_id);
      const placeholders = friendIds.map(() => "?").join(",");

      // Last message exchanged with each friend
      const [lastMsgs] = await db.query(
        `SELECT m.*
           FROM Messages m
           JOIN (
             SELECT
               LEAST(sender_id, recipient_id)    AS a,
               GREATEST(sender_id, recipient_id) AS b,
               MAX(message_id) AS last_id
             FROM Messages
             WHERE (sender_id=? AND recipient_id IN (${placeholders}))
                OR (recipient_id=? AND sender_id IN (${placeholders}))
             GROUP BY a, b
           ) latest ON m.message_id = latest.last_id`,
        [me, ...friendIds, me, ...friendIds]
      );

      const lastByFriend = {};
      for (const m of lastMsgs) {
        const friendId = m.sender_id === me ? m.recipient_id : m.sender_id;
        lastByFriend[friendId] = m;
      }

      // Unread counts per friend
      const [unreadRows] = await db.query(
        `SELECT sender_id, COUNT(*) AS unread
           FROM Messages
          WHERE recipient_id=? AND read_at IS NULL
          GROUP BY sender_id`,
        [me]
      );
      const unreadByFriend = {};
      for (const r of unreadRows) unreadByFriend[r.sender_id] = Number(r.unread);

      const threads = friends.map((f) => ({
        ...f,
        lastMessage: lastByFriend[f.user_id] || null,
        unread: unreadByFriend[f.user_id] || 0,
      }));

      // Sort: unread first, then by last message date, then alphabetically
      threads.sort((a, b) => {
        if ((b.unread > 0) - (a.unread > 0) !== 0) return (b.unread > 0) - (a.unread > 0);
        const at = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
        const bt = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
        if (bt !== at) return bt - at;
        return (a.username || "").localeCompare(b.username || "");
      });

      res.json(threads);
    } catch (err) {
      console.error("Threads error:", err);
      res.status(500).json({ message: "Failed to load conversations." });
    }
  },
};

module.exports = messageController;
