import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, UserPlus, X } from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { AuthContext } from "../context/AuthContext";
import { avatarUrl, initialsOf } from "../utils/avatar";
import ConnectTabs from "../components/ConnectTabs";

export default function FriendRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { loadRequestCount } = useContext(AuthContext);

  const load = async () => {
    try {
      const res = await api.get("/friends/received");
      setRequests(res.data || []);
    } catch {
      toast.error("Could not load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id, action) => {
    try {
      await api.post(`/friends/${action}/${id}`);
      toast.success(action === "accept" ? "Request accepted." : "Request declined.");
      setRequests((rs) => rs.filter((r) => r.request_id !== id));
      loadRequestCount?.();
    } catch {
      toast.error("Action failed.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Connect"
        subtitle="Your circle, the wider community, and pending requests."
      />
      <ConnectTabs current="requests" />

      <div className="card p-6">
        {loading ? (
          <p className="text-sm text-surface-500">Loading...</p>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No pending requests"
            description="You're all caught up."
          />
        ) : (
          <ul className="divide-y divide-surface-200 dark:divide-surface-800">
            {requests.map((r) => {
              const initials = initialsOf(r.username);
              const pic = avatarUrl(r.avatar);
              return (
                <li key={r.request_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {pic ? (
                      <img
                        src={pic}
                        alt={r.username}
                        className="w-10 h-10 rounded-full object-cover border border-surface-200 dark:border-surface-700"
                      />
                    ) : (
                      <div className="avatar w-10 h-10 text-sm">{initials}</div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.username}</div>
                      <div className="text-xs text-surface-500 truncate">{r.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => act(r.request_id, "accept")} className="btn-primary">
                      <Check size={14} /> Accept
                    </button>
                    <button onClick={() => act(r.request_id, "reject")} className="btn-ghost text-danger">
                      <X size={14} /> Decline
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
