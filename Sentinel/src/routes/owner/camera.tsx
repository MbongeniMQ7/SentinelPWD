import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { supabase } from "@/lib/supabase";
import { Camera, Search, RefreshCw, Activity } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type SessionStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface CameraSession {
  session_id: string;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
  model_version: string | null;
  fatigue_score: number | null;
  alert_triggered: boolean | null;
  profile: { first_name: string; last_name: string; username: string } | null;
  company: { company_name: string } | null;
}

const STATUS_STYLE: Record<SessionStatus, string> = {
  RUNNING: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  FAILED: "bg-red-100 text-red-600",
  CANCELLED: "bg-orange-100 text-orange-700",
};

const CameraAnalysis = () => {
  const [sessions, setSessions] = useState<CameraSession[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | SessionStatus>("RUNNING");
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ running: 0, completed: 0, failed: 0 });

  const fetch = useCallback(async () => {
    setLoading(true);

    // Counts
    const [{ count: running }, { count: completed }, { count: failed }] = await Promise.all([
      supabase.from("camera_analysis_sessions").select("*", { count: "exact", head: true }).eq("status", "RUNNING"),
      supabase.from("camera_analysis_sessions").select("*", { count: "exact", head: true }).eq("status", "COMPLETED"),
      supabase.from("camera_analysis_sessions").select("*", { count: "exact", head: true }).eq("status", "FAILED"),
    ]);
    setCounts({ running: running ?? 0, completed: completed ?? 0, failed: failed ?? 0 });

    let q = supabase
      .from("camera_analysis_sessions")
      .select(
        `session_id, status, started_at, ended_at, model_version, fatigue_score, alert_triggered,
         profiles!camera_analysis_sessions_employee_profile_id_fkey(first_name, last_name, username),
         companies!camera_analysis_sessions_company_id_fkey(company_name)`
      )
      .order("started_at", { ascending: false })
      .limit(100);

    if (filterStatus !== "ALL") q = q.eq("status", filterStatus);

    const { data } = await q;
    let rows: CameraSession[] = (data ?? []).map((r: any) => ({
      ...r,
      profile: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles,
      company: Array.isArray(r.companies) ? r.companies[0] ?? null : r.companies,
    }));

    if (search.trim()) {
      const term = search.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.profile?.first_name?.toLowerCase().includes(term) ||
          s.profile?.last_name?.toLowerCase().includes(term) ||
          s.profile?.username?.toLowerCase().includes(term) ||
          s.company?.company_name?.toLowerCase().includes(term)
      );
    }

    setSessions(rows);
    setLoading(false);
  }, [filterStatus, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const statCards = [
    { label: "Live Sessions", value: counts.running, color: "text-green-600" },
    { label: "Completed Today", value: counts.completed, color: "text-primary" },
    { label: "Failed", value: counts.failed, color: "text-red-500" },
  ];

  return (
    <AppShell>
      <TopBar title="Camera Analysis" />
      <div className="px-4 pt-3 pb-24 space-y-4">
        <div>
          <h2 className="font-display text-[26px] font-bold">Camera Analysis</h2>
          <p className="text-sm text-muted-foreground">Live & historical biometric camera sessions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map(({ label, value, color }) => (
            <div key={label} className="bg-card rounded-2xl p-4 shadow-card text-center">
              <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Search & filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee or company…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card shadow-card text-sm outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["RUNNING", "COMPLETED", "FAILED", "CANCELLED", "ALL"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filterStatus === s ? "bg-primary text-white" : "bg-card text-muted-foreground shadow-card"
              }`}
            >
              {s === "ALL" ? "All" : s}
            </button>
          ))}
          <button
            onClick={fetch}
            className="ml-auto p-2 rounded-xl bg-card shadow-card text-muted-foreground hover:text-primary"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sessions list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No sessions found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const statusStyle = STATUS_STYLE[s.status as SessionStatus] ?? "bg-gray-100 text-gray-500";
              const duration =
                s.started_at && s.ended_at
                  ? `${Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)} min`
                  : s.started_at && s.status === "RUNNING"
                  ? `Started ${formatDistanceToNow(new Date(s.started_at), { addSuffix: true })}`
                  : null;

              return (
                <div key={s.session_id} className="bg-card rounded-xl px-4 py-3 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-primary truncate">
                          {s.profile
                            ? `${s.profile.first_name} ${s.profile.last_name}`
                            : "Unknown Employee"}
                        </span>
                        {s.status === "RUNNING" && (
                          <Activity className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.company?.company_name ?? "—"}
                        {s.model_version && ` · Model ${s.model_version}`}
                      </p>
                      {duration && <p className="text-xs text-muted-foreground">{duration}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusStyle}`}>
                        {s.status}
                      </span>
                      {s.fatigue_score !== null && (
                        <span
                          className={`text-xs font-bold ${
                            s.fatigue_score >= 70 ? "text-red-500" : s.fatigue_score >= 40 ? "text-yellow-500" : "text-green-600"
                          }`}
                        >
                          Fatigue {s.fatigue_score}%
                        </span>
                      )}
                      {s.alert_triggered && (
                        <span className="text-[10px] font-bold text-red-500 uppercase">⚠ Alert</span>
                      )}
                    </div>
                  </div>
                  {s.started_at && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {format(new Date(s.started_at), "dd MMM yyyy, HH:mm")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/camera")({ component: CameraAnalysis });
