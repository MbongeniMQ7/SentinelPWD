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
      <section className="relative w-full min-h-[90vh] flex items-center overflow-hidden">
        {/* Subtle IoT watch background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=1920&q=60&auto=format&fit=crop"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center scale-105"
            style={{ filter: "blur(3px)", opacity: 0.18 }}
          />
          {/* Strong overlay so background stays subtle */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(120deg, hsl(var(--background)/1) 0%, hsl(var(--background)/0.97) 50%, hsl(var(--background)/0.92) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Copy */}
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-card/80 backdrop-blur border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              AI-powered workforce safety
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight">
              Welcome to{" "}
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, oklch(0.3 0.08 250), oklch(0.45 0.12 240))",
                }}
              >
                SentinelAI
              </span>
            </h1>
            <p className="mt-6 text-lg lg:text-xl leading-relaxed text-foreground/80 max-w-xl font-medium">
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
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-soft hover:bg-gold/80 transition-all shadow-lg hover:shadow-gold/30 px-8 py-4 text-gold-foreground font-bold"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/choose-role"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/70 backdrop-blur hover:bg-muted transition px-8 py-4 font-semibold text-foreground"
              >
                Explore
              </Link>
            </div>
          </div>

          {/* Visual panel */}
          <div className="order-1 lg:order-2">
            <div className="relative rounded-3xl overflow-hidden bg-navy/90 backdrop-blur aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] max-w-md mx-auto w-full shadow-2xl border border-white/10">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 40%, oklch(0.52 0.14 225) 0%, oklch(0.22 0.06 250) 55%, oklch(0.13 0.04 260) 100%)",
                }}
              />
              {/* Ping animation ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute h-48 w-48 rounded-full border border-cyan-300/10 animate-ping" style={{ animationDuration: "3s" }} />
                {[380, 280, 190, 110].map((s) => (
                  <div
                    key={s}
                    className="absolute rounded-full border border-cyan-300/20"
                    style={{ width: s, height: s }}
                  />
                ))}
                <div className="absolute h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" />
                {/* Watch icon in centre */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shadow-xl">
                    <Activity className="h-8 w-8 text-cyan-200" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] tracking-[0.2em] font-semibold text-cyan-200/70 uppercase">Monitoring</span>
                </div>
              </div>
              {/* Status bar */}
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gold-soft flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-gold-foreground" />
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.18em] font-semibold text-white/60">
                    SYSTEM STATUS
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Sentinel Active &amp; Vigilant
                  </div>
                </div>
                <div className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
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


