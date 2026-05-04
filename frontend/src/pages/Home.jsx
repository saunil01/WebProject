import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Heart,
  ShieldCheck,
  Sparkles,
  Wind,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Heart,
      title: "Daily mood tracking",
      text: "Log how you feel and notice patterns across weeks, months, and seasons.",
    },
    {
      icon: BookOpen,
      title: "Private journaling",
      text: "A calm, distraction-free place to write. Your entries stay yours.",
    },
    {
      icon: Wind,
      title: "Guided breathing",
      text: "Short, timed breathing exercises to ease stress and anxiety in minutes.",
    },
    {
      icon: Activity,
      title: "Wellness insights",
      text: "Visualize your emotional trends with clear, gentle charts.",
    },
    {
      icon: ShieldCheck,
      title: "Private & secure",
      text: "Your data is protected and only visible to you — never shared.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white
                    dark:from-surface-950 dark:via-surface-950 dark:to-surface-950">
      {/* Top nav */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-md">
            <Heart size={18} />
          </div>
          <span className="font-display font-bold text-surface-900 dark:text-surface-50 text-lg">
            MindMate
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => navigate("/login")}>
            Sign in
          </button>
          <button className="btn-primary" onClick={() => navigate("/register")}>
            Get started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-20 text-center">
        <div className="inline-flex items-center gap-2 badge-primary mb-6">
          <Sparkles size={14} />
          Your everyday mental wellness companion
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold
                       text-surface-900 dark:text-surface-50 leading-[1.1] tracking-tight">
          Care for your mind,
          <br />
          <span className="text-primary-600">one calm breath at a time.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-surface-600 dark:text-surface-300 text-lg">
          MindMate helps you track moods, write in a private journal, practice
          guided breathing, and see the bigger picture of your emotional health — all in one
          gentle, clinician-inspired experience.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button className="btn-primary px-6 py-3 text-base" onClick={() => navigate("/register")}>
            Create free account
            <ArrowRight size={16} />
          </button>
          <button className="btn-secondary px-6 py-3 text-base" onClick={() => navigate("/login")}>
            I already have an account
          </button>
        </div>
        <p className="mt-4 text-xs text-surface-500">
          Not a substitute for professional medical advice.
        </p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card card-hover p-6">
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600
                              dark:bg-primary-900/30 dark:text-primary-300
                              flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="font-display font-semibold text-surface-900 dark:text-surface-50">
                {title}
              </h3>
              <p className="text-sm text-surface-600 dark:text-surface-300 mt-1.5 leading-relaxed">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl bg-gradient-to-r from-primary-600 to-accent-600
                        text-white p-10 md:p-14 shadow-lifted text-center">
          <h2 className="text-3xl md:text-4xl font-display font-extrabold">
            Your wellbeing deserves the same care as your physical health.
          </h2>
          <p className="opacity-90 mt-3 max-w-2xl mx-auto">
            Join thousands of people using MindMate to build steady,
            sustainable habits for a calmer mind.
          </p>
          <button
            onClick={() => navigate("/register")}
            className="mt-6 inline-flex items-center gap-2 bg-white text-primary-700
                       font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 transition"
          >
            Start for free
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <footer className="border-t border-surface-200 dark:border-surface-800 py-6 text-center text-sm text-surface-500">
        © {new Date().getFullYear()} MindMate · Built with care
      </footer>
    </div>
  );
}
