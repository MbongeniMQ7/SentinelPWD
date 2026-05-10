import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import {
  Building2, ShieldCheck, Banknote, Users, AlertTriangle, Bug,
  Camera, Watch, TrendingUp, TrendingDown, MoreHorizontal,
  ArrowRight, Bell, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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

// Cashflow bar heights — static shape, real data would come from a monthly query
const CASHFLOW_BARS = [
  { label: "Jan", revenue: 62, expense: 38 },
  { label: "Feb", revenue: 55, expense: 42 },
  { label: "Mar", revenue: 80, expense: 50 },
  { label: "Apr", revenue: 70, expense: 35 },
  { label: "May", revenue: 90, expense: 55 },
  { label: "Jun", revenue: 75, expense: 45 },
  { label: "Jul", revenue: 88, expense: 40 },
  { label: "Aug", revenue: 65, expense: 48 },
  { label: "Sep", revenue: 95, expense: 52 },
  { label: "Oct", revenue: 72, expense: 38 },
  { label: "Nov", revenue: 85, expense: 44 },
  { label: "Dec", revenue: 100, expense: 60 },
];

// Expense breakdown — mirrors COINEST's donut panel
const EXPENSE_SLICES = [
  { label: "Infrastructure", pct: 38, color: "bg-primary" },
  { label: "Support Ops", pct: 22, color: "bg-gold" },
  { label: "R&D", pct: 18, color: "bg-success" },
  { label: "Marketing", pct: 13, color: "bg-warning" },
  { label: "Admin", pct: 9, color: "bg-destructive" },
];

function initials(entry: AuditEntry) {
  const fn = entry.profiles?.first_name?.[0] ?? "";
  const ln = entry.profiles?.last_name?.[0] ?? "";
  return (fn + ln).toUpperCase() || "??";
}

const avatarColors = [
  "bg-gold text-gold-foreground",
  "bg-success/30 text-success",
  "bg-primary text-primary-foreground",
  "bg-warning/30 text-warning-foreground",
  "bg-destructive/20 text-destructive",
];

const Dashboard = () => {
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
