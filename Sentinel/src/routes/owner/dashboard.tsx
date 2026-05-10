import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import {
  Building2, Banknote, Users, AlertTriangle, Bug,
  Camera, Watch, TrendingUp, TrendingDown, RefreshCcw,
  CheckCircle2, Clock, XCircle, ChevronRight, Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

interface DashStats {
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  activeUsers: number;
  activeCameraSessions: number;
  activeWristbands: number;
  openAlerts: number;
  openBugs: number;
  monthlyRevenue: number;
  prevMonthRevenue: number;
}

interface AuditEntry {
  audit_id: string;
  action_type: string;
  description: string | null;
  created_at: string;
  profiles: { username: string; first_name: string; last_name: string } | null;
}

function initials(entry: AuditEntry) {
  const fn = entry.profiles?.first_name?.[0] ?? "";
  const ln = entry.profiles?.last_name?.[0] ?? "";
  return (fn + ln).toUpperCase() || "??";
}

const AVATAR_BG = [
  "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
  "#ef4444", "#14b8a6", "#f97316",
];

const Dashboard = () => {
  const { profile } = useProfile();
  const [data, setData] = useState<DashStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];

    const [
      { count: totalCompanies },
      { count: activeCompanies },
      { count: totalUsers },
      { count: activeUsers },
      { count: activeCameraSessions },
      { count: activeWristbands },
      { count: openAlerts },
      { count: openBugs },
      { data: payments },
      { data: prevPayments },
      { data: logs },
    ] = await Promise.all([
      supabase.from("companies").select("*", { count: "exact", head: true }),
      supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("user_presence").select("*", { count: "exact", head: true }).eq("is_online", true),
      supabase.from("camera_analysis_sessions").select("*", { count: "exact", head: true }).eq("status", "RUNNING"),
      supabase.from("iot_wristbands").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("risk_alerts").select("*", { count: "exact", head: true }).eq("is_seen_by_manager", false),
      supabase.from("bug_reports").select("*", { count: "exact", head: true }).in("bug_status", ["OPEN", "IN_PROGRESS"]),
      supabase.from("payments").select("amount").eq("payment_status", "PAID").gte("payment_date", monthStart).lt("payment_date", monthEnd),
      supabase.from("payments").select("amount").eq("payment_status", "PAID").gte("payment_date", prevMonthStart).lt("payment_date", monthStart),
      supabase.from("audit_logs").select("audit_id, action_type, description, created_at, profiles(username, first_name, last_name)").order("created_at", { ascending: false }).limit(12),
    ]);

    const monthlyRevenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const prevMonthRevenue = (prevPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);

    setData({ totalCompanies: totalCompanies ?? 0, activeCompanies: activeCompanies ?? 0, totalUsers: totalUsers ?? 0, activeUsers: activeUsers ?? 0, activeCameraSessions: activeCameraSessions ?? 0, activeWristbands: activeWristbands ?? 0, openAlerts: openAlerts ?? 0, openBugs: openBugs ?? 0, monthlyRevenue, prevMonthRevenue });
    setAuditLogs((logs as unknown as AuditEntry[]) ?? []);
  }

  useEffect(() => { load().catch(() => toast.error("Failed to load dashboard")); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => toast.error("Refresh failed"));
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const fmtRand = (n: number) => `R${n.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
  const revDelta = data ? (data.prevMonthRevenue > 0 ? ((data.monthlyRevenue - data.prevMonthRevenue) / data.prevMonthRevenue) * 100 : 0) : 0;

  const fmtTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const actionIcon = (type: string) => {
    if (type.includes("ALERT")) return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
    if (type.includes("CREATE") || type.includes("ADD")) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (type.includes("DELETE") || type.includes("REMOVE")) return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
    return <Clock className="h-3.5 w-3.5 text-blue-400" />;
  };

  const ownerName = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "Owner";
  const ownerInitials = ownerName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "OW";

  return (
    <AppShell>
      {/* ── Top bar ── */}
      <TopBar showSettings />

      {/* ── Page wrapper: on desktop, 2 cols (main | right panel) ── */}
      <div className="flex min-h-[calc(100dvh-60px)]">

        {/* ═══════════════ MAIN CONTENT ═══════════════ */}
        <div className="flex-1 min-w-0 px-4 lg:px-8 pt-5 pb-28 lg:pb-10 space-y-6">

          {/* Page title row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-primary text-3xl lg:text-4xl leading-tight">My Activity</h1>
              <p className="text-muted-foreground text-sm mt-0.5">SentinelAI Platform Overview</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* ── Profile / owner hero card ── */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-amber-300 to-amber-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow">
                {ownerInitials}
              </div>
              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-primary text-lg leading-tight">{ownerName}</h2>
                    <p className="text-muted-foreground text-xs mt-0.5">Platform Owner · SentinelAI</p>
                  </div>
                  <Link to="/owner/settings" className="text-xs font-bold text-muted-foreground hover:text-primary">
                    Edit
                  </Link>
                </div>
                {/* Info row */}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{data?.totalCompanies ?? "—"} companies</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{data?.totalUsers ?? "—"} users</span>
                  <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-emerald-500" />{data?.activeUsers ?? "—"} online now</span>
                </div>
              </div>
            </div>

            {/* 3 stats with colored progress bars */}
            <div className="mt-5 grid grid-cols-3 gap-4 pt-4 border-t border-border">
              {[
                { label: "Total Companies", value: data?.totalCompanies ?? 0, max: Math.max(data?.totalCompanies ?? 1, 1), color: "bg-emerald-400", display: String(data?.totalCompanies ?? "—") },
                { label: "Total Users", value: data?.totalUsers ?? 0, max: Math.max(data?.totalUsers ?? 1, 1), color: "bg-blue-400", display: String(data?.totalUsers ?? "—") },
                { label: "Monthly Revenue", value: data ? Math.min(data.monthlyRevenue, 1) : 0, max: 1, color: "bg-amber-400", display: data ? fmtRand(data.monthlyRevenue) : "—" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="font-display font-bold text-primary text-xl mt-0.5 tabular-nums">{s.display}</p>
                  <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color} transition-all duration-700`} style={{ width: s.max > 0 ? `${Math.min((s.value / s.max) * 100, 100)}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Platform Summary — 3 colored cards like Realty Hub ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-primary text-base">Platform Summary</h3>
              <span className="text-xs text-muted-foreground">This Month</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Green — active companies */}
              <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Active Companies</p>
                  <Building2 className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="font-display font-bold text-emerald-800 text-3xl tabular-nums">{data?.activeCompanies ?? "—"}</p>
                <p className="text-xs text-emerald-600 mt-1">{data ? `of ${data.totalCompanies} total` : "Loading..."}</p>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" /> All subscribed
                </div>
              </div>

              {/* Amber — live monitoring */}
              <div className="rounded-2xl p-4 bg-amber-50 border border-amber-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Live Monitoring</p>
                  <Camera className="h-4 w-4 text-amber-500" />
                </div>
                <p className="font-display font-bold text-amber-800 text-3xl tabular-nums">{data ? (data.activeCameraSessions + data.activeWristbands) : "—"}</p>
                <p className="text-xs text-amber-600 mt-1">{data?.activeCameraSessions ?? "—"} cameras · {data?.activeWristbands ?? "—"} IoT</p>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <Watch className="h-3.5 w-3.5" /> Active sensors
                </div>
              </div>

              {/* Rose — open issues */}
              <div className="rounded-2xl p-4 bg-rose-50 border border-rose-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Open Issues</p>
                  <Bug className="h-4 w-4 text-rose-500" />
                </div>
                <p className="font-display font-bold text-rose-800 text-3xl tabular-nums">{data ? (data.openAlerts + data.openBugs) : "—"}</p>
                <p className="text-xs text-rose-600 mt-1">{data?.openAlerts ?? "—"} alerts · {data?.openBugs ?? "—"} bugs</p>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                  <TrendingDown className="h-3.5 w-3.5" /> Needs attention
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick links (New Objects style) ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-primary text-base">Quick Access</h3>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {data ? `${data.totalCompanies} items` : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Companies", sub: `${data?.totalCompanies ?? "—"} total`, to: "/owner/companies", Icon: Building2, bg: "bg-blue-50", icon: "text-blue-500", border: "border-blue-100" },
                { label: "Revenue", sub: data ? fmtRand(data.monthlyRevenue) : "—", to: "/owner/revenue", Icon: Banknote, bg: "bg-emerald-50", icon: "text-emerald-500", border: "border-emerald-100" },
                { label: "Bug Reports", sub: `${data?.openBugs ?? "—"} open`, to: "/owner/issues", Icon: Bug, bg: "bg-rose-50", icon: "text-rose-500", border: "border-rose-100" },
                { label: "All Users", sub: `${data?.totalUsers ?? "—"} users`, to: "/owner/users", Icon: Users, bg: "bg-violet-50", icon: "text-violet-500", border: "border-violet-100" },
              ].map(({ label, sub, to, Icon, bg, icon, border }) => (
                <Link
                  key={label}
                  to={to}
                  className={`rounded-2xl p-4 border ${bg} ${border} flex flex-col gap-3 group hover:shadow-sm transition-shadow`}
                >
                  <div className={`h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
                    <Icon className={`h-4 w-4 ${icon}`} />
                  </div>
                  <div>
                    <p className="font-bold text-primary text-sm">{label}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors self-end" />
                </Link>
              ))}
            </div>
          </div>

          {/* Revenue delta pill — mobile only (right panel hidden on mobile) */}
          <div className="lg:hidden bg-white rounded-2xl border border-border p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Revenue vs Last Month</p>
              <p className="font-display font-bold text-primary text-2xl mt-0.5">{data ? fmtRand(data.monthlyRevenue) : "—"}</p>
            </div>
            <span className={`flex items-center gap-1 text-sm font-bold ${revDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {revDelta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(revDelta).toFixed(1)}%
            </span>
          </div>

        </div>

        {/* ═══════════════ RIGHT PANEL (desktop only) ═══════════════ */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border bg-white/60 px-5 pt-6 pb-10 gap-6 overflow-y-auto">

          {/* Now online */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-primary text-sm">Now online ({data?.activeUsers ?? 0})</h3>
              <div className="flex -space-x-2">
                {Array.from({ length: Math.min(data?.activeUsers ?? 0, 4) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: AVATAR_BG[i % AVATAR_BG.length] }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                {(data?.activeUsers ?? 0) > 4 && (
                  <div className="h-8 w-8 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    +{(data?.activeUsers ?? 0) - 4}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-muted-foreground">{data?.activeUsers ?? "—"} users live right now</span>
            </div>
          </div>

          {/* Revenue vs last month */}
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue Delta</p>
            <p className="font-display font-bold text-primary text-2xl mt-1">{data ? fmtRand(data.monthlyRevenue) : "—"}</p>
            <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${revDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {revDelta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(revDelta).toFixed(1)}% vs last month
            </div>
          </div>

          {/* Live Feed */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-primary text-sm">Live Feed</h3>
              <button onClick={handleRefresh} className="text-muted-foreground hover:text-primary transition-colors">
                <RefreshCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="space-y-0">
                {auditLogs.map((log, idx) => {
                  const ini = initials(log);
                  const uname = log.profiles?.username ?? log.profiles?.first_name ?? "User";
                  return (
                    <div key={log.audit_id} className="flex gap-3 py-3 border-b border-border last:border-0">
                      {/* Timeline dot + avatar */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: AVATAR_BG[idx % AVATAR_BG.length] }}
                        >
                          {ini}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[12px] font-semibold text-primary truncate">{uname}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(log.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {actionIcon(log.action_type)}
                          <p className="text-[11px] text-muted-foreground truncate">
                            {log.description ?? log.action_type.replace(/_/g, " ").toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link to="/owner/activity" className="flex items-center gap-1 text-xs font-bold text-primary mt-3">
              See all activity <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

        </aside>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/dashboard")({ component: Dashboard });
  const [data, setData] = useState<DashStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];

      const [
        { count: totalCompanies },
        { count: activeCompanies },
        { count: totalUsers },
        { count: activeUsers },
        { count: activeCameraSessions },
        { count: activeWristbands },
        { count: openAlerts },
        { count: openBugs },
        { data: payments },
        { data: prevPayments },
        { data: logs },
      ] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_presence").select("*", { count: "exact", head: true }).eq("is_online", true),
        supabase.from("camera_analysis_sessions").select("*", { count: "exact", head: true }).eq("status", "RUNNING"),
        supabase.from("iot_wristbands").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
        supabase.from("risk_alerts").select("*", { count: "exact", head: true }).eq("is_seen_by_manager", false),
        supabase.from("bug_reports").select("*", { count: "exact", head: true }).in("bug_status", ["OPEN", "IN_PROGRESS"]),
        supabase.from("payments").select("amount").eq("payment_status", "PAID").gte("payment_date", monthStart).lt("payment_date", monthEnd),
        supabase.from("payments").select("amount").eq("payment_status", "PAID").gte("payment_date", prevMonthStart).lt("payment_date", monthStart),
        supabase.from("audit_logs").select("audit_id, action_type, description, created_at, profiles(username, first_name, last_name)").order("created_at", { ascending: false }).limit(8),
      ]);

      const monthlyRevenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const prevMonthRevenue = (prevPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);

      setData({ totalCompanies: totalCompanies ?? 0, activeCompanies: activeCompanies ?? 0, totalUsers: totalUsers ?? 0, activeUsers: activeUsers ?? 0, activeCameraSessions: activeCameraSessions ?? 0, activeWristbands: activeWristbands ?? 0, openAlerts: openAlerts ?? 0, openBugs: openBugs ?? 0, monthlyRevenue, prevMonthRevenue });
      setAuditLogs((logs as unknown as AuditEntry[]) ?? []);
    }
    load().catch(() => toast.error("Failed to load dashboard"));
  }, []);

  const fmtRand = (n: number) => `R${n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const revDelta = data ? (data.prevMonthRevenue > 0 ? ((data.monthlyRevenue - data.prevMonthRevenue) / data.prevMonthRevenue) * 100 : 0) : 0;
  const revUp = revDelta >= 0;

  const fmtTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const actionIcon = (type: string) => {
    if (type.includes("ALERT")) return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    if (type.includes("CREATE") || type.includes("ADD")) return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (type.includes("DELETE") || type.includes("REMOVE")) return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <AppShell>
      <TopBar showSettings />

      <div className="px-4 pt-3 pb-24 space-y-5">

        {/* ── Hero card — mirrors COINEST's dark bank card ── */}
        <div className="rounded-2xl p-5 bg-linear-to-br from-primary to-[hsl(217_60%_20%)] text-white relative overflow-hidden shadow-lg">
          {/* decorative circles */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="absolute -right-2 top-10 h-20 w-20 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-1/2 h-24 w-40 rounded-full bg-gold/10 blur-2xl" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gold/20 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-gold" />
              </div>
              <span className="text-xs font-bold tracking-widest text-white/70 uppercase">SentinelAI</span>
            </div>
            <Bell className="h-5 w-5 text-white/50" />
          </div>

          <div className="relative z-10">
            <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Monthly Revenue</p>
            <div className="flex items-end gap-3">
              <span className="font-display text-4xl font-bold leading-none">
                {data ? fmtRand(data.monthlyRevenue) : "—"}
              </span>
              {data && (
                <span className={`flex items-center gap-0.5 text-xs font-bold pb-1 ${revUp ? "text-success" : "text-destructive"}`}>
                  {revUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {Math.abs(revDelta).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 mt-1">vs last month</p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 relative z-10">
            {[
              { label: "Companies", value: data?.totalCompanies ?? "—", sub: `${data?.activeCompanies ?? "—"} active` },
              { label: "Total Users", value: data?.totalUsers ?? "—", sub: `${data?.activeUsers ?? "—"} online` },
              { label: "Open Alerts", value: data?.openAlerts ?? "—", sub: "unseen" },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/50 uppercase tracking-wider">{item.label}</p>
                <p className="font-display font-bold text-white text-xl leading-tight">{item.value}</p>
                <p className="text-[10px] text-white/40">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick-stat row — mirrors COINEST's 3 KPI cards ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active Subs", value: data?.activeCompanies ?? "—", Icon: Building2, delta: "+2 this week", up: true },
            { label: "Bug Reports", value: data?.openBugs ?? "—", Icon: Bug, delta: "open issues", up: false },
            { label: "Sessions", value: data ? `${data.activeCameraSessions}` : "—", Icon: Camera, delta: `${data?.activeWristbands ?? "—"} IoT`, up: true },
          ].map(({ label, value, Icon, delta, up }) => (
            <div key={label} className="bg-card rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary/70" />
                </div>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="font-display font-bold text-primary text-2xl leading-none">{value}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
              <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${up ? "text-success" : "text-destructive"}`}>
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta}
              </div>
            </div>
          ))}
        </div>

        {/* ── Cashflow chart — mirrors COINEST's bar chart ── */}
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Platform Cashflow</p>
              <p className="font-display font-bold text-primary text-xl mt-0.5">This Year</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary inline-block" />Revenue</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-gold inline-block" />Expense</span>
            </div>
          </div>

          {hoveredBar !== null && (
            <div className="mb-2 bg-secondary rounded-xl px-3 py-2 text-xs font-bold text-primary w-fit">
              {CASHFLOW_BARS[hoveredBar].label} — Revenue: {CASHFLOW_BARS[hoveredBar].revenue}% · Expense: {CASHFLOW_BARS[hoveredBar].expense}%
            </div>
          )}

          <div className="flex items-end gap-1.5 h-36 mt-4">
            {CASHFLOW_BARS.map((bar, i) => (
              <div
                key={bar.label}
                className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end cursor-pointer"
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div
                  className={`w-full rounded-t-md transition-all duration-200 ${hoveredBar === i ? "bg-gold" : "bg-primary/80"}`}
                  style={{ height: `${bar.revenue}%` }}
                />
                <div
                  className={`w-full rounded-t-md transition-all duration-200 ${hoveredBar === i ? "bg-gold/40" : "bg-gold/25"}`}
                  style={{ height: `${bar.expense}%`, marginTop: "-100%" }}
                />
              </div>
            ))}
          </div>
          <div className="grid mt-2" style={{ gridTemplateColumns: `repeat(${CASHFLOW_BARS.length}, 1fr)` }}>
            {CASHFLOW_BARS.map((b) => (
              <span key={b.label} className="text-center text-[9px] font-bold text-muted-foreground tracking-wider">{b.label}</span>
            ))}
          </div>
        </div>

        {/* ── Expense breakdown + Monitoring split ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Expense donut */}
          <div className="bg-card rounded-2xl p-4 shadow-card col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Statistic</p>
                <p className="text-xs text-muted-foreground mt-0.5">Expense breakdown</p>
              </div>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-4">
              {/* Donut ring (CSS) */}
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  {EXPENSE_SLICES.reduce<{ offset: number; elements: React.ReactNode[] }>(
                    (acc, slice, i) => {
                      const colors = ["hsl(222,60%,14%)", "hsl(42,95%,55%)", "hsl(152,60%,40%)", "hsl(78,100%,40%)", "hsl(0,78%,60%)"];
                      const el = (
                        <circle
                          key={i}
                          cx="18" cy="18" r="15.9"
                          fill="none"
                          stroke={colors[i]}
                          strokeWidth="3.5"
                          strokeDasharray={`${slice.pct} ${100 - slice.pct}`}
                          strokeDashoffset={`${-acc.offset}`}
                          strokeLinecap="butt"
                        />
                      );
                      return { offset: acc.offset + slice.pct, elements: [...acc.elements, el] };
                    },
                    { offset: 0, elements: [] }
                  ).elements}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Total</span>
                  <span className="font-display font-bold text-primary text-sm leading-tight">Spend</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2">
                {EXPENSE_SLICES.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-sm shrink-0 ${s.color}`} />
                      <span className="text-[11px] text-muted-foreground truncate">{s.label}</span>
                    </div>
                    <span className="text-[11px] font-bold text-primary shrink-0">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live monitoring tiles */}
          <div className="bg-card rounded-2xl p-4 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Camera className="h-5 w-5 text-primary/60" />
              <span className="pill bg-success/20 text-success text-[10px]">LIVE</span>
            </div>
            <div>
              <p className="font-display font-bold text-primary text-2xl">{data?.activeCameraSessions ?? "—"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Camera Sessions</p>
            </div>
            <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((data?.activeCameraSessions ?? 0) * 10, 100)}%` }} />
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Watch className="h-5 w-5 text-gold" />
              <span className="pill bg-gold/20 text-gold-foreground text-[10px]">IoT</span>
            </div>
            <div>
              <p className="font-display font-bold text-primary text-2xl">{data?.activeWristbands ?? "—"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Active Wristbands</p>
            </div>
            <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full" style={{ width: `${Math.min((data?.activeWristbands ?? 0) * 5, 100)}%` }} />
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="pill bg-destructive/10 text-destructive text-[10px]">OPEN</span>
            </div>
            <div>
              <p className="font-display font-bold text-primary text-2xl">{data?.openAlerts ?? "—"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Unseen Alerts</p>
            </div>
            <Link to="/owner/alerts" className="mt-3 flex items-center gap-1 text-[11px] font-bold text-gold">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary/60" />
              <span className="pill bg-success/20 text-success text-[10px]">ONLINE</span>
            </div>
            <div>
              <p className="font-display font-bold text-primary text-2xl">{data?.activeUsers ?? "—"}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Users Live Now</p>
            </div>
            <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full"
                style={{ width: data && data.totalUsers > 0 ? `${Math.round((data.activeUsers / data.totalUsers) * 100)}%` : "0%" }}
              />
            </div>
          </div>
        </div>

        {/* ── Recent Activity — mirrors COINEST's activity feed ── */}
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-primary text-lg">Recent Activity</h3>
            <Link to="/owner/activity" className="text-[11px] font-bold text-gold flex items-center gap-1">
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="space-y-0">
              {auditLogs.map((log, idx) => (
                <div key={log.audit_id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avatarColors[idx % avatarColors.length]}`}>
                    {initials(log)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {actionIcon(log.action_type)}
                        <span className="text-[13px] font-semibold text-primary leading-tight">
                          {log.profiles?.username
                            ? <><span className="font-bold">@{log.profiles.username}</span> · </>
                            : null}
                          <span className="text-muted-foreground font-normal">
                            {log.action_type.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{fmtTime(log.created_at)}</span>
                    </div>
                    {log.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{log.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick links row ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "All Companies", to: "/owner/companies", Icon: Building2 },
            { label: "Revenue", to: "/owner/revenue", Icon: Banknote },
            { label: "Bug Reports", to: "/owner/issues", Icon: Bug },
            { label: "All Users", to: "/owner/users", Icon: Users },
          ].map(({ label, to, Icon }) => (
            <Link
              key={label}
              to={to}
              className="bg-card rounded-2xl p-4 shadow-card flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary/70" />
                </div>
                <span className="font-bold text-sm text-primary">{label}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
            </Link>
          ))}
        </div>

      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/dashboard")({ component: Dashboard });
