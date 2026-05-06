import { Link, useLocation } from "@tanstack/react-router";
import { Home, Eye, Bell, BarChart3, User } from "lucide-react";
import logo from "@/assets/logo.png";

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
    <>
      {/* ── Desktop: left sidebar ── */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 bottom-0 w-60 z-30 flex-col bg-white"
        style={{
          borderRight: "1px solid oklch(0.90 0.01 250)",
          boxShadow: "2px 0 12px -4px oklch(0.18 0.04 260 / 0.08)",
        }}
      >
        {/* Brand */}
        <div className="px-5 pt-7 pb-6 flex items-center gap-3" style={{ borderBottom: "1px solid oklch(0.92 0.01 250)" }}>
          <img src={logo} alt="SentinelAI" className="h-9 w-auto object-contain" />
          <div className="flex flex-col leading-tight">
            <span className="text-base font-display font-bold tracking-tight" style={{ color: "oklch(0.18 0.06 260)" }}>SentinelAI</span>
            <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.52 0.10 250)" }}>Workforce</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
          <p className="px-3 mb-2 text-[9px] font-extrabold tracking-[0.2em] uppercase" style={{ color: "oklch(0.65 0.04 255)" }}>Navigation</p>
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                style={active ? {
                  background: "linear-gradient(135deg, oklch(0.52 0.18 250), oklch(0.44 0.16 260))",
                  boxShadow: "0 4px 16px -4px oklch(0.44 0.18 255 / 0.4)",
                  color: "white",
                } : {
                  color: "oklch(0.38 0.04 260)",
                }}
              >
                <span
                  className="flex items-center justify-center h-8 w-8 rounded-lg shrink-0"
                  style={active ? { background: "oklch(1 0 0 / 0.15)" } : { background: "oklch(0.94 0.01 250)" }}
                >
                  <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span className="text-sm font-bold tracking-wide">{label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid oklch(0.92 0.01 250)" }}>
          <div className="flex items-center gap-2.5 px-2">
            <span
              className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, oklch(0.52 0.18 250), oklch(0.44 0.16 260))", flexShrink: 0 }}
            >W</span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[11px] font-bold truncate" style={{ color: "oklch(0.22 0.04 260)" }}>Worker</span>
              <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.60 0.06 255)" }}>User Role</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile: bottom tab bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <li key={to}>
                <Link
                  to={to}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
                >
                  <span className={`flex items-center justify-center h-8 w-10 rounded-lg ${active ? "bg-secondary" : ""}`}>
                    <Icon className={`h-5 w-5 ${active ? "text-navy" : "text-muted-foreground"}`} strokeWidth={active ? 2.4 : 1.8} />
                  </span>
                  <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-navy" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}


