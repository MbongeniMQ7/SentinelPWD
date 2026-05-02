import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/sentinel/StatusBadge";
import { AlertTriangle, EyeOff, Router as RouterIcon, Clock, UserCog, BarChart3, Send } from "lucide-react";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Active Alerts — SentinelAI Admin" },
      { name: "description", content: "Real-time surveillance and system diagnostics ledger across the workforce." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4">
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink">Active Alerts</h1>
        <p className="mt-3 text-[13px] text-ink-soft">Real-time surveillance and system diagnostics ledger.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Chip active>ALL</Chip>
          <Chip>FATIGUE</Chip>
          <Chip>FOCUS</Chip>
          <Chip>HARDWARE</Chip>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <AlertCard
          icon={<AlertTriangle className="h-5 w-5 text-critical" />} bg="bg-critical/10"
          title="High Fatigue Detected" meta={<>Employee: <b>Marcus Thorne</b> • ID: 8824</>}
          time="14:22:05 (2m ago)"
          badge={<StatusBadge variant="critical">Critical</StatusBadge>}
          footer={<div className="flex items-center gap-2 pt-3 border-t border-border"><div className="h-6 w-6 rounded-full bg-warning flex items-center justify-center"><UserCog className="h-3.5 w-3.5 text-ink" /></div><span className="text-[11px] font-extrabold tracking-wider text-ink uppercase">Escalated to: Floor Supervisor</span></div>}
        />
        <AlertCard
          icon={<EyeOff className="h-5 w-5 text-warning-foreground" />} bg="bg-warning"
          title="Focus Loss Alert" meta={<>Employee: <b>Sarah Jenkins</b> • ID: 4102</>}
          time="14:15:30 (9m ago)"
          badge={<StatusBadge variant="warning">Moderate</StatusBadge>}
          footer={<p className="text-[11px] font-extrabold tracking-wider text-warning-foreground uppercase pt-2">Pending Review</p>}
        />
        <AlertCard
          icon={<RouterIcon className="h-5 w-5 text-ink-soft" />} bg="bg-muted"
          title="Device Disconnected" meta={<>Station: <b>Assembly North-04</b> • ID: AX-400</>}
          time="14:02:11 (22m ago)"
          badge={<StatusBadge variant="info">System</StatusBadge>}
          footer={<p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase pt-2">Maintenance Ticket Created</p>}
        />
        <AlertCard
          icon={<AlertTriangle className="h-5 w-5 text-critical" />} bg="bg-critical/10"
          title="High Fatigue Detected" meta={<>Employee: <b>Elena Rodriguez</b> • ID: 7721</>}
          time="13:55:45 (29m ago)"
          badge={<StatusBadge variant="critical">Critical</StatusBadge>}
          footer={<span className="inline-flex items-center px-2.5 py-1 rounded-md bg-info-soft text-[10px] font-extrabold tracking-wider text-ink uppercase mt-1">Action Required</span>}
        />

        <section className="relative rounded-2xl p-5 text-primary-foreground overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.4 0.04 260), oklch(0.5 0.05 260))" }}>
          <h3 className="text-[20px] font-extrabold">Shift Overview</h3>
          <p className="mt-2 text-[13px] text-primary-foreground/80">System fatigue metrics are trending 12% higher than seasonal averages for the North Wing.</p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[34px] font-extrabold text-warning leading-none">84%</p>
              <p className="mt-1 text-[10px] font-extrabold tracking-wider uppercase text-primary-foreground/70">Avg Focus</p>
            </div>
            <div>
              <p className="text-[34px] font-extrabold leading-none">04</p>
              <p className="mt-1 text-[10px] font-extrabold tracking-wider uppercase text-primary-foreground/70">Open Tickets</p>
            </div>
          </div>
        </section>

        <section className="bg-surface-muted rounded-2xl p-5 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-surface flex items-center justify-center"><BarChart3 className="h-4 w-4 text-ink" /></div>
          <h3 className="mt-3 text-[18px] font-extrabold text-ink">System Pulse</h3>
          <p className="mt-1 text-[13px] text-ink-soft">Hardware connectivity is currently at 99.8% nominal performance.</p>
          <div className="mt-3 h-1 rounded-full bg-primary w-full" />
        </section>

        <button className="w-full h-13 rounded-2xl bg-primary text-primary-foreground text-[13px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 py-4">
          <Send className="h-4 w-4" /> Send Manual Alert
        </button>
      </div>
    </AppShell>
  );
}

function Chip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button className={`px-4 h-9 rounded-xl text-[12px] font-extrabold tracking-wider ${active ? "bg-primary text-primary-foreground" : "bg-surface text-ink"}`}>
      {children}
    </button>
  );
}

function AlertCard({ icon, bg, title, meta, time, badge, footer }: { icon: React.ReactNode; bg: string; title: string; meta: React.ReactNode; time: string; badge: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[16px] font-extrabold text-ink leading-tight">{title}</h3>
            {badge}
          </div>
          <p className="mt-1 text-[12px] text-ink-soft">{meta}</p>
          <p className="mt-1 text-[11px] text-ink-soft flex items-center gap-1"><Clock className="h-3 w-3" /> {time}</p>
        </div>
      </div>
      <div className="mt-2">{footer}</div>
    </div>
  );
}
