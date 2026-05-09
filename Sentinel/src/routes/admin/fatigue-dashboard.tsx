import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { StatusBadge } from "@/components/admin/sentinel/StatusBadge";
import { useWorkforceStatus } from "@/hooks/useFatigueMonitor";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import {
  Camera,
  AlertTriangle,
  Users,
  TrendingUp,
  Zap,
  CheckCircle2,
  Minus,
} from "lucide-react";

// ─── Visual config ─────────────────────────────────────────────────────────────

const RISK_STYLE = {
  low: {
    badge: "bg-success-soft text-success",
    dot: "bg-success",
    bar: "bg-success",
    label: "LOW",
  },
  moderate: {
    badge: "bg-warning-soft text-warning-foreground",
    dot: "bg-warning",
    bar: "bg-warning",
    label: "MODERATE",
  },
  high: {
    badge: "bg-critical/10 text-critical",
    dot: "bg-critical",
    bar: "bg-critical",
    label: "HIGH RISK",
  },
} as const;

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin/fatigue-dashboard")({
  head: () => ({
    meta: [
      { title: "Fatigue Overview — SentinelAI Admin" },
      {
        name: "description",
        content: "Real-time fatigue dashboard for workforce condition monitoring.",
      },
    ],
  }),
  component: FatigueDashboard,
});

// ─── Types ─────────────────────────────────────────────────────────────────────

type WorkerRow = {
  id: string;
  name: string;
  score: number;
  level: "low" | "moderate" | "high";
  trend: number[];
  live: boolean;
};

// ─── Page component ────────────────────────────────────────────────────────────

