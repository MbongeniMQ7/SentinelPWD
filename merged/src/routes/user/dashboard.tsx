import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { useWorkforceStatus } from "@/hooks/useFatigueMonitor";
import {
  Activity,
  Eye,
  Brain,
  TrendingUp,
  Play,
  AlertTriangle,
  CheckCircle2,
  Minus,
} from "lucide-react";
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

  // Use live data when a monitoring session is running, fall back to demo
  const score = live?.score ?? DEMO.score;
  const level = (live?.level ?? DEMO.level) as keyof typeof RISK_CFG;
  const blinkRate = live?.blinkRate ?? DEMO.blinkRate;
  const eyeClosure = live?.eyeClosure ?? DEMO.eyeClosure;
  const focus = live?.focus ?? DEMO.focus;
  const trend = live?.trend?.length ? live.trend : DEMO.trend;
  const isLive = !!live;

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

  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery="98% BLE" />

      <main className="flex-1 px-5 pb-6 space-y-5 overflow-y-auto">
        {/* Session status banner */}
        {!isLive && (
          <div className="rounded-xl bg-warning-soft border border-warning/30 px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-foreground shrink-0" />
            <p className="text-xs font-semibold text-warning-foreground">
              Showing last session data —{" "}
              <Link to="/user/monitoring" className="underline underline-offset-2">
                start monitoring
              </Link>{" "}
              for live scores
            </p>
          </div>
        )}

        {isLive && (
          <div className="rounded-xl bg-success-soft border border-success/30 px-4 py-2.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
            <p className="text-xs font-semibold text-success">Live monitoring active</p>
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
            <span>{trend.length} readings ago</span>
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
