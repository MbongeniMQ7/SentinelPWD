import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { Radio, Heart, Activity, Footprints, Play, Pause, AlertTriangle, ShieldAlert, CheckCircle2, WifiOff } from "lucide-react";
import { useWorkforceStatus } from "@/hooks/useFatigueMonitor";
import { useHiveIot } from "@/hooks/useHiveIot";
import { riskLabel, type RiskLevel } from "@/lib/fatigue/riskScore";
import type { HiveIotData } from "@/hooks/useHiveIot";

/**
 * Converts the live API payload into a 0–100 fatigue percentage.
 *
 * The device exposes four named bands using its own threshold values:
 *
 *   Band         BPM range                   Score range   Why
 *   ──────────── ─────────────────────────── ─────────────────────────────────
 *   FATIGUE      bpm ≤ fatigueThresh         85 – 100 %   Dangerously low HR
 *   NORMAL       fatigueThresh < bpm ≤       0 – 39 %     Healthy resting zone
 *                  normalHigh                              (0 % at baseline,
 *                                                          39 % at normalHigh)
 *   TIRED        normalHigh < bpm ≤          40 – 69 %    Elevated HR stress
 *                  tiredThresh
 *   PANIC        bpm > tiredThresh           70 – 100 %   Critical elevated HR
 *
 * All boundaries come exclusively from the API response — no magic numbers.
 */
function lerp(value: number, inLo: number, inHi: number, outLo: number, outHi: number): number {
  if (inHi === inLo) return outLo;
  const t = Math.max(0, Math.min(1, (value - inLo) / (inHi - inLo)));
  return Math.round(outLo + t * (outHi - outLo));
}

function computeHiveFatigueScore(d: HiveIotData): number {
  const { bpm, baseline, normalHigh, tiredThresh, panicThresh, fatigueThresh } = d;

  // FATIGUE band: bpm dropped to or below the fatigue threshold (too slow)
  if (bpm <= fatigueThresh) {
    // The further below fatigueThresh, the worse — but floor at 85
    return lerp(bpm, fatigueThresh - 20, fatigueThresh, 100, 85);
  }

  // PANIC band: bpm above tiredThresh
  if (bpm > tiredThresh) {
    return lerp(bpm, tiredThresh, panicThresh, 70, 100);
  }

  // TIRED band: bpm between normalHigh and tiredThresh
  if (bpm > normalHigh) {
    return lerp(bpm, normalHigh, tiredThresh, 40, 69);
  }

  // NORMAL band: bpm between fatigueThresh and normalHigh
  // Lowest fatigue at the personal baseline, rising toward either edge
  const anchor = baseline > fatigueThresh && baseline < normalHigh ? baseline : (fatigueThresh + normalHigh) / 2;
  const distFromBaseline = Math.abs(bpm - anchor);
  const maxDist = Math.max(anchor - fatigueThresh, normalHigh - anchor, 1);
  return Math.round((distFromBaseline / maxDist) * 39);
}

function computeHiveRiskLevel(state: string): RiskLevel {
  if (state === "PANIC" || state === "FATIGUE") return "high";
  if (state === "TIRED") return "moderate";
  return "low";
}
import { loadAlertsFromDb, type DbAlert } from "@/lib/fatigue/alertLog";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/user/home")({
  component: Home,
});

