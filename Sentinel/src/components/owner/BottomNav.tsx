import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, Banknote, AlertOctagon } from "lucide-react";

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
    <nav
      className="fixed bottom-0 left-0 right-0 w-full bg-white z-40 border-t border-border"
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
  );
};
