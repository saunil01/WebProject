import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";
import api from "../api";

export const SocketContext = createContext({
  socket: null,
  online: false,
  unreadByFriend: {},
  totalUnread: 0,
  refreshUnread: () => {},
  clearUnreadFor: () => {},
});

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function SocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(false);
  const [unreadByFriend, setUnreadByFriend] = useState({});

  const refreshUnread = useCallback(async () => {
    try {
      const res = await api.get("/messages/unread/counts");
      setUnreadByFriend(res.data?.byFriend || {});
    } catch {
      /* not fatal */
    }
  }, []);

  const clearUnreadFor = useCallback((friendId) => {
    setUnreadByFriend((m) => {
      if (!m[friendId]) return m;
      const copy = { ...m };
      delete copy[friendId];
      return copy;
    });
  }, []);

  // Open / close the socket as the user logs in / out
  useEffect(() => {
    if (!user) {
      setOnline(false);
      setUnreadByFriend({});
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const s = io(API_BASE, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => setOnline(true));
    s.on("disconnect", () => setOnline(false));
    s.on("connect_error", (err) => {
      console.warn("[socket] connect error:", err.message);
      setOnline(false);
    });

    // Bump unread when a message arrives if the user isn't currently looking at that thread.
    // The Chat page sets window.__activeChatFriendId while a conversation is open.
    s.on("message", ({ message }) => {
      if (!message) return;
      if (message.recipient_id !== user.user_id) return;
      const activeFriendId = window.__activeChatFriendId;
      if (activeFriendId === message.sender_id) return;
      setUnreadByFriend((m) => ({
        ...m,
        [message.sender_id]: (m[message.sender_id] || 0) + 1,
      }));
    });

    setSocket(s);
    refreshUnread();

    return () => {
      s.disconnect();
      setSocket(null);
      setOnline(false);
    };
  }, [user, refreshUnread]);

  const totalUnread = Object.values(unreadByFriend).reduce((a, b) => a + b, 0);

  return (
    <SocketContext.Provider
      value={{
        socket,
        online,
        unreadByFriend,
        totalUnread,
        refreshUnread,
        clearUnreadFor,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
