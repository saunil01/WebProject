import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Heart, MessageCircle, Search, UserMinus } from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { avatarUrl, initialsOf } from "../utils/avatar";
import { useConfirm } from "../context/ConfirmContext";
import ConnectTabs from "../components/ConnectTabs";

export default function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  const load = async () => {
    try {
      const res = await api.get("/friends");
      setFriends(res.data || []);
    } catch {
      toast.error("Could not load friends.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (friendId) => {
    const ok = await confirm({
      title: "Remove this friend?",
      message: "You'll no longer see their profile or be able to message them. You can always send a new request later.",
      confirmText: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/friends/remove/${friendId}`);
      setFriends((fs) => fs.filter((f) => f.user_id !== friendId));
      toast.success("Friend removed.");
    } catch {
      toast.error("Could not remove friend.");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.username?.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q)
    );
  }, [friends, query]);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Connect"
        subtitle="Your circle, the wider community, and pending requests."
      />
      <ConnectTabs current="friends" />
      {friends.length > 0 && (
        <div className="mb-4 flex justify-end">
          <div className="relative w-64 max-w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-9"
              placeholder="Search by username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="card p-6">
        {loading ? (
          <p className="text-sm text-surface-500">Loading...</p>
        ) : friends.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="You haven't added any friends yet"
            description="Head to Community to find people and send requests."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`No friend matches "${query}".`}
          />
        ) : (
          <ul className="divide-y divide-surface-200 dark:divide-surface-800">
            {filtered.map((f) => {
              const pic = avatarUrl(f.avatar);
              return (
                <li key={f.user_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {pic ? (
                      <img
                        src={pic}
                        alt={f.username}
                        className="w-10 h-10 rounded-full object-cover border border-surface-200 dark:border-surface-700"
                      />
                    ) : (
                      <div className="avatar w-10 h-10 text-sm">{initialsOf(f.username)}</div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{f.username}</div>
                      <div className="text-xs text-surface-500 truncate">{f.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/chat?with=${f.user_id}`}
                      className="btn-secondary"
                    >
                      <MessageCircle size={14} /> Message
                    </Link>
                    <button
                      onClick={() => remove(f.user_id)}
                      className="btn-ghost text-danger hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      <UserMinus size={14} /> Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
