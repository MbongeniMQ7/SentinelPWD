import { useProfile } from "@/hooks/useProfile";
import { UserCircle2 } from "lucide-react";

export function AvatarBadge({ size = 36 }: { size?: number }) {
  const { profile } = useProfile();
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : null;

  return (
    <div
      className="rounded-full bg-navy ring-2 ring-gold/60 flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.full_name ?? "Avatar"} className="w-full h-full object-cover" />
      ) : initials ? (
        <span className="text-gold text-xs font-bold">{initials}</span>
      ) : (
        <UserCircle2 className="text-gold" style={{ width: size * 0.6, height: size * 0.6 }} />
      )}
    </div>
  );
}
