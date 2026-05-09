import { ReactNode } from "react";
import { Bell, UserCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function TopBar({
  title = "SentinelAI",
  subtitle,
  showAvatar = false,
  showBell = false,
  right,
}: {
  title?: string;
  subtitle?: string;
  showAvatar?: boolean;
  showBell?: boolean;
  right?: ReactNode;
}) {
  const { profile } = useAuth();
  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : null;
  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : null;

  return (
    <header className="sticky top-0 z-40 bg-surface/95 border-b border-border" style={{ backdropFilter: "blur(8px)" }}>
      <div className="flex items-center justify-between px-5 lg:px-8 h-14">
        {/* Title block */}
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-[15px] font-extrabold tracking-tight text-ink leading-none">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-ink-soft mt-0.5 leading-none">{subtitle}</p>
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {right}
          {showBell && (
            <button
              className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-ink-soft hover:text-ink transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
          )}
          {showAvatar && (
            <div
              className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center text-[11px] font-extrabold"
              style={{
                background: "linear-gradient(135deg, oklch(0.83 0.17 85), oklch(0.70 0.15 75))",
                color: "oklch(0.20 0.06 70)",
              }}
            >
              {initials ?? <UserCircle2 className="h-5 w-5 text-ink-soft" />}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

