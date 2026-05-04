import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Heart, Sparkles, Wind, X } from "lucide-react";

// Three-card walkthrough that appears once for new users.
//
// Trigger: localStorage flag `mindmate.firstRun = "1"` (set by the Register
// page after successful registration). When the user finishes or skips,
// we set `mindmate.onboarded = "1"` and clear the firstRun flag.
//
// Self-contained — keeps the component tree in App.jsx clean.

const STEPS = [
  {
    icon: Heart,
    accent: "primary",
    title: "Track how you feel",
    body:
      "Log a mood whenever you check in — happy, sad, anxious, however the day finds you. Over time the picture starts to form.",
    cta: "Log my first mood",
    ctaPath: "/mood",
  },
  {
    icon: BookOpen,
    accent: "accent",
    title: "Write when you need space",
    body:
      "Journal entries are private to you. They're for the thoughts that don't fit anywhere else — and the ones you'll want to look back on.",
    cta: "Open Journal",
    ctaPath: "/journal",
  },
  {
    icon: Wind,
    accent: "rose",
    title: "Breathe when you need a reset",
    body:
      "A 1–5 minute guided breathing session can settle your nervous system. We'll keep track of the sessions, you just follow the rhythm.",
    cta: "Try a breath session",
    ctaPath: "/breathing",
  },
];

export default function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // The Register page sets `firstRun = "1"` after a successful signup.
      // Show the tour exactly once per registration — clearing the flag is
      // what marks it "done." (Avoids the previous double-flag bug where a
      // separate `onboarded` flag persisted across users on the same browser.)
      if (localStorage.getItem("mindmate.firstRun") === "1") {
        // Slight delay so the dashboard underneath has rendered.
        setTimeout(() => setOpen(true), 300);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const finish = (path = null) => {
    try {
      localStorage.removeItem("mindmate.firstRun");
    } catch {
      /* ignore */
    }
    setOpen(false);
    if (path) navigate(path);
  };

  if (!open) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  const accentBg = {
    primary: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
    accent: "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  }[s.accent];

  // Portal the modal to <body> so it escapes any transformed ancestor.
  // (The dashboard's <main> uses `animate-fade-in` which sets transform —
  // without the portal the modal would anchor to <main> instead of the viewport.)
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="card max-w-md w-full p-6 sm:p-8 relative">
        <button
          onClick={() => finish()}
          className="absolute top-3 right-3 btn-ghost p-1.5"
          aria-label="Skip onboarding"
        >
          <X size={16} />
        </button>

        {/* Welcome banner on the first card only */}
        {step === 0 && (
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary-700 dark:text-primary-300 mb-3">
            <Sparkles size={12} /> Welcome to MindMate
          </div>
        )}

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${accentBg}`}>
          <Icon size={22} />
        </div>

        <h2 id="onboarding-title" className="font-display font-bold text-2xl mb-2">
          {s.title}
        </h2>
        <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
          {s.body}
        </p>

        {/* Progress dots */}
        <div className="mt-6 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-8 bg-primary-500"
                  : i < step
                  ? "w-1.5 bg-emerald-500"
                  : "w-1.5 bg-surface-200 dark:bg-surface-700"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button onClick={() => finish()} className="btn-ghost text-sm">
            Skip for now
          </button>
          <div className="flex items-center gap-2">
            {!isLast && (
              <button onClick={() => setStep((i) => i + 1)} className="btn-secondary">
                Next <ArrowRight size={14} />
              </button>
            )}
            {isLast ? (
              <button onClick={() => finish(s.ctaPath)} className="btn-primary">
                {s.cta} <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={() => finish(s.ctaPath)} className="btn-primary">
                {s.cta} <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
