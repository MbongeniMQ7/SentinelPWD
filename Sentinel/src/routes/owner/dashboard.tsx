import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Building2, ShieldCheck, Banknote, Users, AlertTriangle, Bug, ClipboardList } from "lucide-react";
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
}

interface AuditEntry {
  audit_id: string;
  action_type: string;
  description: string | null;
  created_at: string;
  profiles: { username: string } | null;
}

const Dashboard = () => {
  const [usageRange, setUsageRange] = useState<"DAY" | "WEEK">("DAY");
  const [data, setData] = useState<DashStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];

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
        supabase
          .from("payments")
          .select("amount")
          .eq("payment_status", "PAID")
          .gte("payment_date", monthStart)
          .lt("payment_date", monthEnd),
        supabase
          .from("audit_logs")
          .select("audit_id, action_type, description, created_at, profiles(username)")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const monthlyRevenue = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

      setData({
        totalCompanies: totalCompanies ?? 0,
        activeCompanies: activeCompanies ?? 0,
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        activeCameraSessions: activeCameraSessions ?? 0,
        activeWristbands: activeWristbands ?? 0,
        openAlerts: openAlerts ?? 0,
        openBugs: openBugs ?? 0,
        monthlyRevenue,
      });
      setAuditLogs((logs as unknown as AuditEntry[]) ?? []);
    }
    load().catch(() => toast.error("Failed to load dashboard stats"));
  }, []);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const fmtRand = (n: number) => `R${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const stats = data ? [
    { Icon: Building2, value: String(data.totalCompanies), label: "TOTAL COMPANIES", badge: `${data.activeCompanies} ACTIVE`, badgeStyle: "bg-gold text-gold-foreground" },
    { Icon: ShieldCheck, value: String(data.activeCompanies), label: "ACTIVE SUBS", badge: `${data.totalCompanies > 0 ? Math.round((data.activeCompanies / data.totalCompanies) * 100) : 0}% RATE`, badgeStyle: "bg-gold text-gold-foreground" },
    { Icon: Banknote, value: fmtRand(data.monthlyRevenue), label: "MONTHLY REVENUE", badge: "THIS MONTH", badgeStyle: "bg-[#5a4a1a] text-gold" },
    { Icon: ShieldCheck, value: `${data.activeCameraSessions} CAM`, label: "ACTIVE SESSIONS", badge: `${data.activeWristbands} WRISTBANDS`, badgeStyle: "bg-[#5a4a1a] text-gold" },
    { Icon: Users, value: fmt(data.totalUsers), label: "TOTAL USERS", badge: `LIVE: ${data.activeUsers}`, badgeStyle: "bg-secondary text-primary" },
    { Icon: AlertTriangle, value: String(data.openAlerts), label: "OPEN ALERTS", badge: "UNSEEN", badgeStyle: "bg-destructive-soft text-destructive" },
    { Icon: Bug, value: String(data.openBugs), label: "OPEN BUG REPORTS", badge: "OPEN + IN PROGRESS", badgeStyle: "bg-secondary text-primary" },
  ] : [
    { Icon: Building2, value: "—", label: "TOTAL COMPANIES", badge: "LOADING", badgeStyle: "bg-gold text-gold-foreground" },
    { Icon: ShieldCheck, value: "—", label: "ACTIVE SUBS", badge: "LOADING", badgeStyle: "bg-gold text-gold-foreground" },
    { Icon: Banknote, value: "—", label: "MONTHLY REVENUE", badge: "LOADING", badgeStyle: "bg-[#5a4a1a] text-gold" },
    { Icon: ShieldCheck, value: "—", label: "ACTIVE SESSIONS", badge: "LOADING", badgeStyle: "bg-[#5a4a1a] text-gold" },
    { Icon: Users, value: "—", label: "TOTAL USERS", badge: "LOADING", badgeStyle: "bg-secondary text-primary" },
    { Icon: AlertTriangle, value: "—", label: "OPEN ALERTS", badge: "LOADING", badgeStyle: "bg-destructive-soft text-destructive" },
    { Icon: Bug, value: "—", label: "OPEN BUG REPORTS", badge: "LOADING", badgeStyle: "bg-secondary text-primary" },
  ];

  return (
    <AppShell>
      <TopBar showSettings />
      <div className="px-5 pt-2 pb-6">
        <h2 className="font-display text-[34px] leading-tight font-bold">Systems Overview</h2>
        <p className="text-foreground/70 mt-2 text-[15px]">Real-time performance metrics for the SentinelAI ecosystem.</p>

        <div className="space-y-4 mt-6">
          {stats.map(({ Icon, value, label, badge, badgeStyle }, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-primary/70">
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`pill ${badgeStyle}`}>{badge}</span>
              </div>
              <div className="mt-4 font-display font-bold text-primary text-[40px] leading-none">{value}</div>
              {label && <div className="label-eyebrow mt-2">{label}</div>}
            </div>
          ))}

          {/* Monitoring Mode */}
          <div className="stat-card">
            <h3 className="font-display font-bold text-primary text-xl">Monitoring Mode</h3>
            <div className="relative h-56 mt-4 flex items-center justify-center">
              <div className="absolute h-44 w-44 rotate-45 border-2 border-secondary rounded-2xl" />
              <div className="absolute h-44 w-44 rotate-45 border-[6px] border-primary rounded-2xl" />
              <div className="absolute h-44 w-2 bg-gradient-gold rounded-full rotate-[20deg] origin-center" />
              <div className="text-center">
                <div className="font-display font-bold text-primary text-3xl">62%</div>
                <div className="label-eyebrow text-primary/60">BIOMETRIC</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-around text-sm">
              <span className="flex items-center gap-2 text-primary"><span className="h-2 w-2 rounded-full bg-primary" />Biometric Flow</span>
              <span className="flex items-center gap-2 text-primary"><span className="h-2 w-2 rounded-full bg-gold" />IoT Telemetry</span>
            </div>
          </div>

          {/* Recent Usage */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-primary text-xl">Recent System Usage</h3>
              <div className="bg-secondary rounded-full p-1 flex">
                {(["DAY", "WEEK"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUsageRange(r)}
                    className={`text-xs font-bold px-4 py-1 rounded-full transition ${
                      usageRange === r ? "bg-white shadow text-primary" : "text-primary/60"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 h-40 flex items-end gap-2">
              {[55, 70, 95, 65, 0, 60, 78].map((h, i) => (
                <div key={i} className={`flex-1 rounded-t-md ${h ? "bg-secondary" : ""}`} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="grid grid-cols-7 mt-2 text-[10px] font-bold text-primary/60 tracking-wider text-center">
              {["MON","TUE","WED","THU","","SAT","SUN"].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-[11px] font-bold tracking-wider text-primary/70">
              <span>AVG<br />LATENCY</span><span>PEAK LOAD</span><span>API<br />REQUESTS</span>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => toast("Add new metric — coming soon")}
                className="mt-3 h-9 w-9 rounded-tl-xl bg-primary text-white flex items-center justify-center text-xl"
                aria-label="Add"
              >
                +
              </button>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-5 w-5 text-primary/70" />
              <h3 className="font-display font-bold text-primary text-xl">Recent Activity &amp; Audit Logs</h3>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.audit_id} className="flex items-start gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <div className="h-2 w-2 rounded-full bg-gold mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-primary text-sm truncate">{log.action_type.replace(/_/g, " ")}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0">{fmtTime(log.created_at)}</span>
                      </div>
                      {log.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.description}</p>
                      )}
                      {log.profiles?.username && (
                        <span className="text-[11px] text-primary/60 font-semibold">@{log.profiles.username}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};


export const Route = createFileRoute("/owner/dashboard")({ component: Dashboard });
