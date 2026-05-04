import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search, Users } from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ConnectTabs from "../components/ConnectTabs";
import UserProfileCard from "./UserProfileCard";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/users/public");
        setUsers(res.data || []);
      } catch {
        toast.error("Could not load the community.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.about_me?.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Connect"
        subtitle="Your circle, the wider community, and pending requests."
      />
      <ConnectTabs current="find" />
      <div className="mb-4 flex justify-end">
        <div className="relative w-64 max-w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9"
            placeholder="Search by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-surface-500 text-sm">Loading community...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-6">
          <EmptyState
            icon={Users}
            title={users.length === 0 ? "No community members yet" : "No matches"}
            description={users.length === 0 ? "Check back later." : "Try a different keyword."}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u) => (
            <UserProfileCard key={u.user_id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}
