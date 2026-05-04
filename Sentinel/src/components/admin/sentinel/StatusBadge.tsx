import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "critical" | "warning" | "success" | "info" | "dark";

export function StatusBadge({
  variant = "info",
  children,
  className,
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  const styles: Record<Variant, string> = {
    critical: "pill-critical",
    warning: "pill-warning",
    success: "pill-success",
    info: "pill-info",
    dark: "bg-primary text-primary-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
