import { Link, useLocation } from "@tanstack/react-router";
import { Home, Eye, Bell, BarChart3, User } from "lucide-react";

const items = [
  { to: "/user/home", label: "Home", icon: Home },
  { to: "/user/monitoring", label: "Monitoring", icon: Eye },
  { to: "/user/alerts", label: "Alerts", icon: Bell },
  { to: "/user/reports", label: "Reports", icon: BarChart3 },
  { to: "/user/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed top-0 left-0 bottom-0 w-55 z-30 bg-card border-r border-border flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border">
        <div className="font-display font-bold text-xl text-primary">SentinelAI</div>
        <div className="text-xs text-muted-foreground mt-0.5">Fatigue Management</div>
      </div>

      <ul className="flex-1 flex flex-col gap-0.5 p-3 pt-4">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active
                    ? "bg-secondary text-navy font-semibold"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${active ? "text-navy" : ""}`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className="text-sm font-semibold tracking-wide">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

