import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { Heart, Search, UserPlus } from "lucide-react";
import { AuthContext } from "../context/AuthContext";

// Shared tab strip rendered at the top of every "people" page. Lets the user
// navigate between Friends / Find people / Requests without the sidebar
// being cluttered with all three.
//
// Drop into a page with: <ConnectTabs current="friends" />
// (or "find" / "requests")

const TABS = [
  { id: "friends",  to: "/friends",          label: "My friends",  icon: Heart },
  { id: "find",     to: "/users",            label: "Find people", icon: Search },
  { id: "requests", to: "/friends/requests", label: "Requests",    icon: UserPlus, badgeKey: "requestCount" },
];

export default function ConnectTabs({ current }) {
  const { requestCount } = useContext(AuthContext);

  return (
    <div className="flex flex-wrap gap-1 mb-5 border-b border-surface-200 dark:border-surface-800">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = t.id === current;
        const badge = t.badgeKey === "requestCount" ? requestCount : 0;
        return (
          <NavLink
            key={t.id}
            to={t.to}
            end={t.id === "friends"}
            className={`-mb-px px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              isActive
                ? "border-primary-500 text-primary-700 dark:text-primary-300"
                : "border-transparent text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100"
            }`}
          >
            <Icon size={14} />
            <span>{t.label}</span>
            {badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-danger text-white text-[10px] font-bold min-w-[18px] text-center">
                {badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}
