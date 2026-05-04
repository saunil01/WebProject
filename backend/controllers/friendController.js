const db = require("../config/Database");

exports.sendRequest = async (req, res) => {
  try {
    const senderId = req.user.user_id;
    const { receiver_id } = req.body;

    if (senderId === receiver_id)
      return res.status(400).json({ message: "You cannot send a request to yourself." });

    await db.query(
      "INSERT INTO FriendRequests (sender_id, receiver_id, status) VALUES (?, ?, 'pending')",
      [senderId, receiver_id]
    );

    res.json({ message: "Friend request sent successfully!" });
  } catch (err) {
    console.error("Send request error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    await db.query("UPDATE FriendRequests SET status = 'accepted' WHERE request_id = ?", [requestId]);
    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error("Accept request error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await db.query(
      "SELECT * FROM FriendRequests WHERE receiver_id = ? AND status = 'pending'",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch requests error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await db.query(
      "SELECT * FROM FriendRequests WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'",
      [userId, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch friends error:", err);
    res.status(500).json({ message: "Server error" });
  }
};