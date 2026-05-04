import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Heart, Mail } from "lucide-react";
import api from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your registered email.");
    try {
      setLoading(true);
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      toast.success("If that email exists, we've sent a reset link.");
      setSent(true);
      if (res.data?.resetLink) window.open(res.data.resetLink, "_blank");
    } catch {
      toast.error("Could not send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-md">
            <Heart size={18} />
          </div>
          <span className="font-display font-bold text-lg">MindMate</span>
        </div>

        <h1 className="text-2xl font-display font-bold">Forgot your password?</h1>
        <p className="section-subtitle mb-6">
          Enter the email linked to your account and we'll send a reset link.
        </p>

        {sent ? (
          <div className="rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 p-4 text-sm text-primary-800 dark:text-primary-200">
            Check your inbox for a password reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? "Sending..." : (<><Mail size={16} /> Send reset link</>)}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-surface-600 dark:text-surface-300 mt-6">
          Remembered it?{" "}
          <Link to="/login" className="text-primary-700 dark:text-primary-300 font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
