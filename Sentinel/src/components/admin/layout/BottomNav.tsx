import { Link, useLocation } from "@tanstack/react-router";
import {
  Home, Users, Bell, Router as RouterIcon, Settings, Camera,
  FileText, GitBranch, UserPlus, Bug, Activity, LogOut,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const primaryItems = [
  { to: "/admin/dashboard", label: "HOME", icon: Home },
  { to: "/admin/workforce", label: "TEAM", icon: Users },
  { to: "/admin/alerts", label: "ALERTS", icon: Bell },
  { to: "/admin/fatigue-dashboard", label: "FATIGUE", icon: Activity },
  { to: "/admin/settings", label: "SETTINGS", icon: Settings },
] as const;

const sidebarItems = [
  { to: "/admin/dashboard",         label: "Home",             icon: Home,        section: "OVERVIEW" },
  { to: "/admin/workforce",          label: "Workforce",        icon: Users,       section: "OVERVIEW" },
  { to: "/admin/alerts",             label: "Alerts",           icon: Bell,        section: "OVERVIEW" },
  { to: "/admin/fatigue-dashboard",  label: "Fatigue Monitor",  icon: Activity,    section: "MONITORING" },
  { to: "/admin/camera",             label: "Camera Analysis",  icon: Camera,      section: "MONITORING" },
  { to: "/admin/devices",            label: "Devices",          icon: RouterIcon,  section: "MONITORING" },
  { to: "/admin/onboarding",         label: "Register Employee",icon: UserPlus,    section: "MANAGEMENT" },
  { to: "/admin/create-manager",     label: "Create Manager",   icon: UserPlus,    section: "MANAGEMENT" },
  { to: "/admin/hierarchy",          label: "Hierarchy",        icon: GitBranch,   section: "MANAGEMENT" },
  { to: "/admin/reports",            label: "Reports",          icon: FileText,    section: "OPERATIONS" },
  { to: "/admin/support",            label: "Bug Report",       icon: Bug,         section: "OPERATIONS" },
  { to: "/admin/billing",            label: "Billing",          icon: Settings,    section: "ACCOUNT" },
  { to: "/admin/settings",           label: "Settings",         icon: Settings,    section: "ACCOUNT" },
] as const;

const sections = ["OVERVIEW", "MONITORING", "MANAGEMENT", "OPERATIONS", "ACCOUNT"] as const;

function isActive(to: string, pathname: string) {
  if (to === "/admin/dashboard") return pathname === to;
  return pathname.startsWith(to);
}

// Dark navy sidebar color tokens
const C = {
  bg:           "oklch(0.13 0.042 262)",
  bgHover:      "oklch(0.18 0.042 262)",
  bgActive:     "oklch(0.19 0.048 262)",
  border:       "oklch(0.22 0.038 262)",
  sectionLabel: "oklch(0.42 0.03 260)",
  textDefault:  "oklch(0.72 0.018 255)",
  textActive:   "oklch(0.90 0.14 88)",    // gold
  iconBgDefault:"oklch(0.20 0.042 262)",
  iconBgActive: "oklch(0.28 0.08 80)",    // warm gold tint
  gold:         "oklch(0.85 0.16 88)",
  goldBorder:   "oklch(0.72 0.17 80)",
} as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const { profile } = useAuth();

  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Administrator";
  const initials = displayName
    .split(" ").map((n) => n[0] ?? "").slice(0, 2).join("").toUpperCase() || "A";
  const roleLabel = profile?.role === "MANAGER" ? "Manager" : "Admin";

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <>
      {/* ── Desktop: dark sidebar ── */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 bottom-0 w-60 z-30 flex-col"
        style={{ background: C.bg, borderRight: `1px solid ${C.border}` }}
      >
        {/* Brand */}
        <div
          className="px-5 pt-6 pb-5 flex items-center gap-3 shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: "oklch(0.22 0.06 262)", boxShadow: `0 0 0 2px ${C.goldBorder}` }}
          >
            <img src={logo} alt="SentinelAI" className="h-8 w-8 object-contain" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span
              className="text-[15px] font-display font-extrabold tracking-tight"
              style={{ color: "oklch(0.97 0.005 245)" }}
            >
              SentinelAI
            </span>
            <span
              className="text-[9px] font-bold tracking-[0.22em] uppercase"
              style={{ color: C.gold }}
            >
              {roleLabel} Console
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {sections.map((section) => {
            const group = sidebarItems.filter((i) => i.section === section);
            return (
              <div key={section}>
                <p
                  className="px-3 mb-1.5 text-[9px] font-extrabold tracking-[0.24em] uppercase"
                  style={{ color: C.sectionLabel }}
                >
                  {section}
                </p>
                <div className="space-y-0.5">
                  {group.map(({ to, label, icon: Icon }) => {
                    const active = isActive(to, pathname);
                    return (
                      <Link
                        key={to}
                        to={to}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 group"
                        style={active ? {
                          background: C.bgActive,
                          borderLeft: `3px solid ${C.goldBorder}`,
                          color: C.textActive,
                        } : {
                          color: C.textDefault,
                          borderLeft: "3px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) (e.currentTarget as HTMLElement).style.background = C.bgHover;
                        }}
                        onMouseLeave={(e) => {
                          if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <span
                          className="flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-colors"
                          style={active
                            ? { background: C.iconBgActive }
                            : { background: C.iconBgDefault }
                          }
                        >
                          <Icon
                            className="h-3.5 w-3.5"
                            strokeWidth={active ? 2.5 : 1.8}
                            style={{ color: active ? C.gold : C.textDefault }}
                          />
                        </span>
                        <span className="text-[12px] font-semibold">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer — user profile + sign out */}
        <div
          className="px-4 py-4 shrink-0"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-[11px] font-extrabold shrink-0"
              style={{
                background: "linear-gradient(135deg, oklch(0.83 0.17 85), oklch(0.70 0.15 75))",
                color: "oklch(0.18 0.06 70)",
              }}
            >
              {initials}
            </div>
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span
                className="text-[12px] font-bold truncate"
                style={{ color: "oklch(0.88 0.01 250)" }}
              >
                {displayName}
              </span>
              <span
                className="text-[9px] font-semibold tracking-widest uppercase"
                style={{ color: C.gold }}
              >
                {roleLabel} Role
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ color: C.sectionLabel }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.62 0.22 25)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.sectionLabel; }}
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile: bottom tab bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 w-full z-50"
        style={{
          background: C.bg,
          borderTop: `1px solid ${C.border}`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <ul className="grid grid-cols-5 px-1 py-1.5">
          {primaryItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to, pathname);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className="flex flex-col items-center gap-0.5 py-1 rounded-xl transition-colors"
                >
                  <span
                    className="flex items-center justify-center h-9 w-12 rounded-xl transition-colors"
                    style={active
                      ? { background: C.bgActive }
                      : { color: C.textDefault }
                    }
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={active ? 2.4 : 1.8}
                      style={{ color: active ? C.gold : C.textDefault }}
                    />
                  </span>
                  <span
                    className="text-[9px] font-bold tracking-wider"
                    style={{ color: active ? C.gold : C.sectionLabel }}
                  >
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

