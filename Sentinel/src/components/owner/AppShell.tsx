import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export const AppShell = ({ children }: { children: ReactNode }) => (
  <div className="app-shell animate-fade-in">{children}<BottomNav /></div>
);
