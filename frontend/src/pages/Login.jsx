import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Heart, LogIn } from "lucide-react";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectTo = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      return toast.error("Please enter email and password.");
    }
    try {
      setLoading(true);
      const user = await login(form.email.trim(), form.password);
      toast.success("Welcome back!");
      const dest = redirectTo || (user.role === "admin" ? "/admin" : "/dashboard");
      navigate(dest, { replace: true });
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      const fallback = err?.response
        ? `Login failed (HTTP ${err.response.status}).`
        : "Could not reach the server. Is the backend running on port 3000?";
      toast.error(serverMsg || fallback);
      // eslint-disable-next-line no-console
      console.error("[Login]", err?.response?.status, err?.response?.data, err);
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

        <h1 className="text-2xl font-display font-bold">Welcome back</h1>
        <p className="section-subtitle mb-6">
          Sign in to continue caring for your wellbeing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label" htmlFor="password">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary-700 dark:text-primary-300 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                className="input pr-11"
                placeholder="Enter your password"
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

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? "Signing in..." : (<><LogIn size={16} /> Sign in</>)}
          </button>
        </form>

        <p className="text-center text-sm text-surface-600 dark:text-surface-300 mt-6">
          New to MindMate?{" "}
          <Link to="/register" className="text-primary-700 dark:text-primary-300 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
