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
  Users, AlertOctagon, Zap, Clock, RefreshCw,
  Activity, Loader2, Shield, TrendingUp, TrendingDown,
  MoreHorizontal, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "System Overview â€” SentinelAI Admin" },
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
      // risk_alerts.employee_profile_id â†’ profiles(profile_id), then profiles â†’ employee_profiles
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

    // â”€â”€ Employee stats â”€â”€
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

    // â”€â”€ Risk distribution (unique employees with high/mod alerts) â”€â”€
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

    // â”€â”€ High-risk insights list (deduplicated by employee) â”€â”€
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
      const subtitle = [ep?.job_title, ep?.department].filter(Boolean).join(" â€¢ ") || a.alert_type.replace(/_/g, " ");
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

  // â”€â”€ Merge live WebSocket data â”€â”€
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
      subtitle: `Camera â€¢ PERCLOS ${Math.round(w.eyeClosure * 100)}%`,
      riskLevel: "HIGH" as const,
      meta: `Score ${w.score}/100`,
    }));

  const allInsights = [...liveInsights, ...highRiskItems].slice(0, 6);

  return (
    <AppShell>
      <TopBar
        title={`Welcome Back, ${profile?.first_name ?? "Admin"} ðŸ‘‹`}
        showBell
        showAvatar
      />

      <div className="px-4 lg:px-8 pt-5 pb-28 space-y-5">

        {/* â”€â”€ 4 KPI cards â”€â”€ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Employees"
            value={loading ? "â€”" : String(totalEmployees)}
            delta={stats ? `${stats.active} active now` : "Loading..."}
            up
            icon={<Users className="h-4 w-4" />}
          />
          <KpiCard
            label="High Risk"
            value={loading ? "â€”" : String(highRisk)}
            delta={highRisk > 0 ? "Immediate attention" : "All clear"}
            up={false}
            icon={<AlertOctagon className="h-4 w-4" />}
          />
          <KpiCard
            label="Safe Rate"
            value={loading ? "â€”" : `${lowPct}%`}
            delta={`${lowRisk} employees safe`}
            up
            icon={<Shield className="h-4 w-4" />}
          />
          <KpiCard
            label="Unread Alerts"
            value={loading ? "â€”" : String(totalAlerts)}
            delta={liveUnread > 0 ? `${liveUnread} live now` : "Last 24 hours"}
            up={liveUnread > 0}
            icon={<Zap className="h-4 w-4" />}
          />
        </div>

        {/* â”€â”€ Two-panel row: donut + line chart â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Risk Statistics */}
          <div className="bg-surface rounded-2xl p-5 border border-border/30 shadow-card">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="font-extrabold text-ink text-[16px]">Risk Statistics</h3>
              <MoreHorizontal className="h-4 w-4 text-ink-soft" />
            </div>
            <p className="text-ink-soft text-xs">Based on last 24 hours</p>
            {loading ? (
              <div className="mt-6 h-28 bg-muted animate-pulse rounded-xl" />
            ) : (
              <div className="mt-5 flex items-center gap-6">
                <Donut
                  total={totalEmployees || 1}
                  segments={[
                    { pct: totalEmployees > 0 ? lowRisk / totalEmployees : 0.33, color: "var(--success, #22c55e)" },
                    { pct: totalEmployees > 0 ? modRisk / totalEmployees : 0.33, color: "var(--warning, #f59e0b)" },
                    { pct: totalEmployees > 0 ? highRisk / totalEmployees : 0.34, color: "var(--critical, #ef4444)" },
                  ]}
                />
                <div className="flex-1 space-y-3">
                  <RiskStat label="Low Risk" count={lowRisk} pct={lowPct} dot="bg-success" />
                  <RiskStat label="Moderate" count={modRisk} pct={modPct} dot="bg-warning" />
                  <RiskStat label="High Risk" count={highRisk} pct={highPct} dot="bg-critical" />
                </div>
              </div>
            )}
          </div>

          {/* Alert Trend line chart */}
          <div className="bg-surface rounded-2xl p-5 border border-border/30 shadow-card">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="font-extrabold text-ink text-[16px]">Alert Trend</h3>
              <MoreHorizontal className="h-4 w-4 text-ink-soft" />
            </div>
            <p className="text-ink-soft text-xs">Last 7 days</p>
            <AlertLineChart />
          </div>
        </div>

        {/* â”€â”€ Recent Risk Alerts table â”€â”€ */}
        <div className="bg-surface rounded-2xl p-5 border border-border/30 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-ink text-[16px]">Recent Risk Alerts</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-ink disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <Link to="/admin/alerts" className="flex items-center gap-1 text-xs font-bold text-primary">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : allInsights.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <p className="font-extrabold text-ink">All Clear</p>
              <p className="text-xs text-ink-soft mt-1">No high-risk employees in the last 24h</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft w-8">No</th>
                    <th className="text-left py-2 px-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">Employee</th>
                    <th className="text-left py-2 px-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft hidden md:table-cell">Details</th>
                    <th className="text-left py-2 px-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft hidden sm:table-cell">Time</th>
                    <th className="text-left py-2 px-2 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {allInsights.map((item, idx) => (
                    <tr key={item.key} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-2 text-ink-soft text-[12px]">{idx + 1}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${item.riskLevel === "HIGH" ? "bg-critical/10 text-critical" : "bg-warning/15 text-warning-foreground"}`}
                          >
                            {item.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink text-[13px] leading-tight truncate max-w-25">{item.name}</p>
                            <p className="text-ink-soft text-[11px]">{item.subtitle.split("â€¢")[0].trim()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-ink-soft text-[12px] hidden md:table-cell max-w-35 truncate">{item.subtitle}</td>
                      <td className="py-3 px-2 text-ink-soft text-[12px] hidden sm:table-cell whitespace-nowrap">{item.meta}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${item.riskLevel === "HIGH" ? "bg-critical/10 text-critical" : "bg-warning/15 text-warning-foreground"}`}
                        >
                          {item.riskLevel === "HIGH" ? "High" : "Moderate"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* â”€â”€ Bottom row: monitoring breakdown + fatigue shortcut â”€â”€ */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface rounded-2xl p-5 border border-border/30 shadow-card">
            <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase mb-4">Monitoring Sources</p>
            {loading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => <div key={i} className="h-5 bg-muted animate-pulse rounded" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <MonitorStat label="IoT Wristband" count={iotTotal} dot="bg-warning" />
                <MonitorStat label="Camera" count={cameraTotal} dot="bg-blue-400" />
              </div>
            )}
          </div>

          <Link
            to="/admin/fatigue-dashboard"
            className="bg-surface rounded-2xl p-5 border border-border/30 shadow-card flex flex-col justify-between group"
          >
            <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-warning-foreground" />
            </div>
            <div>
              <p className="font-extrabold text-ink text-[14px]">Fatigue Monitor</p>
              <p className="text-ink-soft text-xs flex items-center gap-1 mt-1 group-hover:text-primary transition-colors">
                Open live dashboard <ChevronRight className="h-3 w-3" />
              </p>
            </div>
          </Link>
        </div>

        {/* Support FAB */}
        <Link
          to="/admin/support"
          className="fixed bottom-24 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-20"
          aria-label="Support"
        >
          <span className="text-lg">ðŸŽ§</span>
        </Link>

      </div>
    </AppShell>
  );
}

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function KpiCard({
  label, value, delta, up, icon,
}: {
  label: string; value: string; delta: string; up: boolean; icon: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-border/30 shadow-card">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase leading-tight">{label}</p>
        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-ink-soft shrink-0">
          {icon}
        </div>
      </div>
      <p className="font-extrabold text-ink text-[32px] leading-none tabular-nums mt-1">{value}</p>
      <div className={`flex items-center gap-1 text-[12px] font-semibold mt-2 ${up ? "text-success" : "text-critical"}`}>
        {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        {delta}
      </div>
    </div>
  );
}

function RiskStat({ label, count, pct, dot }: { label: string; count: number; pct: number; dot: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dot}`} />
        <span className="text-[13px] text-ink font-semibold">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-[13px] font-bold text-ink tabular-nums">{count}</span>
        <span className="text-[11px] text-ink-soft ml-1">({pct}%)</span>
      </div>
    </div>
  );
}

