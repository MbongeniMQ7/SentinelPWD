import { NavLink, useLocation } from "react-router-dom";
import { Home, Building2, Banknote, AlertOctagon } from "lucide-react";

const tabs = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/revenue", label: "Revenue", icon: Banknote },
  { to: "/issues", label: "Issues", icon: AlertOctagon },
];

export const BottomNav = () => {
  const { pathname } = useLocation();
  if (pathname === "/" || pathname === "/login") return null;
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white z-40 border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold tracking-wider uppercase transition-colors ${
                  isActive ? "text-gold" : "text-primary/70"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{label}</span>
                  {isActive && <span className="h-0.5 w-6 bg-gold rounded-full -mb-1" />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