function Home() {
  const { profile } = useAuth();
  const [monitoring, setMonitoring] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<DbAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const workforce = useWorkforceStatus();
  const hive = useHiveIot({ interval: 2000 });

  useEffect(() => {
    loadAlertsFromDb(5).then(({ alerts }) => {
      setRecentAlerts(alerts);
      setAlertsLoading(false);
    });
  }, []);
  const snap = workforce.workers[profile?.profile_id ?? ""];
  const liveScore = snap?.score ?? 0;
  const liveLevel = snap?.level ?? "low";
  const liveBlinkRate = snap ? Math.round(snap.blinkRate) : null;

  // When the IoT device is connected, derive score & level from real BPM data
  const hiveConnected = hive.status === "connected" && hive.data != null;
  const displayScore = hiveConnected ? computeHiveFatigueScore(hive.data!) : liveScore;
  const displayLevel = hiveConnected ? computeHiveRiskLevel(hive.data!.state) : liveLevel;

  // Derive badge colours from risk level — same tokens already in the stylesheet.
  const badgeClass =
    displayLevel === "high"
      ? "bg-danger-soft text-danger"
      : displayLevel === "moderate"
        ? "bg-gold-soft text-gold-foreground"
        : "bg-success-soft text-success";
  const dotClass =
    displayLevel === "high"
      ? "bg-danger"
      : displayLevel === "moderate"
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
            <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
              hive.status === "connected" ? "bg-success-soft" : "bg-muted"
            }`}>
              {hive.status === "connected"
                ? <Radio className="h-4 w-4 text-success" />
                : <WifiOff className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div>
              <div className="label-eyebrow">SentinelAI IoT Status</div>
              <div className="text-xs text-muted-foreground">
                {hive.status === "connected"
                  ? `Live — ${hive.data?.state ?? "—"}`
                  : hive.status === "connecting"
                  ? "Connecting…"
                  : hive.error ?? "Offline"}
              </div>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-bold ${
            hive.status === "connected" ? "text-success" : "text-muted-foreground"
          }`}>
            <span className={`live-dot ${
              hive.status === "connected" ? "bg-success" : "bg-muted-foreground"
            }`} />
            {hive.status === "connected" ? "ACTIVE" : hive.status.toUpperCase()}
          </span>
        </div>

        {/* Fatigue ring */}
        <div className="flex flex-col items-center pt-3">
          <div className={`relative h-64 w-64 flex items-center justify-center rounded-full ${
            displayLevel === "high" ? "ring-glow-high" : displayLevel === "moderate" ? "ring-glow-moderate" : "ring-glow-low"
          }`}>
            <div className="absolute inset-0 rounded-full bg-gold/15" />
            <div className="absolute inset-4 rounded-full bg-gold-soft/60" />
            <div className="absolute inset-8 rounded-full bg-card shadow-inner" />
            <div className="relative text-center">
              <div className="text-6xl font-display font-bold tracking-tight">{displayScore}%</div>
              <div className="label-eyebrow mt-1">Fatigue Score</div>
              {hiveConnected && (
                <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  {hive.data!.bpm} BPM · IoT Live
                </div>
              )}
              <div className="mt-3 w-12 h-px bg-border mx-auto" />
              <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full ${badgeClass} px-3 py-1.5 text-[11px] font-bold`}>
                <span className={`live-dot ${dotClass}`} /> {hiveConnected ? hive.data!.state : riskLabel(displayLevel).toUpperCase()}
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
              {hive.data != null
                ? <>{hive.data.bpm} <span className="text-xs text-muted-foreground font-sans font-semibold">BPM</span></>
                : <span className="text-muted-foreground text-lg animate-pulse">—</span>
              }
            </div>
            {hive.data?.learning && (
              <div className="text-[10px] text-gold-foreground font-semibold mt-0.5">Calibrating baseline…</div>
            )}
            {hive.status === "error" && (
              <div className="text-[10px] text-destructive font-semibold mt-0.5">Device unreachable</div>
            )}
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
            <div className={`font-display text-xl font-bold ${hive.data == null ? "text-muted-foreground" : ""}`}>
              {hive.data != null ? "— mmHg" : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Wristband: BPM only</div>
          </div>
          <div className="panel p-4">
            <Footprints className="h-5 w-5 text-gold-foreground" />
            <div className="label-eyebrow mt-3">Activity Level</div>
            <div className={`font-display text-xl font-bold ${
              hive.data?.state === "PANIC" || hive.data?.state === "FATIGUE" ? "text-danger" :
              hive.data?.state === "TIRED" ? "text-warning-foreground" :
              hive.data?.state === "NORMAL" ? "text-success" : "text-muted-foreground"
            }`}>
              {hive.data?.state === "PANIC" || hive.data?.state === "FATIGUE" ? "Critical" :
               hive.data?.state === "TIRED" ? "Elevated" :
               hive.data?.state === "NORMAL" ? "Normal" : "—"}
            </div>
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
