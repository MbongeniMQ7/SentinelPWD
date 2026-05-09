import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { FaceDetectionOverlay } from "@/components/user/FaceDetectionOverlay";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { useFatigueMonitor } from "@/hooks/useFatigueMonitor";
import { fatigueAlertBus } from "@/lib/fatigue/alertBus";
import { riskLabel } from "@/lib/fatigue/riskScore";
import { saveSession, startSessionInDb, stopSessionInDb, interruptSessionInDb } from "@/lib/fatigue/sessionStore";
import { Square, BarChart3, Brain, Zap, Activity, ShieldAlert } from "lucide-react";
import type { EmotionLabel } from "@/hooks/useFaceDetection";

const EMOTION_EMOJI: Record<EmotionLabel, string> = {
  HAPPY:     "😊",
  SAD:       "😢",
  ANGRY:     "😠",
  SURPRISED: "😮",
  DISGUSTED: "🤢",
  FEARFUL:   "😨",
  NEUTRAL:   "😐",
};
import { useAuth } from "@/context/AuthContext";
import { useHiveIot } from "@/hooks/useHiveIot";

export const Route = createFileRoute("/user/monitoring")(
  {
    component: Monitoring,
  }
);

function Monitoring() {
  const { profile } = useAuth();
  const workerId = profile?.profile_id ?? "anonymous";
  const workerName = profile ? `${profile.first_name} ${profile.last_name}` : "Unknown";

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const dbSessionIdRef = useRef<string | null>(null);
  const {
    cameraStatus,
    faceDetected,
    faceBox,
    eyePositions,
    eyeState,
    eyeOpenness,
    headPose,
    fearScore: rawFearScore,
    emotion,
    error,
    startCamera,
    stopCamera,
  } = useFaceDetection(videoRef);

  const fatigue = useFatigueMonitor({
    workerId,
    workerName,
  });

  // ── IoT wristband ──────────────────────────────────────────────────
  const hive = useHiveIot({ interval: 2000 });

  // Rolling BPM history (11 slots, normalized 0–1 across 40–180 BPM)
  const BPM_SLOTS = 11;
  const bpmHistRef = useRef<number[]>(Array(BPM_SLOTS).fill(0.1));
  const [bpmHistory, setBpmHistory] = useState<number[]>(Array(BPM_SLOTS).fill(0.1));

  useEffect(() => {
    if (hive.data?.bpm == null) return;
    const norm = Math.max(0.05, Math.min(1, (hive.data.bpm - 40) / 140));
    bpmHistRef.current = [...bpmHistRef.current.slice(1), norm];
    setBpmHistory([...bpmHistRef.current]);
  }, [hive.data?.bpm]);

  // Rolling fatigue-score history for the state chart
  const scoreHistRef = useRef<number[]>(Array(BPM_SLOTS).fill(0.1));
  const [scoreHistory, setScoreHistory] = useState<number[]>(Array(BPM_SLOTS).fill(0.1));

  useEffect(() => {
    const norm = Math.max(0.05, Math.min(1, fatigue.score / 100));
    scoreHistRef.current = [...scoreHistRef.current.slice(1), norm];
    setScoreHistory([...scoreHistRef.current]);
  }, [fatigue.score]);

  // ── Telemetry log ───────────────────────────────────────────────────
  type TelEntry = { time: string; text: string; tag: string; tagColor: string };
  const [telLog, setTelLog] = useState<TelEntry[]>([]);
  const prevFaceRef = useRef(false);
  const prevHiveStatusRef = useRef<string>("idle");
  const prevLevelRef = useRef("low");

  const addTel = useCallback((text: string, tag: string, tagColor: string) => {
    const t = new Date().toLocaleTimeString("en-US", {
      hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    setTelLog(prev => [{ time: t, text, tag, tagColor }, ...prev].slice(0, 5));
  }, []);

  // Seed initial event on mount
  useEffect(() => {
    addTel("Monitoring session initialized", "SYSTEM", "text-muted-foreground");
  }, [addTel]);

  useEffect(() => {
    if (faceDetected !== prevFaceRef.current) {
      prevFaceRef.current = faceDetected;
      if (faceDetected)
        addTel("Face acquired — biometric analysis active", "LOCKED", "bg-gold-soft text-gold-foreground");
      else
        addTel("Face lost — analysis suspended", "ALERT", "bg-danger-soft text-danger");
    }
  }, [faceDetected, addTel]);

  useEffect(() => {
    if (hive.status !== prevHiveStatusRef.current) {
      prevHiveStatusRef.current = hive.status;
      if (hive.status === "connected")
        addTel(`IoT wristband connected — ${hive.data?.bpm ?? "—"} BPM`, "ACTIVE", "bg-gold-soft text-gold-foreground");
      else if (hive.status === "error")
        addTel("IoT wristband offline — camera-only mode active", "OFFLINE", "text-muted-foreground");
    }
  }, [hive.status, hive.data?.bpm, addTel]);

  useEffect(() => {
    if (fatigue.level !== prevLevelRef.current) {
      prevLevelRef.current = fatigue.level;
      const tagColorMap: Record<string, string> = {
        high: "bg-danger-soft text-danger",
        moderate: "bg-gold-soft text-gold-foreground",
        low: "bg-success-soft text-success",
      };
      addTel(
        `Fatigue level: ${fatigue.level.toUpperCase()} (score ${fatigue.score})`,
        fatigue.level.toUpperCase(),
        tagColorMap[fatigue.level] ?? "text-muted-foreground",
      );
    }
  }, [fatigue.level, fatigue.score, addTel]);

  // Auto-start camera when the screen mounts.
  useEffect(() => {
    sessionStartRef.current = Date.now();
    void startCamera();

    // Create a RUNNING session in the DB so the admin sees it immediately
    startSessionInDb().then(({ sessionId, error }) => {
      if (sessionId) {
        dbSessionIdRef.current = sessionId;
      } else {
        console.warn("[Sentinel] Could not create DB session:", error);
      }
    });

    return () => {
      stopCamera();
      // If the user navigates away without terminating, mark as INTERRUPTED
      if (dbSessionIdRef.current) {
        void interruptSessionInDb(dbSessionIdRef.current);
      }
    };
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

    // Update the DB session to STOPPED with final biometric summary
    const sessionId = dbSessionIdRef.current;
    if (sessionId) {
      dbSessionIdRef.current = null; // prevent the cleanup from also interrupting it
      stopSessionInDb(sessionId, snap).then(({ error }) => {
        if (error) console.warn("[Sentinel] Failed to stop session in DB:", error);
      });
    }

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
      headYaw:   headPose?.yaw,
      headPitch: headPose?.pitch,
      fearScore: rawFearScore ?? undefined,
    });
  }, [faceDetected, eyeState, eyeOpenness.left, eyeOpenness.right, headPose, rawFearScore, fatigue]);

  // Surface worker alerts as on-screen toasts (Moderate+ level).
  useEffect(() => {
    const off = fatigueAlertBus.on("workerAlert", (p) => {
      if (p.workerId !== workerId) return;
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
      <AppHeader battery="98% BLE" title="Live Monitoring" />
      <main className="flex-1 px-8 py-6 space-y-5 w-full">
        {/* Live stream panel */}
        <div className="panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold leading-tight">
                SentinelAI Real-time<br />Biometrics
              </h1>
              <div className="label-eyebrow mt-2">
                Session: {profile?.profile_id?.slice(0, 8).toUpperCase() ?? "—"}
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-widest ${
              hive.status === "connected" ? "text-gold-foreground" : "text-muted-foreground"
            }`}>
              <span className={`live-dot ${hive.status === "connected" ? "bg-gold" : "bg-muted-foreground"}`} />
              {hive.status === "connected" ? <>LIVE<br />SYNCING</> : <>IOT<br />{hive.status.toUpperCase()}</>}
            </div>
          </div>

          {/* Heart rate — real from IoT wristband */}
          <div className="mt-5 rounded-2xl bg-secondary p-4">
            <div className="flex items-start justify-between">
              <div className="label-eyebrow">Heart Rate (BPM)</div>
              <div className="font-display text-3xl font-bold text-gold/70">
                {hive.data?.bpm ?? <span className="text-muted-foreground text-xl animate-pulse">—</span>}
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between h-20 gap-1.5">
              {bpmHistory.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-500"
                  style={{
                    height: `${Math.max(4, h * 100)}%`,
                    background: i === bpmHistory.length - 1
                      ? "oklch(0.78 0.13 75)"
                      : "oklch(0.86 0.12 88 / 0.6)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Physiological state — real from IoT wristband */}
          <div className="mt-3 rounded-2xl bg-secondary p-4">
            <div className="flex items-start justify-between">
              <div className="label-eyebrow">Physiological State</div>
              <div className={`font-display text-2xl font-bold ${
                hive.data?.state === "PANIC" || hive.data?.state === "FATIGUE"
                  ? "text-danger"
                  : hive.data?.state === "TIRED"
                    ? "text-warning-foreground"
                    : hive.data?.state === "NORMAL"
                      ? "text-success"
                      : "text-muted-foreground"
              }`}>
                {hive.data?.state ?? <span className="animate-pulse">—</span>}
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between h-20 gap-1.5">
              {scoreHistory.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-700"
                  style={{
                    height: `${Math.max(4, h * 100)}%`,
                    background: "oklch(0.55 0.05 260 / 0.45)",
                  }}
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

        {/* Real-time scores grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="panel p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-warning-foreground" />
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">FATIGUE</span>
            </div>
            <div className="font-display text-3xl font-bold">{fatigue.score}<span className="text-sm text-muted-foreground">/100</span></div>
          </div>
          <div className="panel p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-danger" />
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">STRESS</span>
            </div>
            <div className="font-display text-3xl font-bold">
              {Math.min(100, Math.round(
                (fatigue.blinkRate > 20 ? Math.min(100, Math.round(((fatigue.blinkRate - 20) / 25) * 100)) : 0) * 0.6 +
                (1 - Math.min(1, Math.max(0, fatigue.focus))) * 100 * 0.4
              ))}<span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="panel p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-gold-foreground" />
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">FOCUS</span>
            </div>
            <div className="font-display text-3xl font-bold">{Math.round(fatigue.focus * 100)}<span className="text-sm text-muted-foreground">%</span></div>
          </div>
          <div className="panel p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-navy" />
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">RISK</span>
            </div>
            <div className={`font-display text-lg font-bold mt-1 ${
              fatigue.level === 'high' ? 'text-danger' : fatigue.level === 'moderate' ? 'text-warning-foreground' : 'text-success'
            }`}>{riskLabel(fatigue.level)}</div>
          </div>
          <div className="col-span-2 panel p-4">
            <div className="text-[10px] font-bold tracking-widest text-muted-foreground mb-3">EMOTION ANALYSIS</div>
            {emotion ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{EMOTION_EMOJI[emotion.dominant]}</span>
                  <div>
                    <div className="font-display text-xl font-bold leading-none">{emotion.dominant}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Dominant expression</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {(Object.keys(emotion.scores) as EmotionLabel[]).map((label) => {
                    const pct = Math.round(emotion!.scores[label] * 100);
                    const isDominant = label === emotion!.dominant;
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-sm w-5">{EMOTION_EMOJI[label]}</span>
                        <span className="text-[10px] font-bold w-20 text-muted-foreground">{label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              background: isDominant ? "oklch(0.78 0.13 75)" : "oklch(0.55 0.05 260 / 0.6)",
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No face detected</div>
            )}
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
          <div className="panel p-3 space-y-2">
            {telLog.length === 0 ? (
              <div className="text-sm text-muted-foreground px-1 py-1">Awaiting events…</div>
            ) : (
              telLog.map((e, i) => (
                <TelRow key={i} time={e.time} text={e.text} tag={e.tag} tagColor={e.tagColor} />
              ))
            )}
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
            RESET SENTINEL NODE
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
