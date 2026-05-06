import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Users, Plus, ChevronDown, ChevronRight, ShieldCheck, Globe, Lock } from "lucide-react";
import type { ManagerLevel, AccessScope } from "@/lib/database.types";

export const Route = createFileRoute("/admin/hierarchy")({
  component: HierarchyPage,
});

interface ManagerRow {
  profile_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: string;
  manager_level: ManagerLevel;
  access_scope: AccessScope;
  reports_to_manager_id: string | null;
  can_create_managers: boolean;
  can_create_employees: boolean;
  assigned_count?: number;
}

const LEVEL_COLOR: Record<ManagerLevel, string> = {
  SENIOR_MANAGER: "bg-warning/20 text-warning-foreground",
  MANAGER: "bg-primary/10 text-primary",
  JUNIOR_MANAGER: "bg-muted text-ink-soft",
};
const LEVEL_LABEL: Record<ManagerLevel, string> = {
  SENIOR_MANAGER: "Senior",
  MANAGER: "Manager",
  JUNIOR_MANAGER: "Junior",
};

function HierarchyPage() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile?.company_id) return;

    async function load() {
      const { data, error } = await supabase
        .from("manager_profiles")
        .select(
          `manager_level, access_scope, reports_to_manager_id, can_create_managers, can_create_employees,
           profiles!manager_profiles_profile_id_fkey(profile_id, username, first_name, last_name, email, status)`
        )
        .eq("profiles.company_id", profile!.company_id);

      if (error) { toast.error("Failed to load managers."); return; }

      const rows: ManagerRow[] = (data ?? [])
        .filter((r) => r.profiles)
        .map((r) => ({
          profile_id: (r.profiles as any).profile_id,
          username: (r.profiles as any).username,
          first_name: (r.profiles as any).first_name,
          last_name: (r.profiles as any).last_name,
          email: (r.profiles as any).email,
          status: (r.profiles as any).status,
          manager_level: r.manager_level,
          access_scope: r.access_scope,
          reports_to_manager_id: r.reports_to_manager_id,
          can_create_managers: r.can_create_managers,
          can_create_employees: r.can_create_employees,
        }));

      // Fetch assignment counts for ASSIGNED_ONLY managers
      for (const mgr of rows) {
        if (mgr.access_scope === "ASSIGNED_ONLY") {
          const { count } = await supabase
            .from("manager_employee_assignments")
            .select("assignment_id", { count: "exact", head: true })
            .eq("manager_profile_id", mgr.profile_id);
          mgr.assigned_count = count ?? 0;
        }
      }

      setManagers(rows);
    }

    load().finally(() => setLoading(false));
  }, [profile]);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Build tree: seniors first, then managers, then juniors
  const seniors = managers.filter((m) => m.manager_level === "SENIOR_MANAGER");
  const rest = managers.filter((m) => m.manager_level !== "SENIOR_MANAGER");

  const directReports = (managerId: string) =>
    rest.filter((m) => m.reports_to_manager_id === managerId);

  const unattached = rest.filter(
    (m) =>
      !m.reports_to_manager_id ||
      !managers.find((s) => s.profile_id === m.reports_to_manager_id)
  );

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4 pb-24">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
              Management
            </p>
            <h1 className="mt-1 text-[34px] leading-[1.05] font-extrabold text-ink">
              Manager Hierarchy
            </h1>
            <p className="mt-2 text-[13px] text-ink-soft">
              {managers.length} manager{managers.length !== 1 ? "s" : ""} in your company
            </p>
          </div>
          <button
            onClick={() => nav({ to: "/admin/create-manager" })}
            className="mt-2 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold tracking-wider uppercase"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        {loading ? (
          <p className="text-center text-[13px] text-ink-soft py-16">Loading hierarchy…</p>
        ) : managers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-10 w-10 text-ink-soft mx-auto mb-3" />
            <p className="text-[14px] font-bold text-ink">No managers yet</p>
            <p className="text-[12px] text-ink-soft mt-1">Create the first manager for your company.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {/* Seniors + their direct reports */}
            {seniors.length > 0 && (
              <>
                <SectionHeader label="SENIOR MANAGERS" />
                {seniors.map((mgr) => {
                  const reports = directReports(mgr.profile_id);
                  const open = expanded.has(mgr.profile_id);
                  return (
                    <div key={mgr.profile_id}>
                      <ManagerCard
                        mgr={mgr}
                        reportCount={reports.length}
                        expanded={open}
                        onToggle={() => toggle(mgr.profile_id)}
                        hasChildren={reports.length > 0}
                      />
                      {open && reports.length > 0 && (
                        <div className="ml-4 mt-1 space-y-2 pl-3 border-l-2 border-border">
                          {reports.map((sub) => (
                            <ManagerCard key={sub.profile_id} mgr={sub} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Unattached managers (no senior parent found) */}
            {unattached.length > 0 && (
              <>
                <SectionHeader label="INDEPENDENT MANAGERS" />
                {unattached.map((mgr) => (
                  <ManagerCard key={mgr.profile_id} mgr={mgr} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-extrabold tracking-[0.18em] text-ink-soft uppercase mt-4 mb-1">
      {label}
    </p>
  );
}

function ManagerCard({
  mgr,
  reportCount = 0,
  expanded = false,
  onToggle,
  hasChildren = false,
}: {
  mgr: ManagerRow;
  reportCount?: number;
  expanded?: boolean;
  onToggle?: () => void;
  hasChildren?: boolean;
}) {
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold text-ink truncate">
              {mgr.first_name} {mgr.last_name}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                LEVEL_COLOR[mgr.manager_level]
              }`}
            >
              {LEVEL_LABEL[mgr.manager_level]}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                mgr.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-muted text-ink-soft"
              }`}
            >
              {mgr.status}
            </span>
          </div>
          <p className="text-[12px] text-ink-soft mt-0.5">@{mgr.username}</p>
          {mgr.email && (
            <p className="text-[12px] text-ink-soft truncate">{mgr.email}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] font-bold text-ink-soft">
              {mgr.access_scope === "COMPANY_WIDE" ? (
                <Globe className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {mgr.access_scope === "COMPANY_WIDE" ? "Company-Wide" : `Assigned Only${mgr.assigned_count !== undefined ? ` (${mgr.assigned_count})` : ""}`}
            </span>
            {mgr.can_create_employees && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> Create Employees
              </span>
            )}
            {mgr.can_create_managers && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-warning-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Create Managers
              </span>
            )}
          </div>
        </div>

        {hasChildren && onToggle && (
          <button
            onClick={onToggle}
            className="shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center"
            aria-label="Toggle reports"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-ink" />
            ) : (
              <ChevronRight className="h-4 w-4 text-ink" />
            )}
          </button>
        )}
      </div>

      {hasChildren && (
        <p className="mt-2 text-[11px] text-ink-soft font-bold">
          {reportCount} direct report{reportCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
