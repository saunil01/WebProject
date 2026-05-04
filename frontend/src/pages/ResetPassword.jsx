import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Heart, KeyRound } from "lucide-react";
import api from "../api";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailFromQuery = params.get("email");
    if (emailFromQuery) setEmail(emailFromQuery);
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");

    try {
      setLoading(true);
      const res = await api.post(`/auth/reset-password/${token}`, {
        email: email.trim(),
        newPassword,
      });
      toast.success(res.data?.message || "Password reset! Please sign in.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not reset password.");
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

        <h1 className="text-2xl font-display font-bold">Set a new password</h1>
        <p className="section-subtitle mb-6">
          {email ? `Resetting password for ${email}` : "Enter your new password below."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!email && (
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="label" htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              className="input"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? "Saving..." : (<><KeyRound size={16} /> Reset password</>)}
          </button>
        </form>

        <p className="text-center text-sm text-surface-600 dark:text-surface-300 mt-6">
          <Link to="/login" className="text-primary-700 dark:text-primary-300 font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
