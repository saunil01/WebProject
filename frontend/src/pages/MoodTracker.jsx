import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Coffee, Dumbbell, Heart, Moon, Trash2 } from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";

const MOODS = [
  { key: "happy",    label: "Happy",    emoji: "😊", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "neutral",  label: "Neutral",  emoji: "😐", color: "bg-slate-50 text-slate-700 border-slate-200" },
  { key: "sad",      label: "Sad",      emoji: "😔", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "anxious",  label: "Anxious",  emoji: "😟", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "stressed", label: "Stressed", emoji: "😣", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

export default function MoodTracker() {
  const [moods, setMoods] = useState([]);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Optional lifestyle fields — drive the correlations panel on the Insights page.
  const [showLifestyle, setShowLifestyle] = useState(false);
  const [sleepHours, setSleepHours] = useState("");
  const [exercised, setExercised] = useState(null); // null | true | false
  const [caffeineCups, setCaffeineCups] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/moods");
      setMoods(res.data || []);
    } catch {
      toast.error("Could not load mood history.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addMood = async () => {
    if (!selected) return toast.error("Please select how you're feeling.");
    try {
      setSaving(true);
      const payload = {
        mood_type: selected,
        note,
      };
      // Only include lifestyle fields if the user actually filled them in,
      // so we don't overwrite "I didn't say" with zeros.
      if (sleepHours !== "") payload.sleep_hours = Number(sleepHours);
      if (exercised !== null) payload.exercised = exercised;
      if (caffeineCups !== "") payload.caffeine_cups = Number(caffeineCups);

      await api.post("/moods", payload);
      toast.success("Mood saved.");
      setNote("");
      setSelected("");
      setSleepHours("");
      setExercised(null);
      setCaffeineCups("");
      setShowLifestyle(false);
      load();
    } catch {
      toast.error("Failed to save mood.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMood = async (id) => {
    try {
      await api.delete(`/moods/${id}`);
      setMoods((ms) => ms.filter((m) => m.mood_id !== id));
      toast.success("Entry removed.");
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Mood Tracker"
        subtitle="Check in with yourself. Small moments of reflection add up."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Log a mood */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="text-primary-600" size={18} />
            <h3 className="font-display font-semibold text-lg">How are you feeling?</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
            {MOODS.map((m) => {
              const active = selected === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelected(m.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition
                    ${active
                      ? "border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-100"
                      : "border-surface-200 bg-white hover:bg-surface-50 text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-surface-800 dark:text-surface-200"}`}
                >
                  <span className="text-2xl" aria-hidden>{m.emoji}</span>
                  {m.label}
                </button>
              );
            })}
          </div>

          <label className="label">Note (optional)</label>
          <textarea
            rows={3}
            className="input resize-none"
            placeholder="What's on your mind?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {/* Lifestyle (optional, collapsed by default) */}
          <button
            type="button"
            onClick={() => setShowLifestyle((v) => !v)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline"
          >
            {showLifestyle ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showLifestyle ? "Hide" : "Add"} lifestyle details (optional)
          </button>

          {showLifestyle && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/40">
              {/* Sleep */}
              <div>
                <label className="text-xs font-semibold text-surface-600 dark:text-surface-300 flex items-center gap-1.5">
                  <Moon size={14} /> Sleep last night
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={1}
                    placeholder="7"
                    className="input"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                  />
                  <span className="text-xs text-surface-500">hrs</span>
                </div>
              </div>

              {/* Exercise */}
              <div>
                <label className="text-xs font-semibold text-surface-600 dark:text-surface-300 flex items-center gap-1.5">
                  <Dumbbell size={14} /> Exercise today?
                </label>
                <div className="flex items-center gap-1.5 mt-1">
                  {[
                    { val: true, label: "Yes" },
                    { val: false, label: "No" },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      type="button"
                      onClick={() => setExercised(exercised === opt.val ? null : opt.val)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                        exercised === opt.val
                          ? "border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-100"
                          : "border-surface-200 bg-white hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-surface-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caffeine */}
              <div>
                <label className="text-xs font-semibold text-surface-600 dark:text-surface-300 flex items-center gap-1.5">
                  <Coffee size={14} /> Caffeine
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    placeholder="2"
                    className="input"
                    value={caffeineCups}
                    onChange={(e) => setCaffeineCups(e.target.value)}
                  />
                  <span className="text-xs text-surface-500">cups</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={addMood}
              disabled={saving || !selected}
              className="btn-primary px-6"
            >
              {saving ? "Saving..." : "Log mood"}
            </button>
          </div>

        </div>

        {/* History */}
        <div className="card p-6">
          <h3 className="font-display font-semibold text-lg mb-4">Recent entries</h3>
          {moods.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No entries yet"
              description="Log your first mood to start seeing your patterns."
            />
          ) : (
            <ul className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
              {moods.map((m) => {
                const mood = MOODS.find((x) => x.key === m.mood_type);
                return (
                  <li
                    key={m.mood_id}
                    className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{mood?.emoji || "🙂"}</span>
                        <div>
                          <div className="capitalize font-medium">{m.mood_type}</div>
                          <div className="text-xs text-surface-500">
                            {new Date(m.mood_date).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMood(m.mood_id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-surface-400 hover:text-danger transition"
                        aria-label="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {m.note && (
                      <p className="text-sm text-surface-600 dark:text-surface-300 mt-2">
                        {m.note}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
