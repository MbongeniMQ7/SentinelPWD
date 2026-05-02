import { createFileRoute } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { AvatarBadge } from "@/components/AvatarBadge";
import { HelpCircle, Paperclip, Headphones, Mail } from "lucide-react";

export const Route = createFileRoute("/support")({
  component: Support,
});

function Support() {
  return (
    <div className="app-shell px-5 py-5 pb-10">
      <header className="flex items-center justify-between mb-6">
        <BrandLogo />
        <AvatarBadge />
      </header>

      <h1 className="text-4xl font-display font-bold leading-tight">
        Vigilant Support<br /><span className="text-muted-foreground">at Your Service.</span>
      </h1>

      {/* Submit issue */}
      <div className="panel p-5 mt-6">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-navy flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Submit Issue</h2>
            <p className="text-sm text-muted-foreground">
              Detailed reports help us resolve technical hurdles faster.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="label-eyebrow">Title</div>
          <input
            placeholder="Brief summary of the issue"
            className="mt-2 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-4">
          <div className="label-eyebrow">Description</div>
          <textarea
            rows={4}
            placeholder="Describe the steps to reproduce or the nature of the error..."
            className="mt-2 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none"
          />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5 mt-0.5" />
            <span>Attach screenshot<br />(optional)</span>
          </div>
          <button className="rounded-xl bg-navy text-navy-foreground font-bold px-6 py-3 text-sm leading-tight">
            Send<br />Report
          </button>
        </div>
      </div>

      {/* Direct line */}
      <div className="panel bg-navy text-navy-foreground p-5 mt-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gold/10" />
        <Headphones className="h-7 w-7 text-gold" />
        <h3 className="mt-3 font-display text-2xl font-bold">Direct Line</h3>
        <p className="text-sm opacity-70 mt-1">Available 24/7 for critical site safety failures.</p>
        <div className="mt-3 font-display font-bold text-xl tracking-wider">+1 (800) SENTINEL</div>
      </div>

      {/* Email */}
      <div className="panel p-5 mt-5">
        <Mail className="h-6 w-6 text-navy" />
        <h3 className="mt-3 font-display text-xl font-bold">Email Support</h3>
        <p className="text-sm text-muted-foreground">Standard response time under 2 hours.</p>
        <div className="mt-3 font-bold">support@sentinelai.io</div>
      </div>

      <h3 className="mt-8 mb-4 flex items-center justify-between">
        <span className="font-display text-2xl font-bold">Recent Issues</span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">4 Active</span>
      </h3>

      <div className="space-y-3">
        <Issue status="OPEN" statusBg="bg-gold-soft text-gold-foreground" time="2h ago" title="Wristband Sync Error" desc="Node-04 units are failing to heartbeat with the central hub..." />
        <Issue status="OPEN" statusBg="bg-gold-soft text-gold-foreground" time="Yesterday" title="Fatigue Algorithm Delay" desc="Dashboard reporting 5-minute latency on fatigue score updates..." />
        <Issue status="RESOLVED" statusBg="bg-secondary text-muted-foreground" time="Oct 12" title="Admin Password Reset" desc="Successfully restored access for the regional safety lead account." />
        <Issue status="RESOLVED" statusBg="bg-secondary text-muted-foreground" time="Oct 10" title="UI Render Bug - Safari" desc="Heatmap alignment issues on mobile Safari browsers have been..." />
      </div>

      <button className="mt-5 w-full rounded-2xl border-2 border-dashed border-border py-4 text-sm font-bold">
        View Archive
      </button>
    </div>
  );
}

function Issue({ status, statusBg, time, title, desc }: { status: string; statusBg: string; time: string; title: string; desc: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-widest ${statusBg}`}>{status}</span>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
      <h4 className="mt-2 font-display font-bold">{title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
