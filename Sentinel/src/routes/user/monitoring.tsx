import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { FaceDetectionOverlay } from "@/components/user/FaceDetectionOverlay";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { useFatigueMonitor } from "@/hooks/useFatigueMonitor";
import { fatigueAlertBus } from "@/lib/fatigue/alertBus";
import { riskLabel } from "@/lib/fatigue/riskScore";
import { saveSession, saveSessionToDb } from "@/lib/fatigue/sessionStore";
import { Square, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/user/monitoring")({
  component: Monitoring,
});

// Stable per-session worker identifier. In a real backend this would come
// from auth; we synthesize one for the demo so manager dashboards can key on it.
const CURRENT_WORKER_ID = "WK-MARCUS-CHEN";
const CURRENT_WORKER_NAME = "Marcus Chen";

function Monitoring() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const {
    cameraStatus,
    faceDetected,
    faceBox,
    eyePositions,
    eyeState,
    eyeOpenness,
    error,
    startCamera,
    stopCamera,
  } = useFaceDetection(videoRef);

  const fatigue = useFatigueMonitor({
    workerId: CURRENT_WORKER_ID,
    workerName: CURRENT_WORKER_NAME,
  });

  // Auto-start camera when the screen mounts.
  useEffect(() => {
    sessionStartRef.current = Date.now();
    void startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTerminate() {
    // Snapshot current session data before stopping
    const snap = {
      score: fatigue.score,
      level: fatigue.level,
      blinkRate: fatigue.blinkRate,
      eyeClosure: fatigue.eyeClosure,
      focus: fatigue.focus,
      trend: fatigue.trend.length ? fatigue.trend : [fatigue.score],
      durationSeconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
    };
    saveSession(snap);
    // Also persist to Supabase (async, fire-and-forget — dashboard will fetch it)
    void saveSessionToDb(snap);
    stopCamera();
    toast.success("Session terminated — results saved to dashboard.");
    navigate({ to: "/user/dashboard" });
  }

  // Feed every detection result into the fatigue monitor.
  useEffect(() => {
    if (!faceDetected) return;
    // Approximate focus from average eye openness (proxy until gaze model lands).
    const opens = [eyeOpenness.left, eyeOpenness.right].filter(
      (v): v is number => v != null,
    );
    const avgOpen = opens.length ? opens.reduce((a, b) => a + b, 0) / opens.length : 1;
    fatigue.ingest({
      t: performance.now(),
      eyesClosed: eyeState === "closed",
      focus: avgOpen,
    });
  }, [faceDetected, eyeState, eyeOpenness.left, eyeOpenness.right, fatigue]);

  // Surface worker alerts as on-screen toasts (Moderate+ level).
  useEffect(() => {
    const off = fatigueAlertBus.on("workerAlert", (p) => {
      if (p.workerId !== CURRENT_WORKER_ID) return;
      if (p.level === "high") {
        toast.error(p.message, { description: `Score ${p.score}/100`, duration: 8000 });
      } else {
        toast.warning(p.message, { description: `Score ${p.score}/100`, duration: 6000 });
      }
    });
    return off;
  }, []);

  // ----- Bind detection state to existing UI text/pills -----
  const faceStatusLabel = faceDetected ? "FACE DETECTED" : "NO FACE DETECTED";
  const eyeStatusLabel =
    eyeState === "open"
      ? "EYES OPEN"
      : eyeState === "closed"
        ? "EYES CLOSED"
        : "—";
  const lockLabel =
    cameraStatus === "loading"
      ? "INITIALIZING"
      : cameraStatus === "denied"
        ? "PERMISSION DENIED"
        : cameraStatus === "error"
          ? "CAMERA ERROR"
          : faceDetected
            ? "LOCKED"
            : "SEARCHING";
  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery="98% BLE" />
      <main className="flex-1 px-5 pb-6 space-y-5">
        {/* Live stream panel */}
        <div className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold leading-tight">
                Hive IoT Real-time<br />Stream
              </h1>
              <div className="label-eyebrow mt-2">Node ID: HV-CORE-09</div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-gold-foreground">
              <span className="live-dot bg-gold" />
              LIVE<br />SYNCING
            </div>
          </div>

          {/* Heart rate bars */}
          <div className="mt-5 rounded-2xl bg-secondary p-4">
            <div className="flex items-start justify-between">
              <div className="label-eyebrow">Heart Rate (BPM)</div>
              <div className="font-display text-3xl font-bold text-gold/70">78</div>
            </div>
            <div className="mt-3 flex items-end justify-between h-20 gap-1.5">
              {[0.55, 0.7, 0.45, 0.65, 0.85, 0.6, 0.55, 0.78, 0.95, 0.5, 0.4].map((h, i) => (
                <div
                  key={i}
                  className="bar-col flex-1 rounded-sm"
                  style={{
                    height: `${h * 100}%`,
                    background: i === 8 ? "oklch(0.78 0.13 75)" : "oklch(0.86 0.12 88 / 0.6)",
                    animationDelay: `${i * 40}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Blood pressure */}
          <div className="mt-3 rounded-2xl bg-secondary p-4">
            <div className="flex items-start justify-between">
              <div className="label-eyebrow">Blood Pressure (mmHg)</div>
              <div className="font-display text-3xl font-bold">122/81</div>
            </div>
            <div className="mt-3 flex items-end justify-between h-20 gap-1.5">
              {[0.5, 0.7, 0.4, 0.65, 0.55, 0.45, 0.7, 0.55, 0.75, 0.65, 0.45].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-navy/40"
                  style={{ height: `${h * 100}%` }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleTerminate}
            className="mt-5 w-full rounded-full bg-danger-soft py-3.5 flex items-center justify-center gap-2 text-danger font-bold text-sm tracking-wider"
          >
            <Square className="h-4 w-4 fill-current" /> TERMINATE MONITORING
          </button>
        </div>

        {/* Face detection card */}
        <div className="rounded-2xl overflow-hidden relative bg-navy aspect-[4/3]">
          <FaceDetectionOverlay
            ref={videoRef}
            faceBox={faceBox}
            eyePositions={eyePositions}
            eyeState={eyeState}
          />
          {/* Loading / denied / error states keep using existing dark backdrop */}
          {cameraStatus !== "active" && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy/80 text-navy-foreground text-center px-6">
              <div>
                <div className="label-eyebrow text-gold">
                  {cameraStatus === "loading" && "INITIALIZING CAMERA…"}
                  {cameraStatus === "denied" && "CAMERA PERMISSION DENIED"}
                  {cameraStatus === "error" && "CAMERA UNAVAILABLE"}
                  {cameraStatus === "idle" && "CAMERA OFFLINE"}
                </div>
                {error && (
                  <div className="text-xs opacity-70 mt-2 max-w-xs mx-auto">{error}</div>
                )}
                {(cameraStatus === "denied" || cameraStatus === "error" || cameraStatus === "idle") && (
                  <button
                    onClick={() => void startCamera()}
                    className="mt-3 rounded-full bg-gold-soft text-gold-foreground text-xs font-bold tracking-wider px-4 py-2"
                  >
                    RETRY
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <div className="rounded-md bg-card/95 backdrop-blur px-3 py-1.5">
              <div className="text-[9px] font-bold tracking-widest text-gold-foreground">{faceStatusLabel}</div>
              <div className="text-sm font-bold">{eyeStatusLabel || "—"}</div>
            </div>
          </div>
          {/* Corner brackets */}
          <Bracket position="top-12 left-3" rotate="" />
          <Bracket position="top-12 right-3" rotate="rotate-90" />
          <Bracket position="bottom-12 left-3" rotate="-rotate-90" />
          <Bracket position="bottom-12 right-3" rotate="rotate-180" />
          <div className="absolute bottom-3 left-3 rounded bg-card/95 px-2 py-1 text-[10px] font-bold tracking-wider">
            CAM_04_WIDE
          </div>
          <div className="absolute bottom-3 right-3 rounded bg-card/95 px-2 py-1 text-[10px] font-bold tracking-wider">
            {lockLabel}
          </div>
        </div>

        {/* Aggregate risk */}
        <div className="panel p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-semibold">Aggregate Risk</div>
            <div className="mt-3 font-display text-4xl font-bold">
              {fatigue.score}<span className="text-xl text-muted-foreground">%</span>
            </div>
            <div className="label-eyebrow mt-1">{riskLabel(fatigue.level)}</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="h-1.5 w-20 rounded-full bg-gold-soft mb-3" />
            <div className="flex items-end gap-1 h-12">
              {(fatigue.trend.length ? fatigue.trend.slice(-4) : [4, 7, 9, 12]).map((h, i) => (
                <span
                  key={i}
                  className="w-2 rounded-sm bg-gold"
                  style={{ height: `${Math.max(4, (h / 100) * 48)}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Event telemetry */}
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold mb-3">
            <span className="h-5 w-5 rounded bg-gold-soft inline-flex items-center justify-center">
              <BarChart3 className="h-3 w-3 text-gold-foreground" />
            </span>
            Event Telemetry
          </h2>
          <div className="panel p-3 space-y-2 stagger">
            <TelRow time="14:02:11" text="IoT Hub: Heart rate variance +/- 2 BPM" tag="STABLE" tagColor="bg-gold-soft text-gold-foreground" />
            <TelRow time="14:01:54" text="BLE Signal strength reinforced" tag="NOMINAL" tagColor="text-muted-foreground" />
            <TelRow time="13:59:22" text="Device Auth: Token v2 rotation success" tag="SYSTEM" tagColor="text-muted-foreground" />
          </div>
        </div>

        {/* Device management */}
        <div className="panel p-5">
          <div className="label-eyebrow">Device Management</div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm">Sync Rate (50ms)</span>
            <MiniToggle on />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm">Force Calibration</span>
            <MiniToggle on={false} />
          </div>
          <button className="mt-5 w-full rounded-2xl btn-gold py-3 text-sm font-bold tracking-wider">
            RESET HIVE NODE
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Bracket({ position, rotate }: { position: string; rotate: string }) {
  return (
    <div className={`absolute ${position} ${rotate} h-6 w-6 border-t-2 border-l-2 border-gold`} />
  );
}

function TelRow({ time, text, tag, tagColor }: { time: string; text: string; tag: string; tagColor: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5">
      <span className="text-[10px] font-mono font-bold text-gold/60 w-14">{time}</span>
      <span className="flex-1 text-sm">{text}</span>
      <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${tagColor}`}>{tag}</span>
    </div>
  );
}

function MiniToggle({ on }: { on: boolean }) {
  return (
    <div className={`relative h-6 w-11 rounded-full ${on ? "bg-gold" : "bg-muted"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${on ? "left-[22px]" : "left-0.5"}`} />
    </div>
  );
}
