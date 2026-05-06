import { AvatarBadge } from "./AvatarBadge";

export function AppHeader({ battery = "98% BLE", title }: { battery?: string | null; title?: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-5 lg:px-8 py-3 bg-card/90 backdrop-blur-sm border-b border-border">
      {/* On desktop, also show the page title in a wider style */}
      <div className="font-display font-semibold text-lg lg:text-xl text-foreground">
        {title ?? "Dashboard"}
      </div>
      <div className="flex items-center gap-3">
        {battery && (
          <span className="rounded-full bg-gold-soft px-3 py-1 text-[11px] font-bold text-gold-foreground">
            {battery}
          </span>
        )}
        <AvatarBadge />
      </div>
    </header>
  );
}


