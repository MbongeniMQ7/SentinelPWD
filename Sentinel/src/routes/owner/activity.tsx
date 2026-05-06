import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Search, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ActionType =
  | "LOGIN"
  | "LOGOUT"
  | "MANAGER_CREATED"
  | "EMPLOYEE_CREATED"
  | "COMPANY_CREATED"
  | "ALERT_CREATED"
  | "REPORT_GENERATED"
  | "BUG_SUBMITTED"
  | "BUG_RESOLVED"
  | "SETTINGS_UPDATED"
  | string;

interface AuditEntry {
  log_id: string;
  action_type: ActionType;
  description: string | null;
  created_at: string;
  profile: { username: string; first_name: string; last_name: string } | null;
  company: { company_name: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  MANAGER_CREATED: "bg-blue-100 text-blue-700",
  EMPLOYEE_CREATED: "bg-blue-100 text-blue-700",
  COMPANY_CREATED: "bg-violet-100 text-violet-700",
  ALERT_CREATED: "bg-red-100 text-red-600",
  REPORT_GENERATED: "bg-yellow-100 text-yellow-700",
  BUG_SUBMITTED: "bg-orange-100 text-orange-700",
  BUG_RESOLVED: "bg-emerald-100 text-emerald-700",
  SETTINGS_UPDATED: "bg-indigo-100 text-indigo-700",
};

const PAGE_SIZE = 30;

const SystemActivity = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("audit_logs")
      .select(
        `log_id, action_type, description, created_at,
         profiles!audit_logs_profile_id_fkey(username, first_name, last_name),
         companies!audit_logs_company_id_fkey(company_name)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (filterType !== "ALL") query = query.eq("action_type", filterType);
    if (search.trim()) query = query.ilike("description", `%${search.trim()}%`);

    const { data, count } = await query;
    setTotalCount(count ?? 0);
    setLogs(
      (data ?? []).map((r: any) => ({
        ...r,
        profile: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles,
        company: Array.isArray(r.companies) ? r.companies[0] ?? null : r.companies,
      }))
    );
    setLoading(false);
  }, [page, filterType, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actionTypes = [
    "ALL", "LOGIN", "LOGOUT", "MANAGER_CREATED", "EMPLOYEE_CREATED",
    "COMPANY_CREATED", "ALERT_CREATED", "BUG_SUBMITTED", "BUG_RESOLVED",
    "REPORT_GENERATED", "SETTINGS_UPDATED",
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <AppShell>
      <TopBar title="System Activity" />
      <div className="px-4 pt-3 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[26px] font-bold leading-tight">Audit Log</h2>
            <p className="text-sm text-muted-foreground">{totalCount} events recorded</p>
          </div>
          <button
            onClick={() => { setPage(0); fetchLogs(); }}
            className="p-2 rounded-xl bg-card shadow-card text-muted-foreground hover:text-primary"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search activity descriptions…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card shadow-card text-sm text-primary placeholder:text-muted-foreground outline-none"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {actionTypes.map((t) => (
            <button
              key={t}
              onClick={() => { setFilterType(t); setPage(0); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === t ? "bg-primary text-white" : "bg-card text-muted-foreground shadow-card"
              }`}
            >
              {t === "ALL" ? "All" : t.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Log list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No activity found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const badge = ACTION_COLORS[log.action_type] ?? "bg-gray-100 text-gray-600";
              const actor = log.profile
                ? `@${log.profile.username}`
                : "System";
              return (
                <div key={log.log_id} className="bg-card rounded-xl px-4 py-3 shadow-card flex gap-3 items-start">
                  <span className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${badge}`}>
                    {log.action_type.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary leading-snug">
                      {log.description ?? "No description"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {actor}
                      {log.company && ` · ${log.company.company_name}`}
                      {" · "}
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-xl bg-card shadow-card text-sm font-semibold disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 rounded-xl bg-card shadow-card text-sm font-semibold disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/activity")({ component: SystemActivity });
