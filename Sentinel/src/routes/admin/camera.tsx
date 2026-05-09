import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Camera, Search, RefreshCw } from "lucide-react";
import type { SessionStatus } from "@/lib/database.types";

export const Route = createFileRoute("/admin/camera")({
  component: CameraPage,
});

interface SessionRow {
  session_id: string;
  started_at: string;
  stopped_at: string | null;
  status: SessionStatus;
  stop_reason: string | null;
  model_version: string | null;
  employee_name: string;
  username: string;
}

const STATUS_STYLE: Record<SessionStatus, string> = {
  RUNNING: "bg-green-100 text-green-700",
  STOPPED: "bg-muted text-ink-soft",
  FAILED: "bg-red-100 text-red-700",
  INTERRUPTED: "bg-warning/20 text-warning-foreground",
};

function formatDuration(start: string, end: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function CameraPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SessionStatus | "ALL">("ALL");

  // Stats
  const running = sessions.filter((s) => s.status === "RUNNING").length;
  const stopped = sessions.filter((s) => s.status === "STOPPED").length;
  const failed = sessions.filter((s) => s.status === "FAILED" || s.status === "INTERRUPTED").length;

  async function load() {
    if (!profile?.company_id) return;
    setLoading(true);

    let q = supabase
      .from("camera_analysis_sessions")
      .select(
        `session_id, started_at, stopped_at, status, stop_reason, model_version,
         profiles!camera_analysis_sessions_employee_profile_id_fkey(first_name, last_name, username)`
      )
      .eq("company_id", profile.company_id)
      .order("started_at", { ascending: false })
      .limit(200);

    // ASSIGNED_ONLY: only see sessions for assigned employees
    if (profile.role === "MANAGER") {
      const { data: mp } = await supabase
        .from("manager_profiles")
        .select("access_scope")
        .eq("profile_id", profile.profile_id)
        .single();

      if (mp?.access_scope === "ASSIGNED_ONLY") {
        const { data: assignments } = await supabase
          .from("manager_employee_assignments")
          .select("employee_profile_id")
          .eq("manager_profile_id", profile.profile_id);
        const ids = (assignments ?? []).map((a) => a.employee_profile_id);
        if (ids.length === 0) { setSessions([]); setLoading(false); return; }
        q = q.in("employee_profile_id", ids);
      }
    }

    const { data, error } = await q;
    if (error) { toast.error("Failed to load sessions."); setLoading(false); return; }

    setSessions(
      (data ?? []).map((r: any) => ({
        session_id: r.session_id,
        started_at: r.started_at,
        stopped_at: r.stopped_at,
        status: r.status,
        stop_reason: r.stop_reason,
        model_version: r.model_version,
        employee_name: r.profiles
          ? `${r.profiles.first_name} ${r.profiles.last_name}`
          : "Unknown",
        username: r.profiles?.username ?? "—",
      }))
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  // Real-time: refresh when any session in this company changes
  useEffect(() => {
    if (!profile?.company_id) return;
    const channel = supabase
      .channel("admin-camera-sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "camera_analysis_sessions",
          filter: `company_id=eq.${profile.company_id}`,
        },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.company_id]);

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.employee_name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q);
    const matchFilter = filter === "ALL" || s.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <AppShell>
      <TopBar title="Camera Analysis" subtitle="Live and historical session feed" showBell />
      <div className="px-5 pt-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Safety &amp; Monitoring</p>
          <button
            onClick={load}
            className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-ink" />
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <StatCard label="Live" value={running} color="text-green-600" />
          <StatCard label="Stopped" value={stopped} color="text-ink-soft" />
          <StatCard label="Failed" value={failed} color="text-red-600" />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3 mt-4">
          <Search className="h-4 w-4 text-ink-soft shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name or username…"
            className="bg-transparent flex-1 outline-none text-ink text-[13px] placeholder:text-ink-soft"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {(["ALL", "RUNNING", "STOPPED", "FAILED", "INTERRUPTED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-xl text-[11px] font-extrabold tracking-wider uppercase transition ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-ink-soft"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sessions list */}
        {loading ? (
          <p className="text-center text-[13px] text-ink-soft py-16">Loading sessions…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="h-10 w-10 text-ink-soft mx-auto mb-3" />
            <p className="text-[14px] font-bold text-ink">No sessions found</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((s) => (
              <div key={s.session_id} className="bg-surface rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-extrabold text-ink truncate">
                      {s.employee_name}
                    </p>
                    <p className="text-[12px] text-ink-soft">@{s.username}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                      STATUS_STYLE[s.status]
                    }`}
                  >
                    {s.status === "RUNNING" ? "● LIVE" : s.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <span className="text-ink-soft font-bold">Started</span>
                    <p className="text-ink font-extrabold">{formatTime(s.started_at)}</p>
                  </div>
                  <div>
                    <span className="text-ink-soft font-bold">
                      {s.stopped_at ? "Stopped" : "Duration"}
                    </span>
                    <p className="text-ink font-extrabold">
                      {s.stopped_at
                        ? formatTime(s.stopped_at)
                        : formatDuration(s.started_at, null)}
                    </p>
                  </div>
                  <div>
                    <span className="text-ink-soft font-bold">Duration</span>
                    <p className="text-ink font-extrabold">
                      {formatDuration(s.started_at, s.stopped_at)}
                    </p>
                  </div>
                  {s.stop_reason && (
                    <div>
                      <span className="text-ink-soft font-bold">Stop Reason</span>
                      <p className="text-ink font-extrabold truncate">{s.stop_reason}</p>
                    </div>
                  )}
                </div>

                {s.model_version && (
                  <p className="mt-2 text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                    {s.model_version}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm text-center">
      <p className={`text-[28px] font-extrabold leading-none ${color}`}>{value}</p>
      <p className="text-[11px] font-bold text-ink-soft mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
