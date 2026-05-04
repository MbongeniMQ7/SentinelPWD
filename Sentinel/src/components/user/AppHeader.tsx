import { BrandLogo } from "./BrandLogo";
import { AvatarBadge } from "./AvatarBadge";

export function AppHeader({ battery = "98% BLE" }: { battery?: string | null }) {
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-3">
      <BrandLogo />
      <div className="flex items-center gap-2">
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
