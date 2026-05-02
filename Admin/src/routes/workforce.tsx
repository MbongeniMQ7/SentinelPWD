import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/sentinel/StatusBadge";
import { MoreVertical, SlidersHorizontal, TrendingUp, TrendingDown, Wifi, Eye, UserX, RefreshCw } from "lucide-react";
import anders from "@/assets/worker-anders.jpg";
import sarah from "@/assets/worker-sarah.jpg";
import thabiso from "@/assets/worker-thabiso.jpg";
import lucia from "@/assets/worker-lucia.jpg";
import bradley from "@/assets/worker-bradley.jpg";

export const Route = createFileRoute("/workforce")({
  head: () => ({
    meta: [
      { title: "Workforce Monitoring — SentinelAI Admin" },
      { name: "description", content: "Live personnel grid for active workforce surveillance and biometric monitoring." },
    ],
  }),
  component: WorkforcePage,
});

const people = [
  { id: "SN-09822", name: "Anders Miller", img: anders, score: 88, trend: "up", source: "Biometric", status: "ACTIVE (ELEVATED)", risk: "high", dot: "bg-critical" },
  { id: "SN-11403", name: "Sarah Jones", img: sarah, score: 42, source: "IoT Mesh", status: "ACTIVE", risk: "moderate", dot: "bg-warning" },
  { id: "SN-05221", name: "Thabiso Ngwenya", img: thabiso, score: 12, trend: "down", source: "IoT Mesh", status: "IDLE", risk: "low", dot: "bg-ink-soft" },
  { id: "SN-99201", name: "Lucia Rossi", img: lucia, score: 92, source: "Biometric", status: "HIGH RISK ALERT", risk: "high", dot: "bg-critical", warn: true },
  { id: "SN-22109", name: "Bradley James", img: bradley, score: 8, source: "IoT Mesh", status: "ACTIVE", risk: "low", dot: "bg-ink-soft", check: true },
] as const;

function WorkforcePage() {
  return (
    <AppShell>
      <TopBar title="Workforce Monitoring" showBell />
      <div className="px-5 pt-4">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase">Active Surveillance</p>
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink mt-1">Live Personnel Grid</h1>

        <div className="mt-5 flex flex-wrap gap-2">
          <Chip active>HIGH RISK</Chip>
          <Chip>DISCONNECTED</Chip>
          <Chip>BIOMETRIC ALERTS</Chip>
          <button className="h-9 w-10 rounded-xl bg-surface border border-border flex items-center justify-center text-ink">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {people.map((p) => (
          <Link key={p.id} to="/employee/$id" params={{ id: p.id }} className="block bg-surface rounded-2xl p-4 shadow-sm">
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
              <button className="text-ink-soft" aria-label="More"><MoreVertical className="h-4 w-4" /></button>
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
            <button className="text-ink-soft" aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Chip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button className={`px-4 h-9 rounded-xl text-[12px] font-extrabold tracking-wider ${active ? "bg-primary text-primary-foreground" : "bg-surface text-ink border border-border"}`}>
      {children}
    </button>
  );
}
