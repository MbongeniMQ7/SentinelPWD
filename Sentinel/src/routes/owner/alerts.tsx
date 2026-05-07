import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Search, AlertTriangle, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RiskLevel, AlertType } from "@/lib/database.types";

interface AlertRow {
  alert_id: string;
  alert_type: AlertType;
  risk_level: RiskLevel;
  alert_message: string;
  fatigue_score: number | null;
  is_seen_by_manager: boolean;
  created_at: string;
  profiles: { first_name: string; last_name: string; username: string } | null;
  companies: { company_name: string } | null;
}

const riskStyle = (level: RiskLevel) => {
  if (level === "HIGH") return "bg-destructive-soft text-destructive";
  if (level === "MODERATE") return "bg-gold text-gold-foreground";
  return "bg-secondary text-primary";
};

const fmtTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const SystemAlerts = () => {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");

  const [counts, setCounts] = useState({ high: 0, moderate: 0, low: 0, unseen: 0 });

  useEffect(() => {
    async function load() {
      const [
        { count: high },
        { count: moderate },
        { count: low },
        { count: unseen },
        { data, error },
      ] = await Promise.all([
        supabase.from("risk_alerts").select("*", { count: "exact", head: true }).eq("risk_level", "HIGH"),
        supabase.from("risk_alerts").select("*", { count: "exact", head: true }).eq("risk_level", "MODERATE"),
        supabase.from("risk_alerts").select("*", { count: "exact", head: true }).eq("risk_level", "LOW"),
        supabase.from("risk_alerts").select("*", { count: "exact", head: true }).eq("is_seen_by_manager", false),
        supabase
          .from("risk_alerts")
          .select("alert_id, alert_type, risk_level, alert_message, fatigue_score, is_seen_by_manager, created_at, profiles(first_name, last_name, username), companies(company_name)")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (error) toast.error("Failed to load alerts");
      setCounts({ high: high ?? 0, moderate: moderate ?? 0, low: low ?? 0, unseen: unseen ?? 0 });
      setAlerts((data as unknown as AlertRow[]) ?? []);
    }
    load().finally(() => setLoading(false));
  }, []);

  const filtered = alerts.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.alert_message.toLowerCase().includes(q) ||
      (a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : "").toLowerCase().includes(q) ||
      (a.companies?.company_name ?? "").toLowerCase().includes(q) ||
      a.alert_type.toLowerCase().includes(q);
    const matchRisk = riskFilter === "ALL" || a.risk_level === riskFilter;
    return matchSearch && matchRisk;
  });

  async function markSeen(alertId: string) {
    const { error } = await supabase
      .from("risk_alerts")
      .update({ is_seen_by_manager: true })
      .eq("alert_id", alertId);
    if (error) {
      toast.error("Failed to update alert");
    } else {
      setAlerts((prev) =>
        prev.map((a) => (a.alert_id === alertId ? { ...a, is_seen_by_manager: true } : a))
      );
      setCounts((c) => ({ ...c, unseen: Math.max(0, c.unseen - 1) }));
    }
  }

  return (
    <AppShell>
      <TopBar title="System Alerts" showBell />
      <div className="px-5 pt-3 pb-24 space-y-4">
        <h2 className="font-display text-[28px] font-bold leading-tight">System-Wide Alerts</h2>
        <p className="text-foreground/70 text-sm">All risk alerts fired across every company on the platform.</p>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 bg-destructive-soft">
            <div className="label-eyebrow text-destructive/70">HIGH RISK</div>
            <div className="font-display font-bold text-destructive text-[34px] mt-1">{loading ? "—" : counts.high}</div>
          </div>
          <div className="rounded-2xl p-4 bg-gold/20">
            <div className="label-eyebrow text-gold/80">MODERATE</div>
            <div className="font-display font-bold text-primary text-[34px] mt-1">{loading ? "—" : counts.moderate}</div>
          </div>
          <div className="rounded-2xl p-4 bg-secondary">
            <div className="label-eyebrow">LOW RISK</div>
            <div className="font-display font-bold text-primary text-[34px] mt-1">{loading ? "—" : counts.low}</div>
          </div>
          <div className="rounded-2xl p-4 bg-card shadow-card">
            <div className="label-eyebrow">UNSEEN</div>
            <div className="font-display font-bold text-primary text-[34px] mt-1">{loading ? "—" : counts.unseen}</div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            placeholder="Search alerts, employees, companies…"
            className="bg-transparent flex-1 outline-none text-sm text-primary placeholder:text-muted-foreground/70"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Risk filter */}
        <div className="bg-secondary rounded-xl p-1 flex text-xs font-bold tracking-wider">
          {(["ALL", "HIGH", "MODERATE", "LOW"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`flex-1 py-2 rounded-lg transition ${
                riskFilter === r ? "bg-white text-primary shadow" : "text-primary/60"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading alerts…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No alerts found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => (
              <div
                key={alert.alert_id}
                className={`bg-card text-card-foreground rounded-2xl p-4 shadow-card border-l-4 ${
                  alert.risk_level === "HIGH"
                    ? "border-destructive"
                    : alert.risk_level === "MODERATE"
                    ? "border-gold"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTriangle
                      className={`h-4 w-4 shrink-0 ${
                        alert.risk_level === "HIGH"
                          ? "text-destructive"
                          : alert.risk_level === "MODERATE"
                          ? "text-gold"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className={`pill text-[10px] ${riskStyle(alert.risk_level)}`}>
                      {alert.risk_level}
                    </span>
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                      {alert.alert_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fmtTime(alert.created_at)}</span>
                </div>
                <p className="font-semibold text-primary text-sm mt-2">{alert.alert_message}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {alert.profiles && (
                    <span>👤 {alert.profiles.first_name} {alert.profiles.last_name}</span>
                  )}
                  {alert.companies?.company_name && (
                    <span>📋 {alert.companies.company_name}</span>
                  )}
                  {alert.fatigue_score !== null && (
                    <span>💤 Fatigue: {alert.fatigue_score}</span>
                  )}
                </div>
                {!alert.is_seen_by_manager && (
                  <button
                    onClick={() => markSeen(alert.alert_id)}
                    className="mt-3 text-xs font-bold text-primary underline underline-offset-4 decoration-gold"
                  >
                    Mark as seen
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/alerts")({ component: SystemAlerts });
