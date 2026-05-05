import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import {
  Clock, Moon, Stethoscope, MoreHorizontal, Send,
  CheckCircle2, XCircle, Loader2, ChevronDown, CalendarDays, ArrowLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/user/leave")({
  component: Leave,
});

type LeaveType = "sick" | "annual" | "emergency" | "other";
type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveRequest {
  id: string;
  type: LeaveType;
  duration_hours: number;
  reason: string | null;
  status: LeaveStatus;
  created_at: string;
}

const LEAVE_TYPES: { id: LeaveType; label: string; Icon: React.ElementType }[] = [
  { id: "sick",      label: "Sick",      Icon: Stethoscope },
  { id: "annual",    label: "Annual",    Icon: CalendarDays },
  { id: "emergency", label: "Emergency", Icon: Moon },
  { id: "other",     label: "Other",     Icon: MoreHorizontal },
];

const DURATIONS = [
  { value: 0.5, label: "30 Minutes" },
  { value: 1,   label: "1 Hour" },
  { value: 2,   label: "2 Hours" },
  { value: 4,   label: "Half Day (4h)" },
  { value: 8,   label: "Full Day (8h)" },
];

function statusStyle(s: LeaveStatus) {
  if (s === "approved") return { dot: "bg-success", text: "text-success", label: "APPROVED" };
  if (s === "rejected") return { dot: "bg-danger", text: "text-danger", label: "REJECTED" };
  return { dot: "bg-gold", text: "text-gold-foreground", label: "PENDING" };
}

function Leave() {
  const { user } = useAuth();
  const [type, setType] = useState<LeaveType>("sick");
  const [duration, setDuration] = useState(1);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDurations, setShowDurations] = useState(false);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function loadHistory() {
    if (!user) return;
    const { data, error } = await supabase
      .from("leave_requests")
      .select("id, type, duration_hours, reason, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setHistory(data as LeaveRequest[]);
    setHistoryLoading(false);
  }

  useEffect(() => { loadHistory(); }, [user]);

  async function handleSubmit() {
    if (!user) { toast.error("Not signed in"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("leave_requests").insert({
      user_id: user.id,
      type,
      duration_hours: duration,
      reason: reason.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit: " + error.message);
    } else {
      toast.success("Leave request submitted");
      setReason("");
      loadHistory();
    }
  }

  const selectedDuration = DURATIONS.find((d) => d.value === duration) ?? DURATIONS[1];

  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery={null} />
      <main className="flex-1 px-5 pb-6 space-y-5">

        {/* Back + title */}
        <div className="flex items-center gap-3 pt-1">
          <Link to="/user/alerts" className="h-9 w-9 flex items-center justify-center rounded-xl bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold leading-tight">Apply for Leave</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Submit a formal absence request</p>
          </div>
        </div>

        {/* Form */}
        <div className="panel p-5 space-y-5">
          {/* Leave type */}
          <div>
            <div className="label-eyebrow">Leave Type</div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {LEAVE_TYPES.map(({ id, label, Icon }) => {
                const active = type === id;
                return (
                  <button
                    key={id}
                    onClick={() => setType(id)}
                    className={`flex flex-col items-center gap-2 rounded-xl py-3.5 border-2 transition ${
                      active ? "border-navy bg-card" : "border-transparent bg-secondary"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-navy" />
                    <span className="text-[11px] font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration picker */}
          <div>
            <div className="label-eyebrow">Duration</div>
            <button
              onClick={() => setShowDurations((v) => !v)}
              className="mt-3 w-full flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm font-semibold"
            >
              {selectedDuration.label}
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showDurations ? "rotate-180" : ""}`} />
            </button>
            {showDurations && (
              <div className="mt-1 rounded-xl border border-border bg-card overflow-hidden">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => { setDuration(d.value); setShowDurations(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition ${
                      duration === d.value ? "bg-secondary font-bold" : "hover:bg-secondary/50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <div className="label-eyebrow">Reason (optional)</div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief explanation for the request..."
              className="mt-3 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-gold-soft hover:bg-gold/80 py-4 flex items-center justify-center gap-2 text-gold-foreground font-display font-bold disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Submitting…" : "Submit Leave Request"}
        </button>

        {/* Also need a break? */}
        <div className="panel px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Need a short break instead?</div>
            <div className="text-xs text-muted-foreground">Request 10–30 min fatigue recovery</div>
          </div>
          <Link
            to="/user/breaks"
            className="rounded-xl bg-navy px-4 py-2 text-xs font-bold text-navy-foreground"
          >
            Breaks
          </Link>
        </div>

        {/* History */}
        <h3 className="text-xl font-display font-bold pt-2">Leave History</h3>
        {historyLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="panel p-4 text-sm text-muted-foreground">No leave requests yet.</div>
        ) : (
          history.map((req) => {
            const s = statusStyle(req.status);
            const dur = DURATIONS.find((d) => d.value === req.duration_hours)?.label
              ?? `${req.duration_hours}h`;
            const date = new Date(req.created_at).toLocaleDateString("en-ZA", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            });
            return (
              <div key={req.id} className="panel p-3 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                  req.status === "approved" ? "bg-success-soft" :
                  req.status === "rejected" ? "bg-danger-soft" : "bg-gold-soft"
                }`}>
                  {req.status === "approved"
                    ? <CheckCircle2 className="h-4 w-4 text-success" />
                    : req.status === "rejected"
                    ? <XCircle className="h-4 w-4 text-danger" />
                    : <Clock className="h-4 w-4 text-gold-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm capitalize">{req.type} Leave</div>
                  <div className="text-xs text-muted-foreground">{date} • {dur}</div>
                </div>
                <span className={`text-[10px] font-bold tracking-wider ${s.text}`}>
                  {s.label}
                </span>
              </div>
            );
          })
        )}
      </main>
      <BottomNav />
    </div>
  );
}

