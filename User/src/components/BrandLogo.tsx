import { Shield } from "lucide-react";

export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <div className="flex items-center gap-2">
      <div className={`${dim} rounded-lg bg-navy flex items-center justify-center`}>
        <Shield className="h-1/2 w-1/2 text-gold" strokeWidth={2.5} />
      </div>
      <span className={`${text} font-display font-bold tracking-tight text-navy`}>
        SentinelAI
      </span>
    </div>
  );
}
