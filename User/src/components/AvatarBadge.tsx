export function AvatarBadge({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-navy ring-2 ring-gold/60 flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      <span className="text-gold text-xs font-bold">MC</span>
    </div>
  );
}
