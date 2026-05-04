import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, MessageCircle, Search, Send } from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import { avatarUrl, initialsOf } from "../utils/avatar";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " · " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function previewOf(msg, meId) {
  if (!msg) return "Say hello 👋";
  const prefix = msg.sender_id === meId ? "You: " : "";
  const text = (msg.content || "").replace(/\s+/g, " ").trim();
  return prefix + (text.length > 50 ? text.slice(0, 50) + "…" : text);
}

export default function Chat() {
  const { user } = useContext(AuthContext);
  const { socket, online, unreadByFriend, refreshUnread, clearUnreadFor } =
    useContext(SocketContext);

  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");

  const scrollRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFriend = searchParams.get("with");

  const meId = user?.user_id;

  // Load threads (friends + last message + unread counts)
  const loadThreads = async () => {
    try {
      const res = await api.get("/messages/threads");
      setThreads(res.data || []);
    } catch {
      toast.error("Could not load conversations.");
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    loadThreads();
    refreshUnread();
  }, [refreshUnread]);

  // Honour ?with=<friendId> from the URL (e.g., "Message" button on a profile card)
  useEffect(() => {
    if (!queryFriend) return;
    const id = Number(queryFriend);
    if (!Number.isFinite(id)) return;
    setActiveFriendId(id);
  }, [queryFriend]);

  const activeThread = useMemo(
    () => threads.find((t) => t.user_id === activeFriendId) || null,
    [threads, activeFriendId]
  );

  // Track which thread is open (so SocketContext doesn't bump unread for it)
  useEffect(() => {
    window.__activeChatFriendId = activeFriendId;
    return () => {
      window.__activeChatFriendId = null;
    };
  }, [activeFriendId]);

  // Load conversation when active friend changes
  useEffect(() => {
    if (!activeFriendId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingMessages(true);
        const res = await api.get(`/messages/${activeFriendId}`);
        if (!cancelled) setMessages(res.data || []);
        clearUnreadFor(activeFriendId);
        // Tell the backend (and the friend) we've read these
        socket?.emit?.("mark_read", { friend_id: activeFriendId });
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || "Could not load messages.");
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeFriendId, socket, clearUnreadFor]);

  // Listen for incoming + outgoing-echo messages on the socket
  useEffect(() => {
    if (!socket) return;

    const onMessage = ({ message, clientTempId }) => {
      if (!message) return;
      const involvesActive =
        activeFriendId &&
        (message.sender_id === activeFriendId || message.recipient_id === activeFriendId);

      if (involvesActive) {
        setMessages((prev) => {
          // Replace optimistic temp row if its clientTempId matches
          if (clientTempId) {
            const idx = prev.findIndex((m) => m.__tempId === clientTempId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = message;
              return copy;
            }
          }
          // Skip if we already have it (server sometimes echoes both directions)
          if (prev.some((m) => m.message_id === message.message_id)) return prev;
          return [...prev, message];
        });
        // If I'm the recipient on the open chat, mark as read immediately
        if (message.recipient_id === meId) {
          socket.emit("mark_read", { friend_id: activeFriendId });
        }
      }

      // Update sidebar previews regardless
      setThreads((prev) => {
        const friendId =
          message.sender_id === meId ? message.recipient_id : message.sender_id;
        const idx = prev.findIndex((t) => t.user_id === friendId);
        if (idx < 0) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], lastMessage: message };
        // Re-sort by last message
        copy.sort((a, b) => {
          const at = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
          const bt = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
          return bt - at;
        });
        return copy;
      });
    };

    const onReadReceipt = ({ by }) => {
      // The friend read my messages — flip read_at on optimistic UI
      if (by !== activeFriendId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id === meId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m
        )
      );
    };

    socket.on("message", onMessage);
    socket.on("messages_read", onReadReceipt);
    return () => {
      socket.off("message", onMessage);
      socket.off("messages_read", onReadReceipt);
    };
  }, [socket, activeFriendId, meId]);

  // Autoscroll on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, activeFriendId]);

  const send = (e) => {
    e?.preventDefault?.();
    const text = draft.trim();
    if (!text || !activeFriendId) return;
    if (!socket || !online) {
      return toast.error("Not connected. Try again in a moment.");
    }

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      __tempId: tempId,
      message_id: tempId,
      sender_id: meId,
      recipient_id: activeFriendId,
      content: text,
      created_at: new Date().toISOString(),
      read_at: null,
      __pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);

    socket
      .timeout(8000)
      .emit("send_message", { recipient_id: activeFriendId, content: text, clientTempId: tempId },
        (err, ack) => {
          setSending(false);
          if (err || !ack?.ok) {
            // Revert the optimistic row
            setMessages((prev) => prev.filter((m) => m.__tempId !== tempId));
            toast.error(ack?.error || "Could not send. Try again.");
          }
        }
      );
  };

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) => t.username?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q)
    );
  }, [threads, query]);

  const openThread = (id) => {
    setActiveFriendId(id);
    setSearchParams((sp) => {
      const next = new URLSearchParams(sp);
      next.set("with", String(id));
      return next;
    });
  };

  const backToList = () => {
    setActiveFriendId(null);
    setSearchParams((sp) => {
      const next = new URLSearchParams(sp);
      next.delete("with");
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Messages"
        subtitle={
          online
            ? "Real-time chat with your friends."
            : "Connecting to chat server..."
        }
      />

      <div className="card overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[36rem]">
          {/* Sidebar (threads) */}
          <aside
            className={`border-r border-surface-200 dark:border-surface-800 ${
              activeFriendId ? "hidden md:flex" : "flex"
            } flex-col`}
          >
            <div className="p-3 border-b border-surface-200 dark:border-surface-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  className="input pl-9"
                  placeholder="Search friends..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingThreads ? (
                <p className="text-sm text-surface-500 p-4">Loading...</p>
              ) : threads.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={MessageCircle}
                    title="No friends to message yet"
                    description="Add friends from Community to start chatting."
                  />
                </div>
              ) : filteredThreads.length === 0 ? (
                <p className="text-sm text-surface-500 p-4">No matches.</p>
              ) : (
                <ul>
                  {filteredThreads.map((t) => {
                    const pic = avatarUrl(t.avatar);
                    const isActive = t.user_id === activeFriendId;
                    const unread = unreadByFriend[t.user_id] || 0;
                    return (
                      <li key={t.user_id}>
                        <button
                          onClick={() => openThread(t.user_id)}
                          className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-surface-100 dark:border-surface-800
                            ${isActive
                              ? "bg-primary-50 dark:bg-primary-900/20"
                              : "hover:bg-surface-50 dark:hover:bg-surface-800/40"}`}
                        >
                          {pic ? (
                            <img
                              src={pic}
                              alt={t.username}
                              className="w-10 h-10 rounded-full object-cover border border-surface-200 dark:border-surface-700"
                            />
                          ) : (
                            <div className="avatar w-10 h-10 text-sm">{initialsOf(t.username)}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className={`text-sm truncate ${unread > 0 ? "font-bold" : "font-medium"}`}>
                                {t.username}
                              </div>
                              {t.lastMessage && (
                                <div className="text-[10px] text-surface-500 shrink-0">
                                  {formatTime(t.lastMessage.created_at)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <div className={`text-xs truncate ${unread > 0 ? "text-surface-800 dark:text-surface-100" : "text-surface-500"}`}>
                                {previewOf(t.lastMessage, meId)}
                              </div>
                              {unread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-primary-600 text-white text-[10px] font-bold min-w-[18px] text-center">
                                  {unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Active conversation */}
          <section className={`${activeFriendId ? "flex" : "hidden md:flex"} flex-col min-w-0`}>
            {!activeThread ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <EmptyState
                  icon={MessageCircle}
                  title="Pick a conversation"
                  description="Choose a friend from the list to start chatting."
                />
              </div>
            ) : (
              <>
                {/* Conversation header */}
                <header className="h-14 px-4 flex items-center gap-3 border-b border-surface-200 dark:border-surface-800">
                  <button
                    className="md:hidden btn-ghost p-1.5"
                    onClick={backToList}
                    aria-label="Back"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  {avatarUrl(activeThread.avatar) ? (
                    <img
                      src={avatarUrl(activeThread.avatar)}
                      alt={activeThread.username}
                      className="w-9 h-9 rounded-full object-cover border border-surface-200 dark:border-surface-700"
                    />
                  ) : (
                    <div className="avatar w-9 h-9 text-xs">{initialsOf(activeThread.username)}</div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{activeThread.username}</div>
                    <div className="text-xs text-surface-500 truncate">
                      {online ? "Connected" : "Reconnecting..."}
                    </div>
                  </div>
                </header>

                {/* Message list */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-4 py-5 space-y-2 bg-surface-50/50 dark:bg-surface-900/30"
                >
                  {loadingMessages ? (
                    <p className="text-sm text-surface-500">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-surface-500 text-center mt-10">
                      No messages yet — say hi 👋
                    </p>
                  ) : (
                    messages.map((m, i) => {
                      const mine = m.sender_id === meId;
                      const prev = messages[i - 1];
                      const showTime =
                        !prev ||
                        new Date(m.created_at) - new Date(prev.created_at) > 5 * 60 * 1000;
                      return (
                        <div key={m.message_id} className="flex flex-col">
                          {showTime && (
                            <div className="text-center text-[11px] text-surface-400 my-2">
                              {formatTime(m.created_at)}
                            </div>
                          )}
                          <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm
                                ${mine
                                  ? "bg-primary-600 text-white rounded-br-md"
                                  : "bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 rounded-bl-md"}
                                ${m.__pending ? "opacity-60" : ""}`}
                            >
                              {m.content}
                              {mine && (
                                <div className="text-[10px] mt-1 opacity-80 text-right">
                                  {m.__pending ? "sending..." : m.read_at ? "Read" : "Sent"}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Composer */}
                <form
                  onSubmit={send}
                  className="border-t border-surface-200 dark:border-surface-800 p-3 flex items-center gap-2"
                >
                  <input
                    className="input flex-1"
                    placeholder={online ? "Write a message..." : "Connecting..."}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={!online}
                    maxLength={2000}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!draft.trim() || sending || !online}
                  >
                    <Send size={14} /> Send
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
