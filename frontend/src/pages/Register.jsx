import { useContext, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, Eye, EyeOff, Heart, UserPlus } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { suggestEmailFix } from "../utils/emailTypo";

export default function Register() {
  const navigate = useNavigate();
  const { register, login } = useContext(AuthContext);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailDismissed, setEmailDismissed] = useState(false);

  // Show a "did you mean..." chip only when there's a suggestion *and* the
  // user hasn't already dismissed it for this exact email.
  const emailSuggestion = useMemo(() => {
    if (emailDismissed) return null;
    return suggestEmailFix(form.email);
  }, [form.email, emailDismissed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      return toast.error("All fields are required.");
    }
    if (form.password.length < 6) {
      return toast.error("Password should be at least 6 characters.");
    }
    if (form.password !== form.confirmPassword) {
      return toast.error("Passwords do not match.");
    }
    // Block submit if there's a likely email typo and the user hasn't dismissed
    // the suggestion. Forces them to either accept the suggestion or click "Use anyway".
    if (emailSuggestion) {
      return toast.error(
        `Looks like a typo — did you mean ${emailSuggestion}? Pick from the suggestion below.`
      );
    }
    try {
      setLoading(true);
      await register(form.username.trim(), form.email.trim(), form.password);
      // Auto-login: drop the user straight into the app instead of bouncing
      // them back to a login screen with credentials they just entered.
      await login(form.email.trim(), form.password);
      // Trigger the onboarding walkthrough on first dashboard load.
      try {
        localStorage.setItem("mindmate.firstRun", "1");
      } catch { /* ignore */ }
      toast.success("Welcome to MindMate.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      const fallback = err?.response
        ? `Registration failed (HTTP ${err.response.status}).`
        : "Could not reach the server. Is the backend running on port 3000?";
      toast.error(serverMsg || fallback);
      // Also surface the raw error in DevTools so you can see what really happened
      // eslint-disable-next-line no-console
      console.error("[Register]", err?.response?.status, err?.response?.data, err);
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

        <h1 className="text-2xl font-display font-bold">Create your account</h1>
        <p className="section-subtitle mb-6">
          Start your journey toward a calmer, healthier mind.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="username">Full name</label>
            <input
              id="username"
              className="input"
              placeholder="e.g. Priya Shah"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setEmailDismissed(false);
              }}
            />
            {emailSuggestion && (
              <div className="mt-2 flex items-start gap-2 text-xs">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  Did you mean{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, email: emailSuggestion }));
                      setEmailDismissed(true);
                    }}
                    className="font-semibold text-primary-700 dark:text-primary-300 hover:underline"
                  >
                    {emailSuggestion}
                  </button>
                  ?{" "}
                  <button
                    type="button"
                    onClick={() => setEmailDismissed(true)}
                    className="text-surface-500 hover:underline"
                  >
                    Use what I typed
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                className="input pr-11"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-surface-500 hover:text-surface-700"
                aria-label="Toggle password visibility"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type={showPw ? "text" : "password"}
              className="input"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? "Creating..." : (<><UserPlus size={16} /> Create account</>)}
          </button>
        </form>

        <p className="text-center text-sm text-surface-600 dark:text-surface-300 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-700 dark:text-primary-300 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
