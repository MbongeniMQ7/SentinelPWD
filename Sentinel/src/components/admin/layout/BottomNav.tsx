import { Link, useLocation } from "@tanstack/react-router";
import { Home, Users, Bell, Router as RouterIcon, Settings, Camera, FileText, GitBranch, UserPlus, Bug } from "lucide-react";
import logo from "@/assets/logo.png";

const primaryItems = [
  { to: "/admin/dashboard", label: "HOME", icon: Home },
  { to: "/admin/workforce", label: "WORKFORCE", icon: Users },
  { to: "/admin/alerts", label: "ALERTS", icon: Bell },
  { to: "/admin/devices", label: "DEVICES", icon: RouterIcon },
  { to: "/admin/settings", label: "SETTINGS", icon: Settings },
] as const;

const sidebarItems = [
  { to: "/admin/dashboard", label: "Home", icon: Home, section: "OVERVIEW" },
  { to: "/admin/workforce", label: "Workforce", icon: Users, section: "OVERVIEW" },
  { to: "/admin/alerts", label: "Alerts", icon: Bell, section: "OVERVIEW" },
  { to: "/admin/camera", label: "Camera Analysis", icon: Camera, section: "MONITORING" },
  { to: "/admin/devices", label: "Devices", icon: RouterIcon, section: "MONITORING" },
  { to: "/admin/onboarding", label: "Register Employee", icon: UserPlus, section: "MANAGEMENT" },
  { to: "/admin/create-manager", label: "Create Manager", icon: UserPlus, section: "MANAGEMENT" },
  { to: "/admin/hierarchy", label: "Hierarchy", icon: GitBranch, section: "MANAGEMENT" },
  { to: "/admin/reports", label: "Reports", icon: FileText, section: "OPERATIONS" },
  { to: "/admin/support", label: "Bug Report", icon: Bug, section: "OPERATIONS" },
  { to: "/admin/billing", label: "Billing", icon: Settings, section: "ACCOUNT" },
  { to: "/admin/settings", label: "Settings", icon: Settings, section: "ACCOUNT" },
] as const;

const sections = ["OVERVIEW", "MONITORING", "MANAGEMENT", "OPERATIONS", "ACCOUNT"] as const;

function isActive(to: string, pathname: string) {
  if (to === "/admin/dashboard") return pathname === to;
  return pathname.startsWith(to);
}

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
            <span className="text-base font-display font-bold tracking-tight" style={{ color: "oklch(0.18 0.04 260)" }}>SentinelAI</span>
            <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.60 0.12 85)" }}>Admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
          {sections.map((section) => {
            const group = sidebarItems.filter((i) => i.section === section);
            return (
              <div key={section} className="mb-2">
                <p className="px-3 mb-1 text-[9px] font-extrabold tracking-[0.2em] uppercase" style={{ color: "oklch(0.65 0.04 255)" }}>{section}</p>
                {group.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to, pathname);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150"
                      style={active ? {
                        background: "oklch(0.95 0.06 85)",
                        borderLeft: "3px solid oklch(0.72 0.17 80)",
                        color: "oklch(0.30 0.08 70)",
                      } : {
                        color: "oklch(0.38 0.03 260)",
                        borderLeft: "3px solid transparent",
                      }}
                    >
                      <span
                        className="flex items-center justify-center h-7 w-7 rounded-lg shrink-0"
                        style={active
                          ? { background: "oklch(0.88 0.10 82)" }
                          : { background: "oklch(0.94 0.01 250)" }
                        }
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.4 : 1.8} />
                      </span>
                      <span className="text-[12px] font-bold tracking-wide">{label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid oklch(0.92 0.01 250)" }}>
          <div className="flex items-center gap-2.5 px-2">
            <span
              className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0"
              style={{ background: "linear-gradient(135deg, oklch(0.83 0.17 85), oklch(0.75 0.15 75))", color: "oklch(0.20 0.06 70)" }}
            >A</span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[11px] font-bold truncate" style={{ color: "oklch(0.22 0.04 260)" }}>Administrator</span>
              <span className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.60 0.06 255)" }}>Admin Role</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile: bottom tab bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-surface border-t border-border z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5 px-2 py-2">
          {primaryItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to, pathname);
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
    </>
  );
}

