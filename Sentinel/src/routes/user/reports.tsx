import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { Download, BarChart3, LineChart, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/user/reports")({
  component: Reports,
});

function Reports() {
  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery={null} />
      <main className="flex-1 px-5 pb-6 space-y-5">
        <div>
          <h1 className="text-4xl font-display font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Comprehensive insights into workforce fatigue patterns and safety compliance metrics across all active sectors.
          </p>
        </div>

        {/* Hero card */}
        <div className="panel bg-navy text-navy-foreground p-6 relative overflow-hidden">
          <div className="label-eyebrow text-gold">Historical Trend</div>
          <h2 className="mt-2 text-3xl font-display font-bold">Fatigue Mitigation</h2>
          <svg viewBox="0 0 300 80" className="mt-6 w-full h-20">
            <path d="M0,55 C50,40 80,65 120,50 S200,15 260,30 L300,20" stroke="oklch(0.86 0.12 88)" strokeWidth="3" fill="none" />
            <path d="M0,60 C50,50 80,55 120,55 S200,40 260,45 L300,40" stroke="oklch(0.86 0.12 88 / 0.4)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
          </svg>
          <div className="mt-4 flex items-end gap-3">
            <div className="text-5xl font-display font-bold text-gold">84%</div>
            <div>
              <div className="font-bold">+12.4%</div>
              <div className="text-xs opacity-70">vs Last Month</div>
            </div>
          </div>
          <div className="text-xs opacity-70 mt-1">Efficiency Index</div>
        </div>

        {/* Vigilance Rating */}
        <div className="panel bg-gold-soft p-6">
          <div className="label-eyebrow text-gold-foreground">Alert Accuracy</div>
          <h3 className="mt-1 text-2xl font-display font-bold text-gold-foreground">Vigilance Rating</h3>
          <div className="mt-4 inline-flex items-center gap-2 font-bold text-gold-foreground">
            <LineChart className="h-4 w-4" /> High Compliance
          </div>
          <p className="mt-1 text-sm text-gold-foreground/80">
            Active monitoring has reduced critical alerts by 24% this week.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <h3 className="text-xl font-display font-bold">Recent Safety Archives</h3>
          <button className="flex items-center gap-1 text-xs font-bold text-gold-foreground">
            Filter by Site <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <ReportCard title="Weekly Safety Report - May 10-17" tag="Fatigue Focus" size="4.2 MB" />
        <ReportCard title="Weekly Safety Report - May 03-10" tag="General Safety" size="3.8 MB" />
        <ReportCard title="Monthly Incident Summary - April" tag="Critical Insights" tagGold size="12.1 MB" iconLine />
        <ReportCard title="Weekly Safety Report - Apr 26-03" tag="Fatigue Focus" size="4.1 MB" />
      </main>
      <BottomNav />
    </div>
  );
}

function ReportCard({
  title, tag, size, tagGold, iconLine,
}: { title: string; tag: string; size: string; tagGold?: boolean; iconLine?: boolean }) {
  return (
    <div className="panel p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          {iconLine ? <LineChart className="h-5 w-5 text-navy" /> : <BarChart3 className="h-5 w-5 text-navy" />}
        </div>
        <div className="flex-1">
          <h4 className="font-display font-bold text-base leading-tight">{title}</h4>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${tagGold ? "bg-gold-soft text-gold-foreground" : "bg-secondary text-foreground"}`}>{tag}</span>
            <span className="text-[11px] font-semibold text-muted-foreground">PDF • {size}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-xl bg-card border border-border py-2.5 text-sm font-bold">View Online</button>
        <button className="rounded-xl bg-navy text-navy-foreground py-2.5 text-sm font-bold flex items-center justify-center gap-1.5">
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>
    </div>
  );
}
