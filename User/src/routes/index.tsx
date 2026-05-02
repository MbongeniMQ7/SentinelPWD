import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { Sparkles, Activity, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Welcome,
});

function Welcome() {
  return (
    <div className="app-shell px-5 py-8 flex flex-col">
      <div className="flex justify-center mb-6">
        <BrandLogo size="sm" />
      </div>

      {/* Hero card */}
      <div className="relative rounded-3xl overflow-hidden bg-navy aspect-[4/5] mb-7">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, oklch(0.55 0.12 230) 0%, oklch(0.22 0.05 250) 55%, oklch(0.15 0.04 260) 100%)",
          }}
        />
        {/* Concentric rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[280, 220, 160, 100].map((s) => (
            <div
              key={s}
              className="absolute rounded-full border border-cyan-300/20"
              style={{ width: s, height: s }}
            />
          ))}
          <div className="absolute h-16 w-16 rounded-full bg-cyan-200/40 blur-xl" />
          <div className="absolute h-3 w-3 rounded-full bg-cyan-100" />
        </div>
        {/* Status pill */}
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gold-soft flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-gold-foreground" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.18em] font-semibold text-white/70">
              SYSTEM STATUS
            </div>
            <div className="text-sm font-semibold text-white">
              Sentinel Active &amp; Vigilant
            </div>
          </div>
        </div>
      </div>

      <h1 className="text-center text-4xl font-display font-bold leading-tight">
        Welcome to<br />SentinelAI
      </h1>
      <p className="mt-4 text-center text-[15px] leading-relaxed text-muted-foreground px-2">
        Your silent guardian in the workspace. We utilize high-precision IoT
        monitoring to analyze fatigue patterns and ensure every team member
        returns home safely.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Chip icon={<Sparkles className="h-3.5 w-3.5" />} label="AI Analysis" />
        <Chip icon={<Activity className="h-3.5 w-3.5" />} label="Real-time Vitals" />
        <Chip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Privacy First" />
      </div>

      <Link
        to="/onboarding"
        className="mt-6 w-full rounded-2xl bg-gold-soft hover:bg-gold/80 transition py-4 flex items-center justify-center gap-2 text-gold-foreground font-bold"
      >
        Get Started <ArrowRight className="h-4 w-4" />
      </Link>

      <div className="mt-5 flex justify-center gap-1.5">
        <span className="h-1 w-6 rounded-full bg-gold" />
        <span className="h-1 w-1.5 rounded-full bg-muted-foreground/30" />
        <span className="h-1 w-1.5 rounded-full bg-muted-foreground/30" />
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
      {icon} {label}
    </span>
  );
}