function FatigueDashboard() {
  const { profile } = useAuth();
  const workforce = useWorkforceStatus();

  const [dbWorkers, setDbWorkers] = useState<WorkerRow[]>([]);
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;

    async function fetchData() {
      setLoading(true);

      // 1. All employees in this company
      const { data: employees } = await supabase
        .from("profiles")
        .select("profile_id, first_name, last_name")
        .eq("company_id", profile!.company_id!)
        .eq("role", "EMPLOYEE");

      if (!employees?.length) {
        setDbWorkers([]);
        setLoading(false);
        return;
      }

      const ids = employees.map((e) => e.profile_id);

      // 2. Last 7 biometric readings per employee (for score + trend)
      const { data: readings } = await supabase
        .from("biometric_readings")
        .select("employee_profile_id, fatigue_score, risk_level, captured_at")
        .in("employee_profile_id", ids)
        .order("captured_at", { ascending: false })
        .limit(ids.length * 7);

      // 3. Unacknowledged alerts count
      const { count } = await supabase
        .from("risk_alerts")
        .select("alert_id", { count: "exact", head: true })
        .eq("company_id", profile!.company_id!)
        .eq("is_seen_by_manager", false);

      setActiveAlerts(count ?? 0);

      // 4. Group readings by employee
      const byEmployee: Record<string, { fatigue_score: number | null; risk_level: string; captured_at: string }[]> = {};
      for (const r of readings ?? []) {
        if (!byEmployee[r.employee_profile_id]) byEmployee[r.employee_profile_id] = [];
        byEmployee[r.employee_profile_id].push(r);
      }

      // 5. Build WorkerRow for each employee
      const rows: WorkerRow[] = employees.map((emp) => {
        const empReadings = byEmployee[emp.profile_id] ?? [];
        const latest = empReadings[0];
        const trend = empReadings
          .slice(0, 7)
          .reverse()
          .map((r) => Math.round(Number(r.fatigue_score ?? 0)));
        const rawLevel = latest?.risk_level ?? "LOW";
        const level =
          rawLevel === "HIGH" ? "high" : rawLevel === "MODERATE" ? "moderate" : "low";
        return {
          id: emp.profile_id,
          name: `${emp.first_name} ${emp.last_name}`,
          score: Math.round(Number(latest?.fatigue_score ?? 0)),
          level,
          trend,
          live: false,
        };
      });

      setDbWorkers(rows);
      setLoading(false);
    }

    fetchData();
  }, [profile?.company_id]);

  // Merge: live WebSocket workers override DB rows with the same profile_id
  const liveWorkers = Object.values(workforce.workers);
  const liveIds = new Set(liveWorkers.map((w) => w.workerId));
  const dbRows = dbWorkers.filter((w) => !liveIds.has(w.id));

  const allWorkers: WorkerRow[] = [
    ...liveWorkers.map((w) => ({
      id: w.workerId,
      name: w.workerName ?? w.workerId,
      score: w.score,
      level: w.level as "low" | "moderate" | "high",
      trend: w.trend ?? [],
      live: true,
    })),
    ...dbRows,
  ].sort((a, b) => b.score - a.score);

  const totalWorkers = allWorkers.length;
  const highCount = allWorkers.filter((w) => w.level === "high").length;
  const modCount = allWorkers.filter((w) => w.level === "moderate").length;
  const lowCount = allWorkers.filter((w) => w.level === "low").length;
  const highRiskWorkers = allWorkers.filter((w) => w.level === "high");

  const highPct = totalWorkers ? Math.round((highCount / totalWorkers) * 100) : 0;
  const modPct = totalWorkers ? Math.round((modCount / totalWorkers) * 100) : 0;
  const lowPct = Math.max(0, 100 - highPct - modPct);

  const recentAlerts = activeAlerts;

  const avgScore =
    totalWorkers > 0
      ? Math.round(allWorkers.reduce((sum, w) => sum + w.score, 0) / totalWorkers)
      : 0;

  if (loading) {
    return (
      <AppShell>
        <TopBar title="Fatigue Overview" showBell showAvatar />
        <div className="px-5 pt-4 pb-28 space-y-4 animate-pulse">
          <div className="h-6 w-48 rounded-lg bg-border" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 border border-border h-20" />
            ))}
          </div>
          <div className="bg-surface rounded-2xl p-4 border border-border h-24" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl px-4 py-3 border border-border h-12" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title="Fatigue Overview" showBell showAvatar />

      <div className="px-5 pt-4 pb-28 space-y-5">
        {/* Page heading */}
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase">
            Real-Time Intelligence
          </p>
          <h1 className="text-[28px] leading-[1.1] font-extrabold text-ink mt-1">
            Workforce Condition
          </h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            {loading ? "Fetching employee data…" : `Showing ${totalWorkers} employee${totalWorkers !== 1 ? "s" : ""} — live data refreshes automatically.`}
          </p>
        </div>

        {/* ── Summary Stat Tiles ── */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="TOTAL WORKERS" value={String(totalWorkers)} />
          <StatTile
            label="AVG FATIGUE"
            value={String(avgScore)}
            accent={
              avgScore >= 70
                ? "text-critical"
                : avgScore >= 40
                  ? "text-warning-foreground"
                  : "text-success"
            }
          />
          <StatTile
            label="HIGH RISK"
            value={String(highCount)}
            accent={highCount > 0 ? "text-critical" : "text-ink"}
            pill={
              highCount > 0 ? (
                <StatusBadge variant="critical">Attention</StatusBadge>
              ) : undefined
            }
          />
          <StatTile
            label="ACTIVE ALERTS"
            value={String(recentAlerts)}
            accent={recentAlerts > 0 ? "text-warning-foreground" : "text-ink"}
          />
        </div>

        {/* ── Risk Distribution Bar ── */}
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="label-eyebrow">Risk Distribution</div>
            <TrendingUp className="h-4 w-4 text-ink-soft" />
          </div>

          {/* Stacked progress bar */}
          <div className="flex h-3.5 w-full rounded-full overflow-hidden gap-px">
            {lowPct > 0 && (
              <div
                className="bg-success h-full transition-all"
                style={{ width: `${lowPct}%` }}
              />
            )}
            {modPct > 0 && (
              <div
                className="bg-warning h-full transition-all"
                style={{ width: `${modPct}%` }}
              />
            )}
            {highPct > 0 && (
              <div
                className="bg-critical h-full transition-all"
                style={{ width: `${highPct}%` }}
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              Low {lowPct}% ({lowCount})
            </span>
            <span className="flex items-center gap-1.5 text-warning-foreground">
              <span className="h-2 w-2 rounded-full bg-warning" />
              Moderate {modPct}% ({modCount})
            </span>
            <span className="flex items-center gap-1.5 text-critical">
              <span className="h-2 w-2 rounded-full bg-critical" />
              High {highPct}% ({highCount})
            </span>
          </div>
        </div>

        {/* ── Immediate Attention Banner ── */}
        {(highCount > 0 || recentAlerts > 0) && (
          <div className="bg-critical/8 border border-critical/25 rounded-2xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-critical/15 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-critical" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-ink text-sm">
                Immediate Attention Required
              </div>
              <div className="text-[12px] text-ink-soft mt-0.5">
                {highCount} worker{highCount !== 1 ? "s" : ""} at HIGH RISK
                {recentAlerts > 0 &&
                  ` · ${recentAlerts} unacknowledged alert${recentAlerts !== 1 ? "s" : ""}`}
              </div>
            </div>
          </div>
        )}

        {/* ── High-Risk Individuals ── */}
        {highRiskWorkers.length > 0 && (
          <section>
            <div className="label-eyebrow mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-critical" />
              High-Risk Individuals
            </div>
            <div className="space-y-3">
              {highRiskWorkers.map((w) => (
                <HighRiskCard key={w.id} worker={w} />
              ))}
            </div>
          </section>
        )}

        {/* ── All Workers Grid ── */}
        <section>
          <div className="label-eyebrow mb-3 flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            All Workers ({totalWorkers})
          </div>
          <div className="space-y-2">
            {allWorkers.map((w) => (
              <WorkerListRow key={w.id} worker={w} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

// ─── Stat Tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  accent = "text-ink",
  pill,
}: {
  label: string;
  value: string;
  accent?: string;
  pill?: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-border">
      <div className="text-[10px] font-extrabold tracking-wider text-ink-soft">{label}</div>
      <div className={`font-display font-extrabold text-3xl mt-1 ${accent}`}>{value}</div>
      {pill && <div className="mt-2">{pill}</div>}
    </div>
  );
}

// ─── High-Risk Card ────────────────────────────────────────────────────────────

function HighRiskCard({ worker }: { worker: WorkerRow }) {
  const trendMax = Math.max(...worker.trend, 1);
  return (
    <Link
      to="/admin/workforce"
      className="block bg-critical/5 border-2 border-critical/30 rounded-2xl p-4 hover:bg-critical/10 transition"
      aria-label={`View details for ${worker.name}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar placeholder */}
        <div className="h-11 w-11 rounded-xl bg-critical/15 flex items-center justify-center shrink-0">
          <Camera className="h-5 w-5 text-critical" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-ink text-sm leading-tight">{worker.name}</div>
              <div className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-1.5">
                {worker.live ? (
                  <span className="inline-flex items-center gap-1 text-success font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    LIVE MONITORING
                  </span>
                ) : (
                  <span>Last reading from database</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display font-extrabold text-2xl text-critical leading-none">
                {worker.score}
              </div>
              <div className="text-[10px] text-ink-soft">/ 100</div>
            </div>
          </div>

          {/* Mini trend sparkline */}
          {worker.trend.length > 0 && (
            <div className="mt-3 flex items-end gap-0.5 h-8">
              {worker.trend.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-critical/60"
                  style={{ height: `${(v / trendMax) * 100}%` }}
                />
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-critical/10 text-critical">
              HIGH RISK
            </span>
            <span className="text-[10px] text-ink-soft">Immediate action recommended</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Worker List Row ───────────────────────────────────────────────────────────

function WorkerListRow({ worker }: { worker: WorkerRow }) {
  const style = RISK_STYLE[worker.level];
  const RiskIcon =
    worker.level === "high"
      ? AlertTriangle
      : worker.level === "low"
        ? CheckCircle2
        : Minus;
  const iconColor =
    worker.level === "high"
      ? "text-critical"
      : worker.level === "low"
        ? "text-success"
        : "text-warning-foreground";

  return (
    <div className="bg-surface rounded-xl px-4 py-3 border border-border flex items-center gap-3">
      {/* Risk dot */}
      <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-ink truncate">{worker.name}</span>
          {worker.live && (
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse shrink-0" />
          )}
        </div>
        <div className="text-[11px] text-ink-soft">
          {worker.live ? "● LIVE" : worker.id.length > 20 ? worker.id.slice(0, 8) + "…" : worker.id}
        </div>
      </div>

      {/* Score bar */}
      <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full transition-all ${style.bar}`}
          style={{ width: `${worker.score}%` }}
        />
      </div>

      {/* Numeric score */}
      <div className="font-display font-extrabold text-lg text-ink w-8 text-right shrink-0">
        {worker.score}
      </div>

      {/* Risk icon */}
      <RiskIcon className={`h-4 w-4 shrink-0 ${iconColor}`} />
    </div>
  );
}

// React namespace needed for ReactNode in StatTile prop type
import type React from "react";
