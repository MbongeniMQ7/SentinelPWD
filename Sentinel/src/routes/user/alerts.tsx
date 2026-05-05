import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { AlertTriangle, Activity, AlertCircle, OctagonAlert, SlidersHorizontal, BellOff, Loader2 } from "lucide-react";
import {
  useAlertLog,
  acknowledgeAlert,
  acknowledgeAlertInDb,
  loadAlertsFromDb,
  type DbAlert,
} from "@/lib/fatigue/alertLog";

// Must match the ID used in monitoring.tsx so alerts are attributed correctly.
const CURRENT_WORKER_ID = "WK-MARCUS-CHEN";

export const Route = createFileRoute("/user/alerts")({
  component: Alerts,
});

function Alerts() {
  // Live in-memory alerts from the current session
  const alertLog = useAlertLog();
  const liveAlerts = alertLog.filter(
    (a) => a.kind === "worker" && a.workerId === CURRENT_WORKER_ID && !a.acknowledged,
  );
  const liveHighAlerts = liveAlerts.filter((a) => a.level === "high");
  const liveModerateAlerts = liveAlerts.filter((a) => a.level === "moderate");

  // DB-persisted alert history
  const [dbAlerts, setDbAlerts] = useState<DbAlert[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    loadAlertsFromDb(50).then(({ alerts }) => {
      setDbAlerts(alerts);
      setDbLoading(false);
    });
  }, []);

  // Past 24h DB alerts (not acknowledged), excluding any that are already shown as live
  const liveIds = new Set(alertLog.map((a) => new Date(a.timestamp).toISOString().slice(0, 19)));
  const now = Date.now();
  const past24h = dbAlerts.filter((a) => {
    const age = now - new Date(a.fired_at).getTime();
    return age <= 24 * 60 * 60 * 1000;
  });
  const olderAlerts = dbAlerts.filter((a) => {
    const age = now - new Date(a.fired_at).getTime();
    return age > 24 * 60 * 60 * 1000;
  });

  const [showOlder, setShowOlder] = useState(false);

  async function handleAcknowledge(dbId: string, liveId?: string) {
    // Acknowledge in-memory
    if (liveId) acknowledgeAlert(liveId);
    // Acknowledge in DB
    await acknowledgeAlertInDb(dbId);
    setDbAlerts((prev) =>
      prev.map((a) => (a.id === dbId ? { ...a, acknowledged: true } : a))
    );
    toast("Alert dismissed");
  }

  async function handleAcknowledgeLiveOnly(liveId: string) {
    acknowledgeAlert(liveId);
    toast("Alert dismissed");
  }

  const unacknowledgedCount = liveAlerts.length + past24h.filter((a) => !a.acknowledged).length;

  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery={null} />
      <main className="flex-1 px-5 pb-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Safety Alerts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unacknowledgedCount > 0
                ? `${unacknowledgedCount} unresolved alert${unacknowledgedCount !== 1 ? "s" : ""}`
                : "All clear â€” no active alerts"}
            </p>
          </div>
          {unacknowledgedCount > 0 && (
            <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[10px] font-bold text-danger tracking-widest mt-1">
              LIVE
            </span>
          )}
        </div>

        {/* â”€â”€ Live HIGH fatigue alerts (current session) â”€â”€ */}
        {liveHighAlerts.length > 0 && (
          <>
            <span className="label-eyebrow">Critical â€” Right Now</span>
            {liveHighAlerts.map((a) => (
              <div key={a.id} className="panel p-4 border-l-4 border-l-danger">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-danger-soft flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-danger" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between gap-2">
                      <h3 className="font-display font-bold text-lg leading-tight">High Fatigue Detected</h3>
                      <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground h-fit shrink-0">
                        {formatRelative(a.timestamp)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your fatigue score reached {a.score}/100. {a.message}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link to="/user/breaks" className="rounded-xl bg-navy text-navy-foreground text-xs font-bold px-4 py-2.5">
                        Request Break
                      </Link>
                      <Link to="/user/leave" className="rounded-xl bg-gold-soft text-gold-foreground text-xs font-bold px-4 py-2.5">
                        Apply Leave
                      </Link>
                      <button
                        onClick={() => handleAcknowledgeLiveOnly(a.id)}
                        className="rounded-xl bg-secondary text-xs font-bold px-4 py-2.5"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Live MODERATE fatigue alerts (current session) ── */}
        {liveModerateAlerts.length > 0 && (
          <>
            <span className="label-eyebrow">Elevated Risk — Right Now</span>
            {liveModerateAlerts.map((a) => (
              <div key={a.id} className="panel p-4 border-l-4 border-l-gold">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gold-soft flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5 text-gold-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between gap-2">
                      <h3 className="font-display font-bold text-lg leading-tight">Elevated Fatigue Risk</h3>
                      <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground h-fit shrink-0">
                        {formatRelative(a.timestamp)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your fatigue score reached {a.score}/100. {a.message}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link to="/user/breaks" className="rounded-xl bg-navy text-navy-foreground text-xs font-bold px-4 py-2.5">
                        Request Break
                      </Link>
                      <button
                        onClick={() => handleAcknowledgeLiveOnly(a.id)}
                        className="rounded-xl bg-secondary text-xs font-bold px-4 py-2.5"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Past 24 hours from DB ── */}
        <div className="flex items-center justify-between pt-2">
          <span className="label-eyebrow">Past 24 Hours</span>
          <button
            onClick={() => {
              const unacked = past24h.filter((a) => !a.acknowledged);
              if (unacked.length === 0) return;
              unacked.forEach((a) => acknowledgeAlertInDb(a.id));
              setDbAlerts((prev) =>
                prev.map((a) =>
                  past24h.find((p) => p.id === a.id) ? { ...a, acknowledged: true } : a
                )
              );
              toast("All alerts cleared");
            }}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            Clear all <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        {dbLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : past24h.length === 0 ? (
          <div className="panel p-6 flex flex-col items-center gap-2 text-center">
            <BellOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-muted-foreground">No alerts in the last 24 hours</p>
            <p className="text-xs text-muted-foreground">Alerts are generated automatically when fatigue levels are elevated during monitoring.</p>
          </div>
        ) : (
          past24h.map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              onAcknowledge={() => handleAcknowledge(a.id)}
            />
          ))
        )}

        {/* â”€â”€ Older alerts â”€â”€ */}
        {olderAlerts.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowOlder((v) => !v)}
              className="w-full text-center label-eyebrow py-2"
            >
              {showOlder ? "Hide" : `Load ${olderAlerts.length} older alert${olderAlerts.length !== 1 ? "s" : ""}`}
            </button>
            {showOlder &&
              olderAlerts.map((a) => (
                <AlertRow
                  key={a.id}
                  alert={a}
                  onAcknowledge={() => handleAcknowledge(a.id)}
                />
              ))}
          </>
        )}

        {/* All clear state */}
        {!dbLoading && liveAlerts.length === 0 && dbAlerts.length === 0 && (
          <div className="panel p-6 flex flex-col items-center gap-3 text-center mt-4">
            <div className="h-14 w-14 rounded-full bg-success-soft flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-success" />
            </div>
            <p className="font-display font-bold text-lg">You're all clear</p>
            <p className="text-sm text-muted-foreground">No fatigue alerts have been recorded yet. Start a monitoring session to begin tracking.</p>
            <Link to="/user/monitoring" className="rounded-xl bg-navy text-navy-foreground text-xs font-bold px-5 py-2.5 mt-1">
              Start Monitoring
            </Link>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function AlertRow({
  alert,
  onAcknowledge,
}: {
  alert: DbAlert;
  onAcknowledge: () => void;
}) {
  const isHigh = alert.level === "high";
  return (
    <div
      className={`panel p-4 border-l-4 ${isHigh ? "border-l-danger" : "border-l-gold"} ${alert.acknowledged ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${isHigh ? "bg-danger-soft" : "bg-gold-soft"}`}
        >
          {isHigh ? (
            <OctagonAlert className="h-4 w-4 text-danger" />
          ) : (
            <Activity className="h-4 w-4 text-gold-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold">
                {isHigh ? "High Fatigue Detected" : "Elevated Fatigue Risk"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
            </div>
            <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground shrink-0">
              {formatRelative(new Date(alert.fired_at).getTime())}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isHigh ? "bg-danger-soft text-danger" : "bg-gold-soft text-gold-foreground"}`}
            >
              Score {alert.score}/100
            </span>
            {!alert.acknowledged && (
              <button
                onClick={onAcknowledge}
                className="text-xs font-semibold text-muted-foreground hover:text-ink transition"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelative(timestamp: number): string {
  const diffMin = Math.floor((Date.now() - timestamp) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  return `${diffD}d ago`;
}

