import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Building2,
  Banknote,
  AlertOctagon,
  Users,
  AlertTriangle,
  ClipboardList,
  Camera,
  Watch,
  FileText,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { BrandLogo } from "@/components/user/BrandLogo";
import { useState } from "react";

// Core tabs always visible on mobile bottom bar
const coreTabs = [
  { to: "/owner/dashboard", label: "Home", icon: Home },
  { to: "/owner/companies", label: "Companies", icon: Building2 },
  { to: "/owner/revenue", label: "Revenue", icon: Banknote },
  { to: "/owner/issues", label: "Issues", icon: AlertOctagon },
  { to: "/owner/users", label: "Users", icon: Users },
];

// All tabs shown in desktop sidebar, grouped
const sidebarGroups = [
  {
    heading: "Overview",
    items: [
      { to: "/owner/dashboard", label: "Home", icon: Home },
      { to: "/owner/users", label: "Users", icon: Users },
      { to: "/owner/companies", label: "Companies", icon: Building2 },
    ],
  },
  {
    heading: "Financials",
    items: [
      { to: "/owner/revenue", label: "Revenue", icon: Banknote },
      { to: "/owner/subscriptions", label: "Subscriptions", icon: Banknote },
    ],
  },
  {
    heading: "Safety & Monitoring",
    items: [
      { to: "/owner/alerts", label: "Alerts", icon: AlertTriangle },
      { to: "/owner/camera", label: "Camera Analysis", icon: Camera },
      { to: "/owner/iot", label: "IoT Wristbands", icon: Watch },
    ],
  },
  {
    heading: "Operations",
    items: [
      { to: "/owner/issues", label: "Bug Reports", icon: AlertOctagon },
      { to: "/owner/activity", label: "Audit Log", icon: ClipboardList },
      { to: "/owner/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    heading: "Management",
    items: [
      { to: "/owner/create-manager", label: "Create Manager", icon: UserPlus },
      { to: "/owner/settings", label: "Settings", icon: ClipboardList },
    ],
  },
];

export const BottomNav = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  if (pathname === "/" || pathname === "/owner" || pathname === "/owner/login") return null;

  return (
    <>
      {/* ── Desktop: left sidebar ── */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-60 z-30 flex-col bg-white border-r border-border">
        <div className="px-5 py-5 border-b border-border">
          <BrandLogo size="md" />
        </div>
        <ul className="flex-1 flex flex-col gap-0 p-3 pt-3 overflow-y-auto">
          {sidebarGroups.map((group) => (
            <li key={group.heading} className="mb-1">
              <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => {
                  const isActive = pathname === to || pathname.startsWith(to + "/");
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                          isActive
                            ? "bg-gold-soft text-gold font-semibold"
                            : "text-primary/70 hover:bg-gold-soft/50 hover:text-primary"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.4 : 1.8} />
                        <span className="text-sm font-medium tracking-wide">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground">© {new Date().getFullYear()} SentinelAI</p>
        </div>
      </aside>

      {/* ── Mobile: bottom tab bar ── */}
      <>
        {/* "More" drawer for extra pages on mobile */}
        {moreOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/20"
            onClick={() => setMoreOpen(false)}
          >
            <div
              className="absolute bottom-16 left-0 right-0 bg-white border-t border-border rounded-t-2xl px-4 py-5 grid grid-cols-3 gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { to: "/owner/alerts", label: "Alerts", icon: AlertTriangle },
                { to: "/owner/camera", label: "Camera", icon: Camera },
                { to: "/owner/iot", label: "IoT", icon: Watch },
                { to: "/owner/activity", label: "Audit Log", icon: ClipboardList },
                { to: "/owner/reports", label: "Reports", icon: FileText },
                { to: "/owner/subscriptions", label: "Subscriptions", icon: Banknote },
                { to: "/owner/create-manager", label: "New Manager", icon: UserPlus },
                { to: "/owner/settings", label: "Settings", icon: ClipboardList },
              ].map(({ to, label, icon: Icon }) => {
                const isActive = pathname === to || pathname.startsWith(to + "/");
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 py-2 rounded-xl transition-colors ${
                      isActive ? "text-gold" : "text-primary/70"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white z-40 border-t border-border"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="grid grid-cols-6">
            {coreTabs.map(({ to, label, icon: Icon }) => {
              const isActive = pathname === to || pathname.startsWith(to + "/");
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-semibold tracking-wider uppercase transition-colors ${
                      isActive ? "text-gold" : "text-primary/70"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                    <span>{label}</span>
                    {isActive && <span className="h-0.5 w-5 bg-gold rounded-full -mb-1" />}
                  </Link>
                </li>
              );
            })}
            {/* More button */}
            <li>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={`w-full flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-semibold tracking-wider uppercase transition-colors ${
                  moreOpen ? "text-gold" : "text-primary/70"
                }`}
              >
                {moreOpen ? (
                  <ChevronDown className="h-5 w-5" strokeWidth={1.8} />
                ) : (
                  <ChevronUp className="h-5 w-5" strokeWidth={1.8} />
                )}
                <span>More</span>
              </button>
            </li>
          </ul>
        </nav>
      </>
    </>
  );
};

