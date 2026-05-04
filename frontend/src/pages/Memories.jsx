import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, BookOpen, Clock3, Heart, Sparkles, Wind } from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import LoadingScreen from "../components/LoadingScreen";

const MOOD_EMOJI = {
  happy: "😊",
  neutral: "😐",
  sad: "😔",
  anxious: "😟",
  stressed: "😣",
};

function formatLongDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function timeOnly(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Memories() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/memories");
        setData(res.data || { buckets: [] });
      } catch {
        toast.error("Could not load memories.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingScreen label="Looking back through your days..." />;

  const buckets = data?.buckets || [];

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Memories"
        subtitle={`Things you wrote, felt, or breathed through — on this day in past weeks, months, and years.`}
      />

      {buckets.length === 0 ? (
        <div className="card p-6">
          <EmptyState
            icon={Clock3}
            title="No memories yet"
            description="Once you've used MindMate for a while, this page will surface your past moods, journals, and breathing sessions from this same date in past weeks, months, and years."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {buckets.map((b, i) => (
            <MemoryBucket key={`${b.date}-${i}`} bucket={b} />
          ))}
        </div>
      )}

      {/* Footer note — gentle reminder of what this is */}
      <p className="text-xs text-surface-500 text-center mt-10 leading-relaxed">
        Memories surface entries that happened on this exact date in your past.
        <br />
        New memories appear automatically as time passes.
      </p>
    </div>
  );
}

function MemoryBucket({ bucket }) {
  const moodCount = bucket.moods.length;
  const journalCount = bucket.journals.length;
  const breathingCount = bucket.breathing.length;

  return (
    <section className="card overflow-hidden">
      {/* Bucket header — gradient ribbon */}
      <header className="bg-gradient-to-r from-primary-600 to-accent-500 text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} />
          <div>
            <div className="text-xs uppercase tracking-[0.2em] opacity-80">Memory</div>
            <h3 className="font-display font-bold text-base sm:text-lg leading-tight">
              {bucket.label}
            </h3>
          </div>
        </div>
        <div className="text-right text-xs opacity-90">
          <div>{formatLongDate(bucket.date)}</div>
          <div className="opacity-70">
            {[
              moodCount && `${moodCount} mood${moodCount === 1 ? "" : "s"}`,
              journalCount && `${journalCount} journal${journalCount === 1 ? "" : "s"}`,
              breathingCount && `${breathingCount} session${breathingCount === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      </header>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Moods */}
        {moodCount > 0 && (
          <div>
            <div className="flex items-center gap-2 text-primary-700 dark:text-primary-300 mb-3">
              <Heart size={14} />
              <h4 className="text-sm font-display font-semibold uppercase tracking-wider">
                How you felt
              </h4>
            </div>
            <ul className="space-y-2">
              {bucket.moods.map((m) => (
                <li
                  key={m.mood_id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60"
                >
                  <span className="text-2xl shrink-0" aria-hidden>
                    {MOOD_EMOJI[m.mood_type] || "🙂"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="capitalize font-medium text-sm">{m.mood_type}</div>
                    {m.note && (
                      <p className="text-sm text-surface-600 dark:text-surface-300 mt-1 whitespace-pre-wrap">
                        {m.note}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-surface-500 shrink-0">{timeOnly(m.mood_date)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Journals */}
        {journalCount > 0 && (
          <div>
            <div className="flex items-center gap-2 text-accent-700 dark:text-accent-300 mb-3">
              <BookOpen size={14} />
              <h4 className="text-sm font-display font-semibold uppercase tracking-wider">
                What you wrote
              </h4>
            </div>
            <ul className="space-y-3">
              {bucket.journals.map((j) => (
                <li
                  key={j.journal_id}
                  className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h5 className="font-display font-semibold">
                      {j.title || "(untitled)"}
                    </h5>
                    <div className="text-xs text-surface-500 shrink-0">
                      {timeOnly(j.created_at)}
                    </div>
                  </div>
                  <p className="text-sm text-surface-700 dark:text-surface-200 mt-2 whitespace-pre-wrap line-clamp-6">
                    {j.content}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Breathing */}
        {breathingCount > 0 && (
          <div>
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 mb-3">
              <Wind size={14} />
              <h4 className="text-sm font-display font-semibold uppercase tracking-wider">
                Breath you took
              </h4>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bucket.breathing.map((s) => (
                <li
                  key={s.session_id}
                  className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 text-sm"
                >
                  <div className="font-medium">
                    {s.actual_duration ?? s.duration} min · guided
                  </div>
                  <div className="text-xs text-surface-500 mt-0.5 capitalize">
                    {s.status || "completed"} · {timeOnly(s.session_date)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
