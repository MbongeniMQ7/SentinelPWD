import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { StatusBadge } from "@/components/admin/sentinel/StatusBadge";
import { useWorkforceStatus } from "@/hooks/useFatigueMonitor";
import { riskLabel } from "@/lib/fatigue/riskScore";
import { MoreVertical, SlidersHorizontal, TrendingUp, TrendingDown, Wifi, Eye, UserX, RefreshCw, Camera } from "lucide-react";
import anders from "@/assets/worker-anders.jpg";
import sarah from "@/assets/worker-sarah.jpg";
import thabiso from "@/assets/worker-thabiso.jpg";
import lucia from "@/assets/worker-lucia.jpg";
import bradley from "@/assets/worker-bradley.jpg";

export const Route = createFileRoute("/admin/workforce")({
  head: () => ({
    meta: [
      { title: "Workforce Monitoring — SentinelAI Admin" },
      { name: "description", content: "Live personnel grid for active workforce surveillance and biometric monitoring." },
    ],
  }),
  component: WorkforcePage,
});

type Person = {
  id: string; name: string; img: string; score: number;
  trend?: "up" | "down"; source: string; status: string;
  risk: "high" | "moderate" | "low"; dot: string; warn?: boolean; check?: boolean;
};

const people: Person[] = [
  { id: "SN-09822", name: "Anders Miller", img: anders, score: 88, trend: "up", source: "Biometric", status: "ACTIVE (ELEVATED)", risk: "high", dot: "bg-critical" },
  { id: "SN-11403", name: "Sarah Jones", img: sarah, score: 42, source: "IoT Mesh", status: "ACTIVE", risk: "moderate", dot: "bg-warning" },
  { id: "SN-05221", name: "Thabiso Ngwenya", img: thabiso, score: 12, trend: "down", source: "IoT Mesh", status: "IDLE", risk: "low", dot: "bg-ink-soft" },
  { id: "SN-99201", name: "Lucia Rossi", img: lucia, score: 92, source: "Biometric", status: "HIGH RISK ALERT", risk: "high", dot: "bg-critical", warn: true },
  { id: "SN-22109", name: "Bradley James", img: bradley, score: 8, source: "IoT Mesh", status: "ACTIVE", risk: "low", dot: "bg-ink-soft", check: true },
];

