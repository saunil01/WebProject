import { useState } from "react";
import toast from "react-hot-toast";
import { ShieldCheck, UserPlus } from "lucide-react";
import api from "../api";
import { avatarUrl, initialsOf } from "../utils/avatar";

export default function UserProfileCard({ user }) {
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const initials = initialsOf(user?.username);
  const pic = avatarUrl(user?.avatar);

  const sendRequest = async (e) => {
    e?.stopPropagation?.();
    try {
      setLoading(true);
      await api.post(`/friends/request/${user.user_id}`);
      toast.success(`Friend request sent to ${user.username}.`);
      setRequested(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not send request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-hover p-5 flex flex-col items-center text-center">
      {pic ? (
        <img
          src={pic}
          alt={user.username}
          className="w-20 h-20 rounded-full object-cover mb-3 border border-surface-200 dark:border-surface-700"
        />
      ) : (
        <div className="avatar w-20 h-20 text-xl mb-3">{initials}</div>
      )}
      <div className="flex items-center justify-center gap-1.5 max-w-full">
        <h3 className="font-display font-semibold text-lg truncate">{user.username}</h3>
        {user.role === "admin" && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"
            title="Admin"
          >
            <ShieldCheck size={10} /> Admin
          </span>
        )}
      </div>
      <p className="text-xs text-surface-500 capitalize">
        {[user.gender, user.age ? `${user.age} yrs` : null].filter(Boolean).join(" · ") || "Community member"}
      </p>
      <p className="text-sm text-surface-600 dark:text-surface-300 mt-2 line-clamp-3 min-h-[3.25rem]">
        {user.about_me || <span className="italic text-surface-400">No bio yet.</span>}
      </p>
      <div className="mt-3 flex items-center justify-center gap-3 text-xs text-surface-500">
        <span>😊 {user.happy_count || 0}</span>
        <span>😐 {user.neutral_count || 0}</span>
        <span>😔 {user.sad_count || 0}</span>
      </div>
      <button
        onClick={sendRequest}
        disabled={requested || loading}
        className={requested ? "btn-ghost mt-4 w-full" : "btn-primary mt-4 w-full"}
      >
        <UserPlus size={14} />
        {requested ? "Request sent" : loading ? "Sending..." : "Send friend request"}
      </button>
    </div>
  );
}
