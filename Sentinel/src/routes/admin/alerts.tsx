import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { StatusBadge } from "@/components/admin/sentinel/StatusBadge";
import { useAlertLog, acknowledgeAlert, acknowledgeAlertInDb, loadAllAlertsFromDb, type AdminDbAlert } from "@/lib/fatigue/alertLog";
import { AlertTriangle, Clock, BarChart3, Send, Activity, Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/alerts")({
  head: () => ({
    meta: [
      { title: "Active Alerts — SentinelAI Admin" },
      { name: "description", content: "Real-time surveillance and system diagnostics ledger across the workforce." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const [filter, setFilter] = useState<"ALL" | "FATIGUE" | "FOCUS" | "HARDWARE">("ALL");
  const alertLog = useAlertLog();
  const [dbAlerts, setDbAlerts] = useState<AdminDbAlert[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    loadAllAlertsFromDb(100).then(({ alerts }) => {
      setDbAlerts(alerts);
      setDbLoading(false);
    });
  }, []);

  // Live alerts from the in-memory bus (current session only)
  const liveAlerts = alertLog.filter((a) => {
    if (filter === "ALL" || filter === "FATIGUE") return true;
    return false;
  });

  // DB alerts filtered by type
  const filteredDb = dbAlerts.filter((a) => {
    if (filter === "FOCUS" || filter === "HARDWARE") return false; // fatigue-only data
    return true;
  });

  // Deduplicate: suppress DB entries already shown as live (within same minute)
  const liveKeys = new Set(alertLog.map((a) => new Date(a.timestamp).toISOString().slice(0, 16)));
  const dedupedDb = filteredDb.filter(
    (a) => !liveKeys.has(new Date(a.fired_at).toISOString().slice(0, 16))
  );

  async function handleAcknowledgeDb(id: string) {
    await acknowledgeAlertInDb(id);
    setDbAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    toast.success("Alert acknowledged");
  }

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4">
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink">Active Alerts</h1>
        <p className="mt-3 text-[13px] text-ink-soft">Real-time surveillance and system diagnostics ledger.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {(["ALL", "FATIGUE", "FOCUS", "HARDWARE"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {liveAlerts.map((a) => (
          <div
            key={a.id}
            className={`bg-surface rounded-2xl p-4 shadow-sm ${a.acknowledged ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center ${a.level === "high" ? "bg-critical/10" : "bg-warning"}`}
              >
                {a.level === "high" ? (
                  <AlertTriangle className="h-5 w-5 text-critical" />
                ) : (
                  <Activity className="h-5 w-5 text-warning-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[16px] font-extrabold text-ink leading-tight">
                    {a.level === "high" ? "High Fatigue Detected" : "Elevated Fatigue Risk"}
                  </h3>
                  <StatusBadge variant={a.level === "high" ? "critical" : "warning"}>
                    {a.level === "high" ? "Critical" : "Moderate"}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-[12px] text-ink-soft">
                  Employee: <b>{a.workerName ?? a.workerId}</b> • ID: {a.workerId}
                </p>
                <p className="mt-1 text-[11px] text-ink-soft flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelative(a.timestamp)} • score {a.score}/100
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between pt-3 border-t border-border">
              <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                {a.kind === "manager" ? "Manager Alert" : "Worker Alert"}
              </span>
              <button
                disabled={a.acknowledged}
                onClick={() => {
                  acknowledgeAlert(a.id);
                  toast.success("Alert acknowledged");
                }}
                className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> {a.acknowledged ? "Acknowledged" : "Acknowledge"}
              </button>
            </div>
          </div>
        ))}
        {/* ── Persisted alert history from DB ── */}
        {dbLoading ? (
          <div className="flex items-center justify-center py-10 text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading alert history…
          </div>
        ) : dedupedDb.length === 0 && liveAlerts.length === 0 ? (
          <div className="text-center py-10 text-ink-soft text-[13px] font-semibold">
            No alerts recorded yet
          </div>
        ) : (
          dedupedDb.map((a) => (
            <div
              key={a.id}
              className={`bg-surface rounded-2xl p-4 shadow-sm ${a.acknowledged ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${a.level === "high" ? "bg-critical/10" : "bg-warning/30"}`}>
                  {a.level === "high"
                    ? <AlertTriangle className="h-5 w-5 text-critical" />
                    : <Activity className="h-5 w-5 text-warning-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[16px] font-extrabold text-ink leading-tight">
                      {a.level === "high" ? "High Fatigue Detected" : "Elevated Fatigue Risk"}
                    </h3>
                    <StatusBadge variant={a.level === "high" ? "critical" : "warning"}>
                      {a.level === "high" ? "Critical" : "Moderate"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[12px] text-ink-soft">
                    {a.worker_name ? <>Employee: <b>{a.worker_name}</b></> : "Unknown employee"} • Score: {a.score}/100
                  </p>
                  <p className="mt-1 text-[11px] text-ink-soft">{a.message}</p>
                  <p className="mt-1 text-[11px] text-ink-soft flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(a.fired_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
                  {a.kind === "manager" ? "Manager Alert" : "Worker Alert"}
                </span>
                <button
                  disabled={a.acknowledged}
                  onClick={() => handleAcknowledgeDb(a.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase disabled:opacity-50"
                >
                  <Check className="h-3 w-3" /> {a.acknowledged ? "Acknowledged" : "Acknowledge"}
                </button>
              </div>
            </div>
          ))
        )}

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

        <button
          onClick={() => toast.success("Manual alert sent to all on-shift supervisors")}
          className="w-full h-13 rounded-2xl bg-primary text-primary-foreground text-[13px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 py-4"
        >
          <Send className="h-4 w-4" /> Send Manual Alert
        </button>
      </div>
    </AppShell>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 h-9 rounded-xl text-[12px] font-extrabold tracking-wider transition ${active ? "bg-primary text-primary-foreground" : "bg-surface text-ink hover:bg-muted"}`}
    >
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

function formatRelative(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  const deltaSec = Math.max(0, Math.floor(deltaMs / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHr = Math.floor(deltaMin / 60);
  return `${deltaHr}h ago`;
}