function WorkforcePage() {
  const [filter, setFilter] = useState<"HIGH RISK" | "DISCONNECTED" | "BIOMETRIC ALERTS">("HIGH RISK");
  const workforce = useWorkforceStatus();
  const liveWorkers = Object.values(workforce.workers);

  // Apply the active chip filter against live workers (the static demo list
  // is left untouched so the page is always populated).
  const liveFiltered = liveWorkers.filter((w) => {
    if (filter === "HIGH RISK") return w.level === "high";
    if (filter === "BIOMETRIC ALERTS") return w.level !== "low";
    // DISCONNECTED — we don't track disconnect state in the live registry yet.
    return false;
  });

  return (
    <AppShell>
      <TopBar title="Workforce Monitoring" showBell />
      <div className="px-5 pt-4">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase">Active Surveillance</p>
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink mt-1">Live Personnel Grid</h1>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["HIGH RISK", "DISCONNECTED", "BIOMETRIC ALERTS"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
          ))}
          <button
            onClick={() => toast("Advanced filters coming soon")}
            className="h-9 w-10 rounded-xl bg-surface border border-border flex items-center justify-center text-ink"
            aria-label="More filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {liveFiltered.map((w) => (
          <div key={w.workerId} className="block bg-surface rounded-2xl p-4 shadow-sm border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="h-13 w-13 rounded-xl bg-primary/10 flex items-center justify-center">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-ink">{w.workerName ?? w.workerId}</p>
                <p className="text-[12px] text-ink-soft">ID: {w.workerId} • LIVE</p>
              </div>
              <StatusBadge variant={w.level === "high" ? "critical" : w.level === "moderate" ? "warning" : "info"}>
                {riskLabel(w.level)}
              </StatusBadge>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">FATIGUE SCORE</p>
                <p className="mt-1 text-[28px] font-extrabold text-ink leading-none flex items-center gap-1">
                  {String(w.score).padStart(2, "0")}%
                  {w.trend.length > 1 && w.trend[w.trend.length - 1] > w.trend[w.trend.length - 2] && (
                    <TrendingUp className="h-4 w-4 text-critical" />
                  )}
                  {w.trend.length > 1 && w.trend[w.trend.length - 1] < w.trend[w.trend.length - 2] && (
                    <TrendingDown className="h-4 w-4 text-success" />
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">DATA SOURCE</p>
                <p className="mt-1 text-[13px] font-semibold text-ink flex items-center justify-end gap-1">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  Camera
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${w.level === "high" ? "bg-critical" : w.level === "moderate" ? "bg-warning" : "bg-success"}`}
                />
                <span className="text-[11px] font-extrabold tracking-wider text-ink uppercase">
                  Status: BPM {Math.round(w.blinkRate)} • PERCLOS {Math.round(w.eyeClosure * 100)}%
                </span>
              </div>
              <button
                onClick={() => toast(`${w.workerName ?? w.workerId}: live session active`)}
                className="text-ink-soft"
                aria-label="More"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {people.map((p) => (
          <Link key={p.id} to="/admin/employee/$id" params={{ id: p.id }} className="block bg-surface rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <img src={p.img} width={52} height={52} loading="lazy" alt={p.name} className="h-13 w-13 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-extrabold text-ink">{p.name}</p>
                <p className="text-[12px] text-ink-soft">ID: {p.id}</p>
              </div>
              <StatusBadge variant={p.risk === "high" ? "critical" : p.risk === "moderate" ? "warning" : "info"}>
                {p.risk === "high" ? "High Risk" : p.risk === "moderate" ? "Moderate" : "Low Risk"}
              </StatusBadge>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">FATIGUE SCORE</p>
                <p className="mt-1 text-[28px] font-extrabold text-ink leading-none flex items-center gap-1">
                  {String(p.score).padStart(2, "0")}%
                  {p.trend === "up" && <TrendingUp className="h-4 w-4 text-critical" />}
                  {p.trend === "down" && <TrendingDown className="h-4 w-4 text-success" />}
                  {p.warn && <span className="text-critical text-lg">!</span>}
                  {p.check && <Eye className="h-4 w-4 text-ink-soft" />}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">DATA SOURCE</p>
                <p className="mt-1 text-[13px] font-semibold text-ink flex items-center justify-end gap-1">
                  <Wifi className="h-3.5 w-3.5 text-warning-foreground" />
                  {p.source}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                <span className="text-[11px] font-extrabold tracking-wider text-ink uppercase">Status: {p.status}</span>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast(`${p.name}: actions menu coming soon`); }}
                className="text-ink-soft"
                aria-label="More"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </Link>
        ))}

        <div className="bg-surface-muted rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-13 w-13 rounded-xl bg-muted flex items-center justify-center">
              <UserX className="h-5 w-5 text-ink-soft" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-extrabold text-ink">Marcus Thorne</p>
              <p className="text-[12px] text-ink-soft">ID: SN-00334</p>
            </div>
            <StatusBadge variant="info">Offline</StatusBadge>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">FATIGUE SCORE</p>
              <p className="mt-1 text-[28px] font-extrabold text-ink-soft/60 leading-none">- - %</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">DATA SOURCE</p>
              <p className="mt-1 text-[13px] font-semibold text-ink-soft">⚠ LOST</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ink-soft" />
              <span className="text-[11px] font-extrabold tracking-wider text-ink uppercase">Status: Disconnected</span>
            </div>
            <button
              onClick={() => toast("Attempting to reconnect Marcus Thorne…")}
              className="text-ink-soft"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 h-9 rounded-xl text-[12px] font-extrabold tracking-wider transition ${active ? "bg-primary text-primary-foreground" : "bg-surface text-ink border border-border hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}