const TREND_PTS = [30, 55, 40, 75, 50, 88, 65];

function AlertLineChart() {
  const [hover, setHover] = useState<number | null>(null);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = Math.max(...TREND_PTS);
  const W = 280, H = 100;
  const pts = TREND_PTS.map((v, i) => ({
    x: (i / (TREND_PTS.length - 1)) * W,
    y: H - (v / max) * H * 0.85,
  }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pts[0].x},${H} ${polyline} ${pts[pts.length - 1].x},${H}`;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.45 0.16 260)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="oklch(0.45 0.16 260)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#aGrad)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="oklch(0.45 0.16 260)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
            <circle
              cx={p.x} cy={p.y} r="4"
              fill={hover === i ? "oklch(0.45 0.16 260)" : "white"}
              stroke="oklch(0.45 0.16 260)"
              strokeWidth="2"
            />
            {hover === i && (
              <g>
                <rect x={p.x - 20} y={p.y - 26} width="40" height="18" rx="4" fill="oklch(0.18 0.04 260)" />
                <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                  {TREND_PTS[i]}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
      <div className="flex justify-between">
        {days.map((d) => (
          <span key={d} className="text-[10px] font-bold text-ink-soft">{d}</span>
        ))}
      </div>
    </div>
  );
}

function MonitorStat({ label, count, dot }: { label: string; count: number; dot: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[13px] font-semibold text-ink">{label}</span>
      </div>
      <span className="text-[13px] font-bold text-ink tabular-nums">{count}</span>
    </div>
  );
}

function Donut({ total, segments }: { total: number; segments: { pct: number; color: string }[] }) {
  const r = 38, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative h-28 w-28 shrink-0">
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
        <span className="text-[20px] font-extrabold text-ink leading-none">{total}</span>
        <span className="text-[9px] font-extrabold tracking-wider text-ink-soft">TOTAL</span>
      </div>
    </div>
  );
}
