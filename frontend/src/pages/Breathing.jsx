import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Pause, Play, Trash2, Wind } from "lucide-react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";

const PHASES = [
  { key: "inhale", label: "Breathe in",  seconds: 4 },
  { key: "hold",   label: "Hold",        seconds: 4 },
  { key: "exhale", label: "Breathe out", seconds: 6 },
];

export default function Breathing() {
  const [sessions, setSessions] = useState([]);
  const [duration, setDuration] = useState(2); // planned minutes
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("ready");
  const [remaining, setRemaining] = useState(0); // seconds left

  // Refs that don't trigger re-renders — used to safely manage timers/save guard
  const countdownRef = useRef(null);
  const phaseRef = useRef(null);
  const elapsedRef = useRef(0);   // seconds completed so far
  const totalRef = useRef(0);     // total planned seconds
  const savedRef = useRef(false); // prevents double-save (Strict Mode + race conditions)

  useEffect(() => {
    load();
    return () => {
      clearInterval(countdownRef.current);
      clearInterval(phaseRef.current);
    };
  }, []);

  const load = async () => {
    try {
      const res = await api.get("/breathing");
      setSessions(res.data || []);
    } catch {
      toast.error("Could not load your breathing history.");
    }
  };

  const startSession = () => {
    if (running) return;

    const total = duration * 60;
    elapsedRef.current = 0;
    totalRef.current = total;
    savedRef.current = false;

    setRunning(true);
    setPhase(PHASES[0].key);
    setRemaining(total);

    let i = 0;
    phaseRef.current = setInterval(() => {
      i = (i + 1) % PHASES.length;
      setPhase(PHASES[i].key);
    }, 4000);

    countdownRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const left = totalRef.current - elapsedRef.current;
      setRemaining(Math.max(0, left));

      if (left <= 0 && !savedRef.current) {
        savedRef.current = true;
        clearInterval(countdownRef.current);
        clearInterval(phaseRef.current);
        setRunning(false);
        setPhase("done");
        // Natural completion — save full planned duration
        saveSession({ actualSeconds: totalRef.current, completed: true });
      }
    }, 1000);
  };

  const stopSession = () => {
    if (!running) return;

    clearInterval(countdownRef.current);
    clearInterval(phaseRef.current);
    setRunning(false);
    setPhase("ready");
    setRemaining(0);

    if (savedRef.current) return; // guards against the case where stop is hit just as auto-complete fires
    savedRef.current = true;

    const actualSeconds = elapsedRef.current;
    if (actualSeconds <= 0) {
      // user hit stop instantly without doing anything — don't record an empty row
      return;
    }
    saveSession({ actualSeconds, completed: false });
  };

  const saveSession = async ({ actualSeconds, completed }) => {
    // Round to whole minutes, minimum 1 so a < 60s session still shows up
    const actualMinutes = Math.max(1, Math.round(actualSeconds / 60));
    try {
      await api.post("/breathing", {
        duration,                       // planned minutes
        actual_duration: actualMinutes, // real minutes practiced
        status: completed ? "completed" : "incomplete",
        type: "guided",
      });
      toast.success(completed ? "Session saved. Well done." : "Partial session saved.");
      load();
    } catch {
      toast.error("Could not save your session.");
    }
  };

  const deleteSession = async (id) => {
    try {
      await api.delete(`/breathing/${id}`);
      setSessions((s) => s.filter((x) => x.session_id !== id));
      toast.success("Session removed.");
    } catch {
      toast.error("Failed to delete session.");
    }
  };

  const circleSize =
    phase === "inhale" ? "w-64 h-64 sm:w-72 sm:h-72"
      : phase === "hold"   ? "w-56 h-56 sm:w-64 sm:h-64"
      : phase === "exhale" ? "w-36 h-36 sm:w-40 sm:h-40"
      : "w-48 h-48 sm:w-52 sm:h-52";

  const phaseLabel =
    phase === "ready" ? "Ready when you are"
      : phase === "done" ? "Well done 🌿"
      : PHASES.find((p) => p.key === phase)?.label || "";

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Guided breathing"
        subtitle="A few slow breaths can settle the mind. Choose a length and follow the rhythm."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Breathing circle */}
        <div className="card p-6 lg:col-span-2 text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <label className="text-sm font-medium text-surface-600 dark:text-surface-300">
              Session length
            </label>
            <select
              className="input w-24"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={running}
            >
              {[1, 2, 3, 5, 10].map((d) => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>

          <div className="relative flex items-center justify-center h-[22rem] w-full">
            <div
              className={`rounded-full transition-all duration-[4000ms] ease-in-out
                          bg-gradient-to-br from-primary-300 to-primary-500
                          opacity-80 shadow-lifted ${circleSize}`}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xl sm:text-2xl font-display font-semibold text-surface-900 dark:text-surface-50">
                {phaseLabel}
              </div>
              {running && (
                <div className="mt-2 text-sm text-surface-600 dark:text-surface-300">
                  {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, "0")} left
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {running ? (
              <button onClick={stopSession} className="btn-secondary">
                <Pause size={16} /> Stop
              </button>
            ) : (
              <button onClick={startSession} className="btn-primary px-6">
                <Play size={16} /> Start breathing
              </button>
            )}
          </div>

          <p className="text-xs text-surface-500 mt-4 max-w-sm">
            Inhale 4s · Hold 4s · Exhale 6s — a simple pattern shown to calm the nervous system.
          </p>
        </div>

        {/* History */}
        <div className="card p-6">
          <h3 className="font-display font-semibold text-lg mb-4">Past sessions</h3>
          {sessions.length === 0 ? (
            <EmptyState
              icon={Wind}
              title="No sessions yet"
              description="Complete your first one and it will appear here."
            />
          ) : (
            <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {sessions.map((s) => {
                const isIncomplete = s.status === "incomplete";
                const shownMinutes = s.actual_duration ?? s.duration;
                return (
                  <li
                    key={s.session_id}
                    className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                        <span>{shownMinutes} min · guided</span>
                        {isIncomplete ? (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                            incomplete
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                            completed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-surface-500">
                        {new Date(s.session_date).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isIncomplete && s.duration && s.duration !== shownMinutes && (
                          <span className="ml-1">· planned {s.duration} min</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSession(s.session_id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-surface-400 hover:text-danger transition"
                      aria-label="Delete session"
                    >
                      <Trash2 size={14} />
                    </button>
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
