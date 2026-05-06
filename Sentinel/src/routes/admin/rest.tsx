import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { Calendar, Clock, Loader2, BedDouble, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/rest")({
  head: () => ({
    meta: [
      { title: "Leave & Rest Requests — SentinelAI Admin" },
      { name: "description", content: "Personnel leave and rest request management." },
    ],
  }),
  component: RestPage,
});

interface LeaveRequest {
  id: string;
  type: string;
  duration_hours: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  requester_name?: string;
}

const STATUS_STYLE = {
  pending: "bg-warning/20 text-warning-foreground",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

function RestPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    if (!profile?.company_id) return;
    setLoading(true);

    // Get all employee profile_ids for this company
    const { data: companyProfiles } = await supabase
      .from("profiles")
      .select("profile_id, first_name, last_name")
      .eq("company_id", profile.company_id)
      .eq("role", "EMPLOYEE");

    if (!companyProfiles || companyProfiles.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const profileIds = companyProfiles.map((p) => p.profile_id);
    const nameMap = Object.fromEntries(
      companyProfiles.map((p) => [p.profile_id, `${p.first_name} ${p.last_name}`])
    );

    const { data, error } = await supabase
      .from("leave_requests")
      .select("id, type, duration_hours, reason, status, created_at, user_id")
      .in("user_id", profileIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table may not be set up yet
      setRequests([]);
      setLoading(false);
      return;
    }

    setRequests(
      ((data ?? []) as (LeaveRequest & { user_id: string })[]).map((r) => ({
        ...r,
        requester_name: nameMap[r.user_id] ?? "Employee",
      }))
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  async function updateStatus(id: string, status: "approved" | "rejected") {
    setActionId(id);
    const { error } = await supabase
      .from("leave_requests")
      .update({ status, reviewed_by: profile?.profile_id ?? null })
      .eq("id", id);

    if (error) { toast.error("Failed to update request."); }
    else {
      toast.success(`Request ${status === "approved" ? "approved" : "rejected"}.`);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    }
    setActionId(null);
  }

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4 pb-24">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-warning-foreground/70 uppercase">
          Personnel Management
        </p>
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink mt-1">Leave & Rest Requests</h1>

        {pending.length > 0 && (
          <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted text-[11px] font-extrabold tracking-wider text-ink uppercase">
            <span className="h-2 w-2 rounded-full bg-warning-foreground" />
            {pending.length} Pending Approval{pending.length !== 1 ? "s" : ""}
          </span>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-ink-soft" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 mt-4">
            <BedDouble className="h-10 w-10 text-ink-soft mx-auto mb-3" />
            <p className="text-[15px] font-bold text-ink">No leave requests</p>
            <p className="text-[13px] text-ink-soft mt-1">Requests submitted by employees will appear here.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {pending.length > 0 && (
              <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">PENDING</p>
            )}
            {[...pending, ...reviewed].map((r) => (
              <div key={r.id} className="bg-surface rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-extrabold text-ink truncate">{r.requester_name}</p>
                    <p className="text-[12px] text-ink-soft mt-0.5 capitalize">{r.type.replace("_", " ")} leave</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${STATUS_STYLE[r.status]}`}>
                    {r.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-3 text-ink-soft">
                  <span className="flex items-center gap-1 text-[12px]">
                    <Clock className="h-3.5 w-3.5" /> {r.duration_hours}h
                  </span>
                  <span className="flex items-center gap-1 text-[12px]">
                    <Calendar className="h-3.5 w-3.5" /> {new Date(r.created_at).toLocaleDateString("en-ZA")}
                  </span>
                </div>

                {r.reason && (
                  <p className="mt-2 text-[12px] text-ink-soft italic line-clamp-2">"{r.reason}"</p>
                )}

                {r.status === "pending" && (
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => updateStatus(r.id, "rejected")}
                      disabled={actionId === r.id}
                      className="flex-1 h-11 rounded-xl bg-muted text-[12px] font-extrabold tracking-wider text-ink uppercase flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {actionId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Reject
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, "approved")}
                      disabled={actionId === r.id}
                      className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {actionId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
