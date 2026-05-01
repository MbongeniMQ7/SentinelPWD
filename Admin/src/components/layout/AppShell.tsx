import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="phone-shell">
      <div className="relative">{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
