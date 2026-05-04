import { ReactNode } from "react";
import { Menu, Bell, UserCircle2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

export function TopBar({
  title = "SentinelAI Admin",
  showAvatar = false,
  showBell = false,
  right,
}: {
  title?: string;
  showAvatar?: boolean;
  showBell?: boolean;
  right?: ReactNode;
}) {
  const { profile } = useProfile();
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : null;

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <button className="p-2 -ml-2 text-ink" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-[15px] font-bold tracking-tight text-ink">{title}</h1>
        <div className="flex items-center gap-2">
          {right}
          {showBell && (
            <button className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-ink" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
          )}
          {showAvatar && (
            <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-warning/40 bg-muted flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "Admin"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : initials ? (
                <span className="text-xs font-bold text-ink">{initials}</span>
              ) : (
                <UserCircle2 className="h-5 w-5 text-ink-soft" />
              )}
            </div>
          )}
          {!showBell && !showAvatar && <span className="w-9" />}
        </div>
      </div>
    </header>
  );
}
