import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { BookOpen, PenSquare, Search, Trash2 } from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const composerRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  // Honour ?title= and ?content= URL params for pre-filling the composer
  useEffect(() => {
    const t = searchParams.get("title");
    const c = searchParams.get("content");
    if (t || c) {
      if (t) setTitle(t);
      if (c) setContent(c);
      // Clear the params so a refresh doesn't re-trigger the prefill
      const next = new URLSearchParams(searchParams);
      next.delete("title");
      next.delete("content");
      setSearchParams(next, { replace: true });
      // Smooth-scroll to the composer so the prompt is visible
      setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      const res = await api.get("/journals");
      setEntries(res.data || []);
    } catch {
      toast.error("Could not load your journal.");
    }
  };

  const addEntry = async (e) => {
    e?.preventDefault?.();
    if (!title.trim() || !content.trim()) {
      return toast.error("Give your entry a title and a few words.");
    }
    try {
      setSaving(true);
      await api.post("/journals", { title: title.trim(), content: content.trim() });
      toast.success("Entry saved.");
      setTitle("");
      setContent("");
      load();
    } catch {
      toast.error("Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id) => {
    try {
      await api.delete(`/journals/${id}`);
      setEntries((es) => es.filter((e) => e.journal_id !== id));
      toast.success("Entry removed.");
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  const filtered = entries.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      e.title?.toLowerCase().includes(q) || e.content?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Composer */}
      <div className="lg:col-span-2" ref={composerRef}>
        <PageHeader
          title="Journal"
          subtitle="A quiet space to process your thoughts."
        />
        <form onSubmit={addEntry} className="card p-6 sticky top-4">
          <div className="flex items-center gap-2 mb-4 text-primary-700 dark:text-primary-300">
            <PenSquare size={18} />
            <h3 className="font-display font-semibold text-lg">New entry</h3>
          </div>

          <label className="label">Title</label>
          <input
            className="input"
            placeholder="A short heading"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="label mt-4">What's on your mind?</label>
          <textarea
            rows={8}
            className="input resize-none"
            placeholder="Write freely. No pressure — just you on the page."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <button type="submit" disabled={saving} className="btn-primary w-full mt-4">
            {saving ? "Saving..." : "Save entry"}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 className="section-title">Your entries</h2>
          <div className="relative w-64 max-w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-9"
              placeholder="Search entries..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card p-6">
            <EmptyState
              icon={BookOpen}
              title={entries.length === 0 ? "No entries yet" : "Nothing matches your search"}
              description={
                entries.length === 0
                  ? "When you're ready, jot down a thought on the left."
                  : "Try a different keyword."
              }
            />
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((e) => (
              <li key={e.journal_id} className="card p-5 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-display font-semibold text-lg truncate">
                      {e.title}
                    </h4>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {new Date(e.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteEntry(e.journal_id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-surface-400 hover:text-danger transition"
                    aria-label="Delete entry"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="text-surface-700 dark:text-surface-200 mt-3 whitespace-pre-wrap leading-relaxed">
                  {e.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
