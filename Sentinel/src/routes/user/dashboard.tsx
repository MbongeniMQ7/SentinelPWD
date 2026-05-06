import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { useWorkforceStatus } from "@/hooks/useFatigueMonitor";
import { loadSession, clearSession, loadSessionHistory } from "@/lib/fatigue/sessionStore";
import type { DbSession } from "@/lib/fatigue/sessionStore";
import {
  Activity,
  Eye,
  Brain,
  TrendingUp,
  Play,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Clock,
  XCircle,
  Zap,
  HeartCrack,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";

// Stable per-session worker ID (must match monitoring.tsx)
const CURRENT_WORKER_ID = "WK-MARCUS-CHEN";

// Demo/baseline data shown when no live monitoring session is running
const DEMO = {
  score: 24,
  level: "low" as const,
  blinkRate: 16.2,
  eyeClosure: 0.03,
  focus: 0.88,
  trend: [18, 22, 20, 25, 28, 24, 22, 26, 30, 28, 24, 22, 20, 24, 26, 28, 30, 32, 28, 26],
};

// Visual config keyed by risk level
const RISK_CFG = {
  low: {
    arcColor: "#22c55e",
    bg: "bg-success-soft",
    text: "text-success",
    label: "LOW RISK",
    dot: "#22c55e",
  },
  moderate: {
    arcColor: "#f59e0b",
    bg: "bg-warning-soft",
    text: "text-warning-foreground",
    label: "MODERATE RISK",
    dot: "#f59e0b",
  },
  high: {
    arcColor: "#ef4444",
    bg: "bg-danger-soft",
    text: "text-danger",
    label: "HIGH RISK",
    dot: "#ef4444",
  },
} as const;

export const Route = createFileRoute("/user/dashboard")({
  head: () => ({
    meta: [
      { title: "My Fatigue Dashboard — SentinelAI" },
      { name: "description", content: "Personal fatigue score, trend, and biometric breakdown." },
    ],
  }),
  component: WorkerDashboard,
});

// ─── SVG Gauge ────────────────────────────────────────────────────────────────

function GaugeRing({ score, level }: { score: number; level: keyof typeof RISK_CFG }) {
  const R = 80;
  const CX = 100;
  const CY = 100;
  const circumference = 2 * Math.PI * R;
  // 270° visible arc (¾ circle, starting from bottom-left)
  const trackLength = circumference * 0.75;
  const filled = trackLength * Math.min(score / 100, 1);
  const { arcColor } = RISK_CFG[level];

  return (
    <svg viewBox="0 0 200 200" className="w-52 h-52" strokeLinecap="round" aria-hidden="true">
      {/* Background track */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        className="stroke-border"
        strokeWidth={14}
        strokeDasharray={`${trackLength} ${circumference}`}
        transform={`rotate(135 ${CX} ${CY})`}
      />
      {/* Progress arc */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke={arcColor}
        strokeWidth={14}
        strokeDasharray={`${filled} ${circumference}`}
        transform={`rotate(135 ${CX} ${CY})`}
        style={{ transition: "stroke-dasharray 0.9s ease" }}
      />
    </svg>
  );
}

// ─── Sub-metric row ────────────────────────────────────────────────────────────

function SubMetric({
  icon,
  label,
  value,
  scorePct,
  good,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  /** 0-100 fill for the progress bar */
  scorePct: number;
  good: boolean;
}) {
  const barColor = good ? "bg-success" : scorePct > 60 ? "bg-danger" : "bg-warning";
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          <span className="text-xs font-bold">{value}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(scorePct, 100)}%` }}
          />
        </div>
      </div>
      <div className="shrink-0">
        {good ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : scorePct > 60 ? (
          <AlertTriangle className="h-4 w-4 text-danger" />
        ) : (
          <Minus className="h-4 w-4 text-warning-foreground" />
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function WorkerDashboard() {
  const workforce = useWorkforceStatus();
  const live = workforce.workers[CURRENT_WORKER_ID];

  // Load the last terminated session from sessionStorage (immediate after terminate)
  const [lastSession, setLastSession] = useState(() => loadSession());

  // Load historical sessions from Supabase
  const [history, setHistory] = useState<DbSession[]>([]);

  useEffect(() => {
    loadSessionHistory(20).then(({ sessions }) => {
      if (sessions.length > 0) setHistory(sessions);
    });
  }, []);

  // The latest session from DB (newest first)
  const latestDbSession = history[0] ?? null;

  // Use live data when monitoring is running,
  // then sessionStorage (immediate post-terminate), then DB, then DEMO
  const source = live ? "live" : lastSession ? "session" : latestDbSession ? "db" : "demo";
  const score = live?.score ?? lastSession?.score ?? latestDbSession?.score ?? DEMO.score;
  const level = (live?.level ?? lastSession?.level ?? latestDbSession?.level ?? DEMO.level) as keyof typeof RISK_CFG;
  const blinkRate = live?.blinkRate ?? lastSession?.blinkRate ?? latestDbSession?.blink_rate ?? DEMO.blinkRate;
  const eyeClosure = live?.eyeClosure ?? lastSession?.eyeClosure ?? latestDbSession?.eye_closure ?? DEMO.eyeClosure;
  const focus = live?.focus ?? lastSession?.focus ?? latestDbSession?.focus ?? DEMO.focus;
  // Fear score is only meaningful during a live session (requires camera blendshapes).
  const fearScore = live?.fearScore ?? 0;

  // Trend: prefer live, then sessionStorage, then build from DB history scores (oldest→newest), then DEMO
  const dbTrend = history.length > 0 ? [...history].reverse().map((s) => s.score) : [];
  const trend = live?.trend?.length
    ? live.trend
    : lastSession?.trend?.length
      ? lastSession.trend
      : dbTrend.length
        ? dbTrend
        : DEMO.trend;

  const isLive = source === "live";

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const cfg = RISK_CFG[level];
  const trendMax = Math.max(...trend, 1);

  // Sub-score percentages (mirrors riskScore.ts logic for display)
  const blinkScorePct = Math.min(
    100,
    Math.round((Math.abs(blinkRate - 16) / 25) * 100),
  );
  const eyeScorePct = Math.min(
    100,
    Math.round((Math.max(0, eyeClosure - 0.05) / 0.45) * 100),
  );
  const focusScorePct = Math.round((1 - Math.min(1, Math.max(0, focus))) * 100);

  // Stress score: elevated blink rate (>20 bpm = stress/anxiety) weighted 60%,
  // low focus weighted 40%. Range 0–100.
  const blinkExcessPct = blinkRate > 20
    ? Math.min(100, Math.round(((blinkRate - 20) / 25) * 100))
    : 0;
  const stressScore = Math.min(100, Math.round(blinkExcessPct * 0.6 + focusScorePct * 0.4));

  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery="98% BLE" title="Fatigue Dashboard" />

      <main className="flex-1 px-8 py-6 space-y-5 overflow-y-auto w-full">
        {/* Session status banner */}
        {source === "demo" && (
          <div className="rounded-xl bg-warning-soft border border-warning/30 px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-foreground shrink-0" />
            <p className="text-xs font-semibold text-warning-foreground">
              No session data yet —{" "}
              <Link to="/user/monitoring" className="underline underline-offset-2">
                start monitoring
              </Link>{" "}
              for live scores
            </p>
          </div>
        )}

        {source === "db" && latestDbSession && (
          <div className="rounded-xl bg-secondary border border-border px-4 py-2.5 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs font-semibold text-muted-foreground">
              Showing last recorded session ·{" "}
              {new Date(latestDbSession.terminated_at).toLocaleDateString([], {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          </div>
        )}

        {isLive && (
          <div className="rounded-xl bg-success-soft border border-success/30 px-4 py-2.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
            <p className="text-xs font-semibold text-success">Live monitoring active</p>
          </div>
        )}

        {/* Last session results banner */}
        {source === "session" && lastSession && (
          <div className="rounded-xl bg-secondary border border-border px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-bold text-ink">Last Session Results</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Terminated at {formatTime(lastSession.terminatedAt)}
                    {lastSession.durationSeconds > 0 && ` · Duration: ${formatDuration(lastSession.durationSeconds)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { clearSession(); setLastSession(null); }}
                className="shrink-0 text-muted-foreground hover:text-danger transition"
                aria-label="Clear session results"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Score Gauge ── */}
        <div className="panel p-5 flex flex-col items-center">
          <div className="label-eyebrow mb-4">Current Fatigue Score</div>
          <div className="relative">
            <GaugeRing score={score} level={level} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display font-bold text-5xl leading-none">{score}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-1">/ 100</div>
              <span
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${cfg.bg} ${cfg.text}`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: cfg.dot }}
                />
                {cfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* ── Trend Over Time ── */}
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-eyebrow">Trend</div>
              <div className="font-display font-bold text-lg leading-tight">Score History</div>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Color-coded sparkline bars */}
          <div className="flex items-end gap-0.5 h-20">
            {trend.map((v, i) => {
              const pct = (v / trendMax) * 100;
              const barColor =
                v >= 70 ? "bg-danger" : v >= 40 ? "bg-warning" : "bg-success";
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${barColor} opacity-80 transition-all`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                  aria-label={`Score ${v}`}
                />
              );
            })}
          </div>

          <div className="flex justify-between mt-2 text-[10px] font-semibold text-muted-foreground">
            <span>{source === "db" ? `${history.length} session${history.length !== 1 ? "s" : ""}` : `${trend.length} readings ago`}</span>
            <span>Now</span>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-success">
              <span className="h-2 w-2 rounded-sm bg-success" /> Low (0–39)
            </span>
            <span className="flex items-center gap-1.5 text-warning-foreground">
              <span className="h-2 w-2 rounded-sm bg-warning" /> Moderate (40–69)
            </span>
            <span className="flex items-center gap-1.5 text-danger">
              <span className="h-2 w-2 rounded-sm bg-danger" /> High (70+)
            </span>
          </div>
        </div>

        {/* ── Biometric Breakdown ── */}
        <div className="panel p-5">
          <div className="label-eyebrow mb-4">Biometric Breakdown</div>
          <div className="space-y-4">
            <SubMetric
              icon={<Eye className="h-4 w-4 text-navy" />}
              label="Blink Rate"
              value={`${blinkRate.toFixed(1)} bpm`}
              scorePct={blinkScorePct}
              good={blinkRate >= 12 && blinkRate <= 20}
            />
            <SubMetric
              icon={<Activity className="h-4 w-4 text-warning-foreground" />}
              label="Eye Closure (PERCLOS)"
              value={`${(eyeClosure * 100).toFixed(1)}%`}
              scorePct={eyeScorePct}
              good={eyeClosure < 0.15}
            />
            <SubMetric
              icon={<Brain className="h-4 w-4 text-gold-foreground" />}
              label="Focus Level"
              value={`${Math.round(focus * 100)}%`}
              scorePct={focusScorePct}
              good={focus > 0.7}
            />
            <SubMetric
              icon={<Zap className="h-4 w-4 text-danger" />}
              label="Stress Level"
              value={`${stressScore}/100`}
              scorePct={stressScore}
              good={stressScore < 40}
            />
            <SubMetric
              icon={<HeartCrack className="h-4 w-4 text-danger" />}
              label="Fear / Distress"
              value={fearScore > 0 ? `${fearScore}/100` : isLive ? "Monitoring…" : "N/A"}
              scorePct={fearScore}
              good={fearScore < 30}
            />
          </div>
        </div>

        {/* ── CTA ── */}
        <Link
          to="/user/monitoring"
          className="block w-full rounded-2xl bg-gold-soft hover:bg-gold/80 transition py-4 flex items-center justify-center gap-2 text-gold-foreground font-display font-bold text-base"
        >
          <Play className="h-4 w-4 fill-current" />
          Go to Live Monitoring
        </Link>
      </main>

      <BottomNav />
    </div>
  );
}
