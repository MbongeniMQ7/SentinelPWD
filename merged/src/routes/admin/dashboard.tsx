import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { StatusBadge } from "@/components/admin/sentinel/StatusBadge";
import { useWorkforceStatus } from "@/hooks/useFatigueMonitor";
import { useAlertLog } from "@/lib/fatigue/alertLog";
import { Users, AlertOctagon, Zap, Clock, Download, RefreshCw, Activity } from "lucide-react";
import marcus from "@/assets/worker-marcus.jpg";
import elena from "@/assets/worker-elena.jpg";
import julian from "@/assets/worker-julian.jpg";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "System Overview — SentinelAI Admin" },
      { name: "description", content: "Real-time workforce intelligence and health metrics for current operations." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  // ---- Live workforce roll-up (overlaid on the demo baseline) ----
  const workforce = useWorkforceStatus();
  const alertLog = useAlertLog();
  // "Active" = unacknowledged in the last 30 minutes.
  const activeAlertCount = alertLog.filter(
    (a) => !a.acknowledged && Date.now() - a.timestamp < 30 * 60_000,
  ).length;

  const baseTotal = 124;
  const baseHigh = 8;
  const baseActive = 3;
  const baseLow = 114;
  const baseModerate = 6;

  const liveTotal = baseTotal + workforce.total;
  const liveHigh = baseHigh + workforce.byLevel.high;
  const liveActive = baseActive + activeAlertCount;
  const liveLow = baseLow + workforce.byLevel.low;
  const liveMod = baseModerate + workforce.byLevel.moderate;
  const lowPct = Math.round((liveLow / liveTotal) * 100);
  const modPct = Math.round((liveMod / liveTotal) * 100);
  const highPct = Math.max(0, 100 - lowPct - modPct);

  const liveHighRiskWorkers = workforce.highRiskIds
    .map((id) => workforce.workers[id])
    .filter(Boolean)
    .slice(0, 3);

  return (
    <AppShell>
      <TopBar showBell showAvatar />
      <div className="px-5 pt-4">
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink">System Overview</h1>
        <p className="mt-2 text-[13px] text-ink-soft leading-snug">
          Real-time workforce intelligence and health metrics for current operations.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => toast.success("Dashboard data exported as CSV")}
            className="flex-1 h-11 rounded-xl bg-muted text-ink text-[12px] font-extrabold tracking-wider flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" /> EXPORT CSV
          </button>
          <button
            onClick={() => toast("Refreshing live data…")}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold tracking-wider flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> UPDATE LIVE
          </button>
        </div>
        <Link
          to="/admin/fatigue-dashboard"
          className="mt-3 w-full h-11 rounded-xl bg-warning/15 border border-warning/30 text-warning-foreground text-[12px] font-extrabold tracking-wider flex items-center justify-center gap-2"
        >
          <Activity className="h-4 w-4" /> FATIGUE DASHBOARD
        </Link>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <StatCard label="TOTAL EMPLOYEES" value={String(liveTotal)} delta="+2.4% vs last month" deltaColor="text-success" icon={<Users className="h-4 w-4 text-ink" />} iconBg="bg-info-soft" />
        <StatCard label="HIGH-RISK EMPLOYEES" value={String(liveHigh)} pill={<StatusBadge variant="critical">Immediate Attention</StatusBadge>} icon={<AlertOctagon className="h-4 w-4 text-critical" />} iconBg="bg-critical/10" stripe />
        <StatCard label="ACTIVE ALERTS" value={String(liveActive)} delta={<span className="flex items-center gap-1 text-ink-soft text-[12px]"><Clock className="h-3.5 w-3.5" /> {activeAlertCount > 0 ? `${activeAlertCount} live in last 30m` : "Last triggered 14m ago"}</span>} icon={<Zap className="h-4 w-4 text-warning-foreground" />} iconBg="bg-warning/30" />

        <section className="bg-surface rounded-2xl p-5 shadow-sm">
          <h2 className="text-[18px] font-extrabold text-ink leading-tight">Quick Insights: Attention Required</h2>
          <p className="mt-1 text-[13px] text-ink-soft">Real-time flagged personnel requiring administrative review.</p>

          <ul className="mt-5 space-y-4">
            {liveHighRiskWorkers.map((w) => (
              <LiveInsightRow
                key={w.workerId}
                name={w.workerName ?? w.workerId}
                zone={`ID: ${w.workerId} • Live Camera Feed`}
                detail={`Score: ${w.score}/100`}
              />
            ))}
            <InsightRow img={marcus} name="Marcus Thorne" zone="Zone 4 • Bio-Sensor Lag" badge="critical" badgeText="Critical Risk" detail="Pulse: 112 BPM" />
            <InsightRow img={elena} name="Elena Rodriguez" zone="Zone 1 • Prolonged Immobility" badge="warning" badgeText="Moderate" detail="Time in position: 12m" />
            <InsightRow img={julian} name="Julian Vane" zone="Zone 9 • Thermal Alert" badge="warning" badgeText="Moderate" detail="Ambient: 104°F" />
          </ul>

          <Link to="/admin/workforce" className="mt-5 block text-center text-[13px] font-extrabold tracking-wider text-ink uppercase">
            View All Incidents
          </Link>
        </section>

        <section className="bg-surface rounded-2xl p-5 shadow-sm">
          <h2 className="text-[18px] font-extrabold text-ink">Risk Distribution</h2>
          <div className="mt-5 space-y-4">
            <RiskBar label="Low Risk" pct={lowPct} count={`(${liveLow})`} color="bg-success" />
            <RiskBar label="Moderate Risk" pct={modPct} count={`(${liveMod})`} color="bg-warning" />
            <RiskBar label="High Risk" pct={highPct} count={`(${liveHigh})`} color="bg-critical" />
          </div>
          <p className="mt-5 text-[11px] italic text-ink-soft">
            *Risk factors calculated based on aggregated physiological and environmental data streams.
          </p>
        </section>

        <section className="bg-surface-muted rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase">Data Source Breakdown</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 space-y-3">
              <Source dot="bg-warning" title="IoT Integrated" sub="86 Units active" />
              <Source dot="bg-info-soft border border-blue-300" title="Biometric Only" sub="38 Units active" />
            </div>
            <Donut total={liveTotal} segments={[{ pct: 0.69, color: "var(--warning)" }, { pct: 0.31, color: "oklch(0.78 0.06 240)" }]} />
          </div>
        </section>

        <Link
          to="/admin/support"
          className="fixed bottom-24 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
          aria-label="Support"
        >
          <span className="text-lg">🎧</span>
        </Link>
      </div>
    </AppShell>
  );
}

