import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { StatusBadge } from "@/components/admin/sentinel/StatusBadge";
import { useWorkforceStatus } from "@/hooks/useFatigueMonitor";
import { useAlertLog } from "@/lib/fatigue/alertLog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Users, AlertOctagon, Zap, Clock, Download, RefreshCw,
  Activity, Loader2, Shield, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "System Overview — SentinelAI Admin" },
      { name: "description", content: "Real-time workforce intelligence and health metrics for current operations." },
    ],
  }),
  component: Dashboard,
});

interface HighRiskItem {
  key: string;
  name: string;
  initials: string;
  subtitle: string;
  riskLevel: "HIGH" | "MODERATE";
  meta: string;
}

interface DashboardStats {
  total: number;
  active: number;
  iotCount: number;
  cameraCount: number;
  bothCount: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  unreadAlerts: number;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function Dashboard() {
  const { profile } = useAuth();
  const workforce = useWorkforceStatus();
  const alertLog = useAlertLog();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [highRiskItems, setHighRiskItems] = useState<HighRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.company_id) return;
    const companyId = profile.company_id;
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [profilesRes, alertsRes, insightAlertsRes] = await Promise.all([
      // All employees + monitoring type
      supabase
        .from("profiles")
        .select("profile_id, status, employee_profiles(monitoring_type)")
        .eq("company_id", companyId)
        .eq("role", "EMPLOYEE"),

      // Unread alerts in last 24h
      supabase
        .from("risk_alerts")
        .select("alert_id, risk_level", { count: "exact", head: false })
        .eq("company_id", companyId)
        .eq("is_seen_by_manager", false)
        .gte("created_at", since24h),

      // Recent high/moderate alerts with employee info for insights panel
      // risk_alerts.employee_profile_id → profiles(profile_id), then profiles → employee_profiles
      supabase
        .from("risk_alerts")
        .select(`
          alert_id,
          risk_level,
          alert_type,
          fatigue_score,
          created_at,
          employee_profile_id,
          profiles!risk_alerts_employee_profile_id_fkey(
            first_name,
            last_name,
            username,
            employee_profiles(job_title, department)
          )
        `)
        .eq("company_id", companyId)
        .in("risk_level", ["HIGH", "MODERATE"])
        .gte("created_at", since24h)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    // ── Employee stats ──
    const employees = (profilesRes.data ?? []) as any[];
    const total = employees.length;
    const active = employees.filter((e) => e.status === "ACTIVE").length;
    let iotCount = 0, cameraCount = 0, bothCount = 0;
    for (const e of employees) {
      const ep = Array.isArray(e.employee_profiles) ? e.employee_profiles[0] : e.employee_profiles;
      if (!ep) continue;
      if (ep.monitoring_type === "IOT_WRISTBAND") iotCount++;
      else if (ep.monitoring_type === "CAMERA") cameraCount++;
      else if (ep.monitoring_type === "BOTH") bothCount++;
    }

    // ── Risk distribution (unique employees with high/mod alerts) ──
    const allAlerts = (alertsRes.data ?? []) as any[];
    const insightAlerts = (insightAlertsRes.data ?? []) as any[];
    const highEmpIds = new Set(insightAlerts.filter((a) => a.risk_level === "HIGH").map((a) => a.employee_profile_id));
    const modEmpIds = new Set(insightAlerts.filter((a) => a.risk_level === "MODERATE").map((a) => a.employee_profile_id));
    const highRiskCount = highEmpIds.size;
    const moderateRiskCount = modEmpIds.size;
    const lowRiskCount = Math.max(0, active - highRiskCount - moderateRiskCount);

    setStats({
      total, active,
      iotCount, cameraCount, bothCount,
      highRiskCount, moderateRiskCount, lowRiskCount,
      unreadAlerts: alertsRes.count ?? allAlerts.length,
    });

    // ── High-risk insights list (deduplicated by employee) ──
    const seen = new Set<string>();
    const items: HighRiskItem[] = [];
    for (const a of insightAlerts) {
      if (seen.has(a.employee_profile_id)) continue;
      seen.add(a.employee_profile_id);
      // profiles is the direct FK target; employee_profiles is nested from profiles
      const p = a.profiles as any;
      const ep = (Array.isArray(p?.employee_profiles) ? p.employee_profiles[0] : p?.employee_profiles) as any;
      const first = p?.first_name ?? "";
      const last = p?.last_name ?? "";
      const name = [first, last].filter(Boolean).join(" ") || p?.username || "Employee";
      const initials = `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || name.slice(0, 2).toUpperCase();
      const subtitle = [ep?.job_title, ep?.department].filter(Boolean).join(" • ") || a.alert_type.replace(/_/g, " ");
      items.push({
        key: a.alert_id,
        name,
        initials,
        subtitle,
        riskLevel: a.risk_level as "HIGH" | "MODERATE",
        meta: a.fatigue_score != null ? `Fatigue ${a.fatigue_score}%` : timeAgo(a.created_at),
      });
    }
    setHighRiskItems(items);
  }, [profile?.company_id]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  // ── Merge live WebSocket data ──
  const liveUnread = alertLog.filter((a) => !a.acknowledged && Date.now() - a.timestamp < 30 * 60_000).length;
  const totalEmployees = (stats?.total ?? 0) + workforce.total;
  const highRisk = (stats?.highRiskCount ?? 0) + workforce.byLevel.high;
  const modRisk = (stats?.moderateRiskCount ?? 0) + workforce.byLevel.moderate;
  const lowRisk = (stats?.lowRiskCount ?? 0) + workforce.byLevel.low;
  const totalAlerts = (stats?.unreadAlerts ?? 0) + liveUnread;

  const lowPct = totalEmployees > 0 ? Math.round((lowRisk / totalEmployees) * 100) : 0;
  const modPct = totalEmployees > 0 ? Math.round((modRisk / totalEmployees) * 100) : 0;
  const highPct = Math.max(0, 100 - lowPct - modPct);

  const iotTotal = (stats?.iotCount ?? 0) + (stats?.bothCount ?? 0);
  const cameraTotal = (stats?.cameraCount ?? 0) + (stats?.bothCount ?? 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  // Merge live WebSocket high-risk workers into insights
  const liveInsights: HighRiskItem[] = workforce.highRiskIds
    .map((id) => workforce.workers[id])
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => ({
      key: `live-${w.workerId}`,
      name: w.workerName ?? w.workerId,
      initials: (w.workerName ?? w.workerId).slice(0, 2).toUpperCase(),
      subtitle: `Camera • PERCLOS ${Math.round(w.eyeClosure * 100)}%`,
      riskLevel: "HIGH" as const,
      meta: `Score ${w.score}/100`,
    }));

  const allInsights = [...liveInsights, ...highRiskItems].slice(0, 6);

  return (
    <AppShell>
      <TopBar showBell showAvatar />

      {/* ── Header gradient ── */}
      <div className="header-gradient px-5 pt-6 pb-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-primary-foreground/60 uppercase">Live Overview</p>
            <h1 className="text-[32px] leading-[1.05] font-extrabold text-primary-foreground mt-1">System Overview</h1>
            <p className="mt-1.5 text-[13px] text-primary-foreground/70 leading-snug">
              Real-time workforce intelligence and health metrics.
            </p>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-primary-foreground/50 mt-2" />}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => toast.success("Dashboard data exported as CSV")}
            className="flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-primary-foreground text-[12px] font-extrabold tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="h-4 w-4" /> EXPORT CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 h-11 rounded-xl btn-gold text-[12px] font-extrabold tracking-wider flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> UPDATE LIVE
          </button>
        </div>
        <Link
          to="/admin/fatigue-dashboard"
          className="mt-3 w-full h-11 rounded-xl bg-warning/25 border border-warning/40 text-white text-[12px] font-extrabold tracking-wider flex items-center justify-center gap-2 hover:bg-warning/35 transition-colors"
        >
          <Activity className="h-4 w-4" /> FATIGUE DASHBOARD
        </Link>
      </div>

      {/* ── Body ── */}
      <div className="px-5 mt-5 space-y-4 stagger pb-28">

        {/* Stat cards */}
        {loading ? (
          <>{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</>
        ) : (
          <>
            <StatCard
              label="TOTAL EMPLOYEES"
              value={totalEmployees > 0 ? String(totalEmployees) : "—"}
              delta={stats ? `${stats.active} active right now` : undefined}
              deltaColor="text-success"
              icon={<Users className="h-4 w-4 text-ink" />}
              iconBg="bg-info-soft"
            />
            <StatCard
              label="HIGH-RISK EMPLOYEES"
              value={String(highRisk)}
              pill={highRisk > 0 ? <StatusBadge variant="critical">Immediate Attention</StatusBadge> : <StatusBadge variant="info">All Clear</StatusBadge>}
              icon={<AlertOctagon className="h-4 w-4 text-critical" />}
              iconBg="bg-critical/10"
              stripe={highRisk > 0}
            />
            <StatCard
              label="UNREAD ALERTS (24h)"
              value={String(totalAlerts)}
              delta={
                <span className="flex items-center gap-1 text-ink-soft text-[12px]">
                  <Clock className="h-3.5 w-3.5" />
                  {liveUnread > 0 ? `${liveUnread} live in last 30m` : "Last 24 hours"}
                </span>
              }
              icon={<Zap className="h-4 w-4 text-warning-foreground" />}
              iconBg="bg-warning/30"
            />
          </>
        )}

        {/* Quick Insights */}
        <section className="bg-surface rounded-2xl p-5 shadow-card border border-border/40">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[18px] font-extrabold text-ink leading-tight">Attention Required</h2>
              <p className="mt-0.5 text-[12px] text-ink-soft">High-risk personnel from last 24 hours.</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-critical/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-critical" />
            </div>
          </div>

          {loading ? (
            <ul className="space-y-4">{[0, 1, 2].map((i) => <SkeletonInsightRow key={i} />)}</ul>
          ) : allInsights.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <p className="text-[14px] font-extrabold text-ink">All Clear</p>
              <p className="mt-1 text-[12px] text-ink-soft">No high-risk employees in the last 24h.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {allInsights.map((item) => (
                <InsightItem key={item.key} item={item} />
              ))}
            </ul>
          )}

          <Link
            to="/admin/workforce"
            className="mt-5 flex items-center justify-center gap-1.5 text-[12px] font-extrabold tracking-wider text-ink uppercase hover:text-primary transition-colors"
          >
            View All Employees <TrendingUp className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* Risk Distribution */}
        <section className="bg-surface rounded-2xl p-5 shadow-sm border border-border/40">
          <h2 className="text-[18px] font-extrabold text-ink">Risk Distribution</h2>
          <p className="mt-0.5 text-[12px] text-ink-soft">Based on alerts from the last 24 hours.</p>
          {loading ? (
            <div className="mt-5 space-y-4">
              {[0, 1, 2].map((i) => <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <RiskBar label="Low Risk" pct={lowPct} count={lowRisk} color="bg-success" />
              <RiskBar label="Moderate Risk" pct={modPct} count={modRisk} color="bg-warning" />
              <RiskBar label="High Risk" pct={highPct} count={highRisk} color="bg-critical" />
            </div>
          )}
          {!loading && (
            <p className="mt-4 text-[11px] italic text-ink-soft">
              *Aggregated from biometric and camera analysis data streams.
            </p>
          )}
        </section>

        {/* Data Source Breakdown */}
        <section className="bg-surface-muted rounded-2xl p-5 shadow-sm border border-border/30">
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase">Monitoring Breakdown</p>
          {loading ? (
            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => <div key={i} className="h-6 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 space-y-3">
                <Source dot="bg-warning" title="IoT Wristband" sub={`${iotTotal} unit${iotTotal !== 1 ? "s" : ""} active`} />
                <Source dot="bg-blue-300" title="Camera Only" sub={`${cameraTotal} unit${cameraTotal !== 1 ? "s" : ""} active`} />
              </div>
              <Donut
                total={totalEmployees || 1}
                segments={[
                  { pct: totalEmployees > 0 ? iotTotal / totalEmployees : 0.5, color: "var(--warning)" },
                  { pct: totalEmployees > 0 ? cameraTotal / totalEmployees : 0.5, color: "oklch(0.78 0.06 240)" },
                ]}
              />
            </div>
          )}
        </section>

        {/* Support FAB */}
        <Link
          to="/admin/support"
          className="fixed bottom-24 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-20"
          aria-label="Support"
        >
          <span className="text-lg">🎧</span>
        </Link>
      </div>
    </AppShell>
  );
}



function StatCard({
  label, value, delta, pill, icon, iconBg, deltaColor, stripe,
}: {
  label: string; value: string; delta?: React.ReactNode; pill?: React.ReactNode;
  icon: React.ReactNode; iconBg: string; deltaColor?: string; stripe?: boolean;
}) {
  return (
    <div
      className={`relative bg-surface rounded-2xl p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 border border-border/30 ${stripe ? "card-stripe-critical" : ""}`}
      style={{ boxShadow: "0 2px 10px -4px oklch(0.18 0.04 260 / 0.10), 0 1px 3px oklch(0.18 0.04 260 / 0.06)" }}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase">{label}</p>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg} shadow-sm`}>{icon}</div>
      </div>
      <p className="mt-3 text-[42px] leading-none font-extrabold text-ink tabular-nums">{value}</p>
      <div className="mt-3">
        {pill ?? (typeof delta === "string" ? <p className={`text-[13px] font-semibold ${deltaColor || "text-ink-soft"}`}>{delta}</p> : delta)}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl p-5 border border-border/30 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="h-10 w-10 bg-muted rounded-xl" />
      </div>
      <div className="mt-3 h-10 w-20 bg-muted rounded" />
      <div className="mt-3 h-3 w-36 bg-muted rounded" />
    </div>
  );
}

function SkeletonInsightRow() {
  return (
    <li className="flex items-center gap-3 animate-pulse">
      <div className="h-12 w-12 rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 bg-muted rounded" />
        <div className="h-3 w-24 bg-muted rounded" />
      </div>
      <div className="h-6 w-16 bg-muted rounded-full" />
    </li>
  );
}

function InsightItem({ item }: { item: { initials: string; name: string; subtitle: string; riskLevel: "HIGH" | "MODERATE"; meta: string } }) {
  const isHigh = item.riskLevel === "HIGH";
  return (
    <li className="flex items-center gap-3">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-extrabold text-[16px] shrink-0 ${isHigh ? "bg-critical/10 text-critical" : "bg-warning/15 text-warning-foreground"}`}>
        {item.initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-ink truncate">{item.name}</p>
        <p className="text-[12px] text-ink-soft truncate">{item.subtitle}</p>
      </div>
      <div className="text-right shrink-0">
        <StatusBadge variant={isHigh ? "critical" : "warning"}>
          {isHigh ? "High Risk" : "Moderate"}
        </StatusBadge>
        <p className="mt-1 text-[11px] text-ink-soft">{item.meta}</p>
      </div>
    </li>
  );
}

function RiskBar({ label, pct, count, color }: { label: string; pct: number; count: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center text-[13px] font-semibold text-ink">
        <span>{label}</span>
        <span className="tabular-nums">{pct}% <span className="text-ink-soft font-normal">({count})</span></span>
      </div>
      <div className="mt-1.5 risk-track">
        <div className={`risk-track-fill ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Source({ dot, title, sub }: { dot: string; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`h-2.5 w-2.5 rounded-full mt-1.5 ${dot}`} />
      <div>
        <p className="text-[14px] font-bold text-ink">{title}</p>
        <p className="text-[12px] text-ink-soft">{sub}</p>
      </div>
    </div>
  );
}

function Donut({ total, segments }: { total: number; segments: { pct: number; color: string }[] }) {
  const r = 38, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="oklch(0.93 0.01 250)" strokeWidth="10" />
        {segments.map((s, i) => {
          const len = s.pct * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="10" strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-extrabold text-ink leading-none">{total}</span>
        <span className="text-[9px] font-extrabold tracking-wider text-ink-soft">TOTAL</span>
      </div>
    </div>
  );
}
