import { Link, useLocation } from "@tanstack/react-router";
import { Home, Users, Bell, Router as RouterIcon, Settings } from "lucide-react";

const items = [
  { to: "/admin/dashboard", label: "HOME", icon: Home },
  { to: "/admin/workforce", label: "WORKFORCE", icon: Users },
  { to: "/admin/alerts", label: "ALERTS", icon: Bell },
  { to: "/admin/devices", label: "DEVICES", icon: RouterIcon },
  { to: "/admin/settings", label: "SETTINGS", icon: Settings },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-surface border-t border-border z-50">
      <ul className="grid grid-cols-5 px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active =
            pathname === to ||
            (to === "/admin/workforce" && (pathname.startsWith("/admin/workforce") || pathname.startsWith("/admin/employee") || pathname.startsWith("/admin/onboarding") || pathname.startsWith("/admin/rest"))) ||
            (to === "/admin/alerts" && (pathname.startsWith("/admin/alerts") || pathname.startsWith("/admin/support"))) ||
            (to === "/admin/devices" && pathname.startsWith("/admin/devices")) ||
            (to === "/admin/settings" && (pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/billing")));
          return (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center gap-1 py-1 rounded-xl transition-colors"
              >
                <span
                  className={`flex items-center justify-center h-9 w-14 rounded-lg ${
                    active ? "bg-primary text-primary-foreground" : "text-ink-soft"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`text-[10px] font-bold tracking-wider ${active ? "text-ink" : "text-ink-soft"}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