function StatCard({
  label, value, delta, pill, icon, iconBg, deltaColor, stripe,
}: {
  label: string; value: string; delta?: React.ReactNode; pill?: React.ReactNode;
  icon: React.ReactNode; iconBg: string; deltaColor?: string; stripe?: boolean;
}) {
  return (
    <div className={`relative bg-surface rounded-2xl p-5 shadow-sm overflow-hidden ${stripe ? "before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1 before:rounded-r-full before:bg-critical" : ""}`}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase">{label}</p>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <p className="mt-3 text-[42px] leading-none font-extrabold text-ink">{value}</p>
      <div className="mt-3">
        {pill ?? (typeof delta === "string" ? <p className={`text-[13px] font-bold ${deltaColor || "text-ink-soft"}`}>{delta}</p> : delta)}
      </div>
    </div>
  );
}

function InsightRow({ img, name, zone, badge, badgeText, detail }: { img: string; name: string; zone: string; badge: "critical" | "warning"; badgeText: string; detail: string }) {
  return (
    <li className="flex items-center gap-3">
      <img src={img} width={48} height={48} loading="lazy" alt={name} className="h-12 w-12 rounded-xl object-cover" />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-ink truncate">{name}</p>
        <p className="text-[12px] text-ink-soft truncate">{zone}</p>
      </div>
      <div className="text-right shrink-0">
        <StatusBadge variant={badge}>{badgeText}</StatusBadge>
        <p className="mt-1 text-[11px] text-ink-soft">{detail}</p>
      </div>
    </li>
  );
}

function LiveInsightRow({ name, zone, detail }: { name: string; zone: string; detail: string }) {
  // Live entries don't have an avatar yet — use an initial avatar tile.
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <li className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-critical/10 flex items-center justify-center text-critical font-extrabold text-[16px]">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-ink truncate">{name}</p>
        <p className="text-[12px] text-ink-soft truncate">{zone}</p>
      </div>
      <div className="text-right shrink-0">
        <StatusBadge variant="critical">Live • High</StatusBadge>
        <p className="mt-1 text-[11px] text-ink-soft">{detail}</p>
      </div>
    </li>
  );
}

function RiskBar({ label, pct, count, color }: { label: string; pct: number; count: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[13px] font-semibold text-ink">
        <span>{label}</span>
        <span>{pct}% <span className="text-ink-soft font-normal">{count}</span></span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Source({ dot, title, sub }: { dot: string; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`h-2.5 w-2.5 rounded-full mt-1.5 ${dot}`} />
      <div>
        <p className="text-[14px] font-bold text-ink">{title}</p>
        <p className="text-[12px] text-ink-soft">{sub}</p>
      </div>
    </div>
  );
}

function Donut({ total, segments }: { total: number; segments: { pct: number; color: string }[] }) {
  const r = 38, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="oklch(0.93 0.01 250)" strokeWidth="10" />
        {segments.map((s, i) => {
          const len = s.pct * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="10" strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-extrabold text-ink leading-none">{total}</span>
        <span className="text-[9px] font-extrabold tracking-wider text-ink-soft">TOTAL</span>
      </div>
    </div>
  );
}
