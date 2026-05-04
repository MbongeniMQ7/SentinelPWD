import { Menu, Bell, Settings as SettingsIcon, UserCircle2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useProfile } from "@/hooks/useProfile";

interface TopBarProps {
  title?: string;
  showBell?: boolean;
  showSettings?: boolean;
  variant?: "light" | "transparent";
}

export const TopBar = ({ title = "SentinelAI", showBell, showSettings, variant = "light" }: TopBarProps) => {
  const nav = useNavigate();
  const { profile } = useProfile();
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : null;
  const isLight = variant === "light";
  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between px-5 py-4 ${
        isLight ? "bg-white text-primary" : "bg-transparent text-foreground"
      }`}
      style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
    >
      <button aria-label="Menu" className="p-1 -ml-1">
        <Menu className="h-6 w-6" strokeWidth={2.2} />
      </button>
      <h1 className="font-display text-lg font-bold tracking-tight">
        Sentinel<span className="text-gold">AI</span>
        {title !== "SentinelAI" && <span className="ml-2 font-semibold">{title}</span>}
      </h1>
      <div className="flex items-center gap-3">
        {showSettings && (
          <button onClick={() => nav({ to: "/owner/settings" })} aria-label="Settings" className="text-gold">
            <SettingsIcon className="h-6 w-6" />
          </button>
        )}
        {showBell && <Bell className="h-5 w-5" />}
        <div className="h-8 w-8 rounded-full ring-2 ring-white overflow-hidden bg-linear-to-br from-amber-300 to-amber-600 flex items-center justify-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name ?? "Owner"} className="h-full w-full object-cover" />
          ) : initials ? (
            <span className="text-white text-xs font-bold">{initials}</span>
          ) : (
            <UserCircle2 className="h-5 w-5 text-white" />
          )}
        </div>
      </div>
    </header>
  );
};
