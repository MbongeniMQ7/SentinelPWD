/**
 * useFatigueMonitor
 *
 * Consumes the per-frame biometric stream from `useFaceDetection` and produces:
 *   - current fatigue score (0..100)
 *   - rolling trend (recent samples, capped) for the worker dashboard sparkline
 *   - workforce-level snapshot for the manager dashboard
 *   - fires workerAlert / managerAlert events through the alert bus
 *
 * Performance contract:
 *   - All heavy work happens in refs/buffers; React state is only updated on
 *     a 1Hz "publish tick" so the render loop never re-renders at 30 FPS.
 *   - Blink and PERCLOS are computed on a sliding window in O(1) per frame
 *     using a deque of timestamps.
 *   - No allocations on the hot path beyond pushes/shifts on bounded buffers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateFatigueScore,
  mapRiskLevel,
  type RiskLevel,
} from "@/lib/fatigue/riskScore";
import {
  fatigueAlertBus,
  type WorkerAlertPayload,
} from "@/lib/fatigue/alertBus";

// ---------- Types ----------

export interface BiometricSample {
  /** performance.now() timestamp in ms. */
  t: number;
  /** Whether eyes are currently closed this frame. */
  eyesClosed: boolean;
  /** Optional focus 0..1 (1 = fully focused) derived from eye openness. */
  focus?: number;
  /**
   * Head yaw angle in degrees from landmark geometry (positive = turned right).
   * When provided, reduces the effective focus score if the head is turned away.
   */
  headYaw?: number;
  /**
   * Head pitch angle in degrees from landmark geometry (positive = looking down).
   * When provided, reduces the effective focus score if the head is tilted.
   */
  headPitch?: number;
  /**
   * Fear / distress score in [0..1] from blendshape analysis.
   * Surfaced as a separate metric on the dashboard.
   */
  fearScore?: number;
}

export interface WorkerSnapshot {
  workerId: string;
  workerName?: string;
  score: number;
  level: RiskLevel;
  blinkRate: number;
  eyeClosure: number;
  focus: number;
  fearScore: number;
  trend: number[]; // bounded ring of recent scores
  lastUpdate: number;
}

export interface WorkforceStatus {
  total: number;
  byLevel: Record<RiskLevel, number>;
  workers: Record<string, WorkerSnapshot>;
  highRiskIds: string[];
}

export interface UseFatigueMonitorOptions {
  workerId: string;
  workerName?: string;
  /** Sliding window for blink/PERCLOS analysis, ms. Default 60s. */
  windowMs?: number;
  /** How often to publish state to React (ms). Default 1000. */
  publishIntervalMs?: number;
  /** Trend ring length (number of samples kept for the sparkline). */
  trendLength?: number;
  /** Cooldown between repeated alerts of the same level (ms). */
  alertCooldownMs?: number;
}

// ---------- Workforce registry (singleton; survives remounts) ----------

const workforce: Record<string, WorkerSnapshot> = {};
const workforceListeners = new Set<(s: WorkforceStatus) => void>();

function snapshotWorkforce(): WorkforceStatus {
  const workers = { ...workforce };
  const byLevel: Record<RiskLevel, number> = { low: 0, moderate: 0, high: 0 };
  const highRiskIds: string[] = [];
  for (const id in workers) {
    const w = workers[id];
    byLevel[w.level] += 1;
    if (w.level === "high") highRiskIds.push(id);
  }
  return {
    total: Object.keys(workers).length,
    byLevel,
    workers,
    highRiskIds,
  };
}

function notifyWorkforce() {
  if (workforceListeners.size === 0) return;
  const snap = snapshotWorkforce();
  for (const fn of Array.from(workforceListeners)) fn(snap);
}

/** Manager-side hook: subscribe to workforce roll-up. */
export function useWorkforceStatus(): WorkforceStatus {
  const [status, setStatus] = useState<WorkforceStatus>(() => snapshotWorkforce());
  useEffect(() => {
    workforceListeners.add(setStatus);
    setStatus(snapshotWorkforce());
    return () => {
      workforceListeners.delete(setStatus);
    };
  }, []);
  return status;
}

// ---------- The worker-side hook ----------

