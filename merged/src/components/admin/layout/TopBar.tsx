import { ReactNode } from "react";
import { Menu, Bell } from "lucide-react";
import adminAvatar from "@/assets/admin-avatar.jpg";

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
            <img
              src={adminAvatar}
              alt="Admin"
              width={36}
              height={36}
              loading="lazy"
              className="h-9 w-9 rounded-full object-cover ring-2 ring-warning/40"
            />
          )}
          {!showBell && !showAvatar && <span className="w-9" />}
        </div>
      </div>
    </header>
  );
}
