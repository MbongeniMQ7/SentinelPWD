import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="app-shell">
      {!hideNav && <BottomNav />}
      <div className="relative">{children}</div>
    </div>
  );
}

