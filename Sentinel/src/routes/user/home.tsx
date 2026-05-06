import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { Radio, Heart, Activity, Footprints, Play, Pause, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useWorkforceStatus } from "@/hooks/useFatigueMonitor";
import { riskLabel } from "@/lib/fatigue/riskScore";
import { loadAlertsFromDb, type DbAlert } from "@/lib/fatigue/alertLog";

const CURRENT_WORKER_ID = "WK-MARCUS-CHEN";

export const Route = createFileRoute("/user/home")({
  component: Home,
});

function Home() {
  const [monitoring, setMonitoring] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<DbAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const workforce = useWorkforceStatus();

  useEffect(() => {
    loadAlertsFromDb(5).then(({ alerts }) => {
      setRecentAlerts(alerts);
      setAlertsLoading(false);
    });
  }, []);
  const snap = workforce.workers[CURRENT_WORKER_ID];
  const liveScore = snap?.score ?? 0;
  const liveLevel = snap?.level ?? "low";
  const liveBlinkRate = snap ? Math.round(snap.blinkRate) : null;

  // Derive badge colours from risk level — same tokens already in the stylesheet.
  const badgeClass =
    liveLevel === "high"
      ? "bg-danger-soft text-danger"
      : liveLevel === "moderate"
        ? "bg-gold-soft text-gold-foreground"
        : "bg-success-soft text-success";
  const dotClass =
    liveLevel === "high"
      ? "bg-danger"
      : liveLevel === "moderate"
        ? "bg-gold"
        : "bg-success";

  const toggleMonitoring = () => {
    setMonitoring((m) => {
      const next = !m;
      if (next) toast.success("Monitoring started — biometrics streaming");
      else toast("Monitoring paused");
      return next;
    });
  };
  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery="98% BLE" title="Home" />

      <main className="flex-1 px-8 py-6 space-y-5 w-full">
        {/* IoT status */}
        <div className="panel px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-success-soft flex items-center justify-center">
              <Radio className="h-4 w-4 text-success" />
            </div>
            <div>
              <div className="label-eyebrow">Hive IoT Status</div>
              <div className="text-xs text-muted-foreground">Connected (ID: HIVE-9921)</div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-bold text-success">
            <span className="live-dot bg-success" /> ACTIVE
          </span>
        </div>

        {/* Fatigue ring */}
        <div className="flex flex-col items-center pt-3">
          <div className={`relative h-64 w-64 flex items-center justify-center rounded-full ${
            liveLevel === "high" ? "ring-glow-high" : liveLevel === "moderate" ? "ring-glow-moderate" : "ring-glow-low"
          }`}>
            <div className="absolute inset-0 rounded-full bg-gold/15" />
            <div className="absolute inset-4 rounded-full bg-gold-soft/60" />
            <div className="absolute inset-8 rounded-full bg-card shadow-inner" />
            <div className="relative text-center">
              <div className="text-6xl font-display font-bold tracking-tight">{liveScore}%</div>
              <div className="label-eyebrow mt-1">Fatigue Score</div>
              <div className="mt-3 w-12 h-px bg-border mx-auto" />
              <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full ${badgeClass} px-3 py-1.5 text-[11px] font-bold`}>
                <span className={`live-dot ${dotClass}`} /> {riskLabel(liveLevel).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Heart rate */}
        <div className="panel px-4 py-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-danger-soft flex items-center justify-center">
            <Heart className="h-5 w-5 text-danger" />
          </div>
          <div className="flex-1">
            <div className="label-eyebrow">Heart Rate</div>
            <div className="font-display text-2xl font-bold">
              {liveBlinkRate ?? 72} <span className="text-xs text-muted-foreground font-sans font-semibold">BPM</span>
            </div>
          </div>
          <div className="flex items-end gap-0.5 h-8">
            {[3, 5, 4, 6, 7, 5, 8, 4, 6].map((h, i) => (
              <span key={i} className="bar-col w-1 bg-gold rounded-sm" style={{ height: `${h * 4}px`, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 stagger">
          <div className="panel p-4">
            <Activity className="h-5 w-5 text-navy" />
            <div className="label-eyebrow mt-3">Blood Pressure</div>
            <div className="font-display text-xl font-bold">120/80</div>
          </div>
          <div className="panel p-4">
            <Footprints className="h-5 w-5 text-gold-foreground" />
            <div className="label-eyebrow mt-3">Activity Level</div>
            <div className="font-display text-xl font-bold">Moderate</div>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={toggleMonitoring}
          className="w-full rounded-2xl btn-gold py-5 flex items-center justify-center gap-2 font-display font-bold text-lg"
        >
          {monitoring ? <><Pause className="h-5 w-5 fill-current" /> Pause Monitoring</> : <><Play className="h-5 w-5 fill-current" /> Start Monitoring</>}
        </button>
        <Link
          to="/user/dashboard"
          className="block w-full rounded-2xl border border-border py-3.5 flex items-center justify-center gap-2 text-foreground/80 font-bold text-sm"
        >
          View My Fatigue Dashboard
        </Link>
        <p className="text-center label-eyebrow">
          System Active: Biometric Sensors Calibrated
        </p>

        {/* Alerts */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xl font-display font-bold">Recent Alerts</h2>
          <Link to="/user/alerts" className="text-xs font-bold tracking-wide text-muted-foreground">
            SEE ALL
          </Link>
        </div>

        {alertsLoading ? (
          <>
            <div className="panel p-3 h-14 animate-pulse bg-secondary/50 rounded-2xl" />
            <div className="panel p-3 h-14 animate-pulse bg-secondary/50 rounded-2xl" />
          </>
        ) : recentAlerts.length === 0 ? (
          <div className="panel p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-success-soft flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <div className="text-sm text-muted-foreground">No alerts recorded yet — all clear.</div>
          </div>
        ) : (
          recentAlerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function AlertRow({ alert }: { alert: DbAlert }) {
  const isHigh = alert.level === "high";
  const iconBg = isHigh ? "bg-danger-soft" : "bg-warning-soft";
  const icon = isHigh
    ? <ShieldAlert className="h-4 w-4 text-danger" />
    : <AlertTriangle className="h-4 w-4 text-warning" />;
  const time = new Date(alert.fired_at).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="panel p-3 flex items-start gap-3">
      <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-semibold text-sm truncate capitalize">
            {isHigh ? "High Risk Alert" : "Moderate Alert"}
          </div>
          <div className="text-xs text-muted-foreground shrink-0">{time}</div>
        </div>
        <div className="text-xs text-muted-foreground truncate">{alert.message}</div>
      </div>
    </div>
  );
}
