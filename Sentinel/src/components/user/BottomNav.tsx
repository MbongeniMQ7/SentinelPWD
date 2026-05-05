import { Link, useLocation } from "@tanstack/react-router";
import { Home, Eye, Bell, BarChart3, User } from "lucide-react";

const items = [
  { to: "/user/home", label: "HOME", icon: Home },
  { to: "/user/monitoring", label: "MONITORING", icon: Eye },
  { to: "/user/alerts", label: "ALERTS", icon: Bell },
  { to: "/user/reports", label: "REPORTS", icon: BarChart3 },
  { to: "/user/profile", label: "PROFILE", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="grid grid-cols-5 px-1 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center gap-1 py-1.5 rounded-xl"
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-lg ${
                    active ? "bg-secondary" : ""
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${active ? "text-navy" : "text-muted-foreground"}`}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                </span>
                <span
                  className={`text-[10px] tracking-[0.14em] font-semibold ${
                    active ? "text-navy" : "text-muted-foreground"
                  }`}
                >
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
