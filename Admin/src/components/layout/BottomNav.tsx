import { Link, useLocation } from "@tanstack/react-router";
import { Home, Users, Bell, Router as RouterIcon, Settings } from "lucide-react";

const items = [
  { to: "/dashboard", label: "HOME", icon: Home },
  { to: "/workforce", label: "WORKFORCE", icon: Users },
  { to: "/alerts", label: "ALERTS", icon: Bell },
  { to: "/devices", label: "DEVICES", icon: RouterIcon },
  { to: "/settings", label: "SETTINGS", icon: Settings },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface border-t border-border z-50">
      <ul className="grid grid-cols-5 px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active =
            pathname === to ||
            (to === "/workforce" && (pathname.startsWith("/workforce") || pathname.startsWith("/employee") || pathname.startsWith("/onboarding") || pathname.startsWith("/rest"))) ||
            (to === "/alerts" && (pathname.startsWith("/alerts") || pathname.startsWith("/support"))) ||
            (to === "/devices" && pathname.startsWith("/devices")) ||
            (to === "/settings" && (pathname.startsWith("/settings") || pathname.startsWith("/billing")));
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
