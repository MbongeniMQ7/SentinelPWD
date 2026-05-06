import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/user/BrandLogo";
import {
  Sparkles,
  Activity,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Welcome,
});

function Welcome() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      {/* Top nav */}
      <header className="w-full border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <BrandLogo size="md" />
          <Link
            to="/choose-role"
            className="inline-flex items-center gap-2 rounded-full bg-gold-soft hover:bg-gold/80 transition px-5 py-2.5 text-sm font-bold text-gold-foreground"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative w-full">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              AI-powered workforce safety
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight">
              Welcome to <span className="text-navy">SentinelAI</span>
            </h1>
            <p className="mt-6 text-lg lg:text-xl leading-relaxed text-muted-foreground max-w-xl">
              Your silent guardian in the workspace. We utilize high-precision IoT
              monitoring to analyze fatigue patterns and ensure every team member
              returns home safely.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Chip icon={<Sparkles className="h-3.5 w-3.5" />} label="AI Analysis" />
              <Chip icon={<Activity className="h-3.5 w-3.5" />} label="Real-time Vitals" />
              <Chip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Privacy First" />
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                to="/choose-role"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-soft hover:bg-gold/80 transition px-8 py-4 text-gold-foreground font-bold"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card hover:bg-muted transition px-8 py-4 font-semibold text-foreground"
              >
                Learn more
              </a>
            </div>
          </div>

          {/* Visual */}
          <div className="order-1 lg:order-2">
            <div className="relative rounded-3xl overflow-hidden bg-navy aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] max-w-md mx-auto w-full shadow-2xl">
              <div
                className="absolute inset-0 opacity-90"
                style={{
                  background:
                    "radial-gradient(circle at 50% 45%, oklch(0.55 0.12 230) 0%, oklch(0.22 0.05 250) 55%, oklch(0.15 0.04 260) 100%)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {[420, 320, 220, 130].map((s) => (
                  <div
                    key={s}
                    className="absolute rounded-full border border-cyan-300/20"
                    style={{ width: s, height: s }}
                  />
                ))}
                <div className="absolute h-20 w-20 rounded-full bg-cyan-200/40 blur-xl" />
                <div className="absolute h-3 w-3 rounded-full bg-cyan-100" />
              </div>
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gold-soft flex items-center justify-center">
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
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="w-full border-t border-border/60 bg-card/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SentinelAI. All rights reserved.
          </p>
        </div>
      </footer>
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


