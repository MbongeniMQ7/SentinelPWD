import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, Banknote, AlertOctagon } from "lucide-react";
import { BrandLogo } from "@/components/user/BrandLogo";

const tabs = [
  { to: "/owner/dashboard", label: "Home", icon: Home },
  { to: "/owner/companies", label: "Companies", icon: Building2 },
  { to: "/owner/revenue", label: "Revenue", icon: Banknote },
  { to: "/owner/issues", label: "Issues", icon: AlertOctagon },
];

export const BottomNav = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/" || pathname === "/owner" || pathname === "/owner/login") return null;
  return (
    <>
      {/* ── Desktop: left sidebar ── */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-60 z-30 flex-col bg-white border-r border-border">
        <div className="px-5 py-5 border-b border-border">
          <BrandLogo size="md" />
        </div>
        <ul className="flex-1 flex flex-col gap-0.5 p-3 pt-4 overflow-y-auto">
          {tabs.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || pathname.startsWith(to + "/");
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-gold-soft text-gold font-semibold"
                      : "text-primary/70 hover:bg-gold-soft/50 hover:text-primary"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span className="text-sm font-semibold tracking-wide">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground">© {new Date().getFullYear()} SentinelAI</p>
        </div>
      </aside>

      {/* ── Mobile: bottom tab bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white z-40 border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-4">
          {tabs.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to || pathname.startsWith(to + "/");
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold tracking-wider uppercase transition-colors ${
                    isActive ? "text-gold" : "text-primary/70"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{label}</span>
                  {isActive && <span className="h-0.5 w-6 bg-gold rounded-full -mb-1" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