export function useFatigueMonitor(options: UseFatigueMonitorOptions) {
  const {
    workerId,
    workerName,
    windowMs = 60_000,
    publishIntervalMs = 1000,
    trendLength = 60,
    alertCooldownMs = 30_000,
  } = options;

  // ----- Hot-path mutable buffers -----
  // Blink-onset timestamps in current window.
  const blinkTimestampsRef = useRef<number[]>([]);
  // Track previous closed state so we can detect blink onsets.
  const prevClosedRef = useRef(false);
  // PERCLOS accumulator: list of {t, closed} samples within window.
  const closureSamplesRef = useRef<Array<{ t: number; closed: boolean }>>([]);
  // Closed-time integral within window (ms).
  const closedMsRef = useRef(0);
  const totalMsRef = useRef(0);
  // Latest focus value seen.
  const focusRef = useRef(1);
  // Latest head pose seen (degrees). null until first reading.
  const headYawRef   = useRef<number | null>(null);
  const headPitchRef = useRef<number | null>(null);
  // Latest fear score seen (0..1).
  const fearScoreRef = useRef(0);
  // Trend ring buffer.
  const trendRef = useRef<number[]>([]);
  // Last alert times keyed by level for cooldown.
  const lastAlertAtRef = useRef<Partial<Record<RiskLevel, number>>>({});

  // ----- Published (rendered) state -----
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState<RiskLevel>("low");
  const [blinkRate, setBlinkRate] = useState(0);
  const [eyeClosure, setEyeClosure] = useState(0);
  const [trend, setTrend] = useState<number[]>([]);
  const [fearScore, setFearScore] = useState(0);

  // ----- Per-frame ingest -----
  const ingest = useCallback(
    (sample: BiometricSample) => {
      const { t, eyesClosed, focus } = sample;
      if (focus    != null) focusRef.current     = focus;
      if (sample.headYaw   != null) headYawRef.current   = sample.headYaw;
      if (sample.headPitch != null) headPitchRef.current = sample.headPitch;
      if (sample.fearScore != null) fearScoreRef.current = sample.fearScore;

      // 1. Blink onset detection (rising edge of closed flag).
      if (eyesClosed && !prevClosedRef.current) {
        blinkTimestampsRef.current.push(t);
      }
      prevClosedRef.current = eyesClosed;

      // 2. PERCLOS sliding window. Add this frame as a sample.
      const samples = closureSamplesRef.current;
      const last = samples[samples.length - 1];
      if (last) {
        const dt = Math.max(0, t - last.t);
        totalMsRef.current += dt;
        if (last.closed) closedMsRef.current += dt;
      }
      samples.push({ t, closed: eyesClosed });

      // 3. Drop samples older than windowMs from BOTH structures.
      const cutoff = t - windowMs;
      const blinks = blinkTimestampsRef.current;
      while (blinks.length && blinks[0] < cutoff) blinks.shift();
      while (samples.length > 1 && samples[1].t < cutoff) {
        const removed = samples.shift()!;
        const next = samples[0];
        const dt = Math.max(0, next.t - removed.t);
        totalMsRef.current = Math.max(0, totalMsRef.current - dt);
        if (removed.closed) {
          closedMsRef.current = Math.max(0, closedMsRef.current - dt);
        }
      }
    },
    [windowMs],
  );

  // ----- Publish loop (1 Hz) -----
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const blinks = blinkTimestampsRef.current.length;
      const seconds = Math.max(1, windowMs / 1000);
      const bpm = (blinks / seconds) * 60;
      const perclos =
        totalMsRef.current > 0 ? closedMsRef.current / totalMsRef.current : 0;
      const rawFocus = focusRef.current;

      // Head pose contribution: looking away (large yaw/pitch) reduces focus.
      // |yaw| > 30° or |pitch| > 20° are strong indicators of inattention.
      // A trained head-pose model can replace this heuristic without changing
      // the downstream interface — just update headYawRef/headPitchRef.
      let headFocusFactor = 1;
      const yaw   = headYawRef.current;
      const pitch = headPitchRef.current;
      if (yaw !== null && pitch !== null) {
        const yawImpact   = Math.min(1, Math.abs(yaw)   / 30);
        const pitchImpact = Math.min(1, Math.abs(pitch) / 20);
        headFocusFactor   = 1 - (yawImpact * 0.6 + pitchImpact * 0.4);
      }
      const focus = Math.min(1, Math.max(0, rawFocus * headFocusFactor));

      const newScore = calculateFatigueScore(bpm, perclos, focus);
      const newLevel = mapRiskLevel(newScore);

      // Fear score: convert [0..1] blendshape reading to integer 0–100.
      const newFearScore = Math.round(fearScoreRef.current * 100);

      // Trend ring.
      trendRef.current.push(newScore);
      if (trendRef.current.length > trendLength) trendRef.current.shift();

      setScore(newScore);
      setLevel(newLevel);
      setBlinkRate(Math.round(bpm * 10) / 10);
      setEyeClosure(Math.round(perclos * 1000) / 1000);
      setTrend(trendRef.current.slice());
      setFearScore(newFearScore);

      // Update workforce registry + notify managers.
      const snap: WorkerSnapshot = {
        workerId,
        workerName,
        score: newScore,
        level: newLevel,
        blinkRate: bpm,
        eyeClosure: perclos,
        focus,
        fearScore: newFearScore,
        trend: trendRef.current.slice(),
        lastUpdate: Date.now(),
      };
      workforce[workerId] = snap;
      notifyWorkforce();

      // ----- Alerting -----
      // Worker alert: fire on Moderate+ with cooldown per level.
      if (newLevel !== "low") {
        const lastAt = lastAlertAtRef.current[newLevel] ?? 0;
        if (Date.now() - lastAt >= alertCooldownMs) {
          lastAlertAtRef.current[newLevel] = Date.now();
          const payload: WorkerAlertPayload = {
            workerId,
            workerName,
            score: newScore,
            level: newLevel,
            message:
              newLevel === "high"
                ? "Critical fatigue detected. Take a mandatory break now."
                : "Elevated fatigue detected. Consider a short break.",
            timestamp: Date.now(),
          };
          fatigueAlertBus.emit("workerAlert", payload);
          // Manager alert: only on High, with the worker id in payload.
          if (newLevel === "high") {
            fatigueAlertBus.emit("managerAlert", {
              ...payload,
              level: "high",
            });
          }
        }
      }
    }, publishIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [workerId, workerName, windowMs, publishIntervalMs, trendLength, alertCooldownMs]);

  // Cleanup workforce entry on unmount.
  useEffect(() => {
    return () => {
      delete workforce[workerId];
      notifyWorkforce();
    };
  }, [workerId]);

  return useMemo(
    () => ({
      score,
      level,
      blinkRate,
      eyeClosure,
      focus: focusRef.current,
      fearScore,
      trend,
      ingest,
    }),
    [score, level, blinkRate, eyeClosure, fearScore, trend, ingest],
  );
}
