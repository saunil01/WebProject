import { useContext, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { avatarUrl, initialsOf } from "../utils/avatar";
import {
  Activity,
  BookOpen,
  ClipboardList,
  Clock3,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  Users,
  UserCircle2,
  X,
  Wind,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import { SocketContext } from "../context/SocketContext";

const userNav = [
  { to: "/dashboard", label: "Overview",     icon: LayoutDashboard },
  { to: "/mood",      label: "Mood Tracker", icon: Heart },
  { to: "/journal",   label: "Journal",      icon: BookOpen },
  { to: "/breathing", label: "Breathing",    icon: Wind },
  { to: "/insights",  label: "Insights",     icon: Activity },
  { to: "/memories",  label: "Memories",     icon: Clock3 },
  // "Connect" is the single entry that consolidates Community / Friends /
  // Requests into one page with internal tabs. Reduces sidebar density.
  { to: "/friends",   label: "Connect",      icon: Users, badgeKey: "requestCount" },
  { to: "/chat",      label: "Messages",     icon: MessageCircle, badgeKey: "totalUnread" },
  { to: "/profile",   label: "Profile",      icon: UserCircle2 },
];

const adminNav = [
  { to: "/admin",          label: "Dashboard",      icon: LayoutDashboard },
  { to: "/admin/users",    label: "Manage Users",   icon: Users },
  { to: "/admin/journals", label: "Journals",       icon: BookOpen },
  { to: "/admin/insights", label: "Moods Data",     icon: Activity },
  { to: "/admin/audit",    label: "Audit Log",      icon: ClipboardList },
];

export default function AppLayout({ admin = false }) {
  const { user, logout, requestCount } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { totalUnread } = useContext(SocketContext);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = admin ? adminNav : userNav;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = initialsOf(user?.username);
  const avatar = avatarUrl(user?.avatar);

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
      {/* Sidebar — fixed off-canvas on mobile, sticky-to-viewport on desktop
          so it doesn't scroll with the page. */}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen lg:flex-shrink-0 z-40 inset-y-0 left-0 w-72
          bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800
          flex flex-col transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-md">
              <Heart size={18} />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-surface-900 dark:text-surface-50">
                MindMate
              </div>
              <div className="text-[11px] uppercase tracking-wider text-surface-500">
                {admin ? "Admin" : "Wellness"}
              </div>
            </div>
          </div>
          <button
            className="lg:hidden btn-ghost px-2 py-1"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/admin"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                       ${isActive
                         ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
                         : "text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-50"}`
                    }
                  >
                    <Icon size={17} />
                    <span className="flex-1">{item.label}</span>
                    {item.badgeKey === "requestCount" && requestCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-danger text-white text-[10px] font-bold min-w-[20px] text-center">
                        {requestCount}
                      </span>
                    )}
                    {item.badgeKey === "totalUnread" && totalUnread > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-primary-600 text-white text-[10px] font-bold min-w-[20px] text-center">
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* Secondary actions */}
          {!admin && user?.role === "admin" && (
            <div className="mt-6">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-surface-400 mb-2">
                Staff
              </div>
              <NavLink
                to="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                           text-surface-600 hover:bg-surface-100 hover:text-surface-900
                           dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-50"
              >
                <ShieldCheck size={17} />
                Open Admin Panel
              </NavLink>
            </div>
          )}
          {admin && (
            <div className="mt-6">
              <NavLink
                to="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                           text-surface-600 hover:bg-surface-100 hover:text-surface-900
                           dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-50"
              >
                <Home size={17} />
                Back to App
              </NavLink>
            </div>
          )}
        </nav>

        {/* Footer / user */}
        <div className="p-4 border-t border-surface-200 dark:border-surface-800 flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={user?.username || "Profile"}
              className="w-10 h-10 rounded-full object-cover border border-surface-200 dark:border-surface-700"
            />
          ) : (
            <div className="avatar w-10 h-10 text-sm">{initials || "MM"}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
              {user?.username || "Guest"}
            </div>
            <div className="text-xs text-surface-500 truncate">{user?.email || ""}</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost p-2"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-surface-900/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white/80 dark:bg-surface-900/70 backdrop-blur
                           border-b border-surface-200 dark:border-surface-800
                           flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost p-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <div className="text-[11px] uppercase tracking-wider text-surface-500">
                {admin ? "Admin Console" : "Welcome back"}
              </div>
              <div className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                {user?.username ? `Hi, ${user.username.split(" ")[0]}` : "Hi there"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="btn-ghost p-2"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {!admin && (
              <NavLink to="/profile" className="btn-ghost p-2" title="Settings">
                <Settings2 size={18} />
              </NavLink>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
