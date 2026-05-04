import { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-5 pt-5 pb-4">
      {eyebrow && (
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-warning-foreground/70 uppercase mb-1">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink">{title}</h1>
      {subtitle && <p className="mt-3 text-[14px] text-ink-soft leading-snug">{subtitle}</p>}
      {children}
    </div>
  );
}
