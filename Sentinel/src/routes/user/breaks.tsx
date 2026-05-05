import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import {
  Coffee, Zap, Utensils, Send, CheckCircle2, Loader2,
  Clock, ArrowLeft, Timer, XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/user/breaks")({
  component: Breaks,
});

type BreakType = "rest" | "fatigue" | "meal";
type BreakStatus = "requested" | "active" | "completed" | "cancelled";

interface BreakRequest {
  id: string;
  type: BreakType;
  duration_minutes: number;
  fatigue_score: number | null;
  status: BreakStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

const BREAK_TYPES: { id: BreakType; label: string; desc: string; Icon: React.ElementType }[] = [
  { id: "rest",    label: "Rest",    desc: "General recovery",       Icon: Coffee },
  { id: "fatigue", label: "Fatigue", desc: "AI-triggered rest",      Icon: Zap },
  { id: "meal",    label: "Meal",    desc: "Scheduled meal break",   Icon: Utensils },
];

const DURATIONS = [10, 15, 20, 30];

function statusStyle(s: BreakStatus) {
  if (s === "completed") return { bg: "bg-success-soft", icon: <CheckCircle2 className="h-4 w-4 text-success" />, text: "text-success", label: "COMPLETED" };
  if (s === "active")    return { bg: "bg-gold-soft",    icon: <Timer className="h-4 w-4 text-gold-foreground" />,    text: "text-gold-foreground", label: "ACTIVE" };
  if (s === "cancelled") return { bg: "bg-danger-soft",  icon: <XCircle className="h-4 w-4 text-danger" />,  text: "text-danger", label: "CANCELLED" };
  return { bg: "bg-secondary", icon: <Clock className="h-4 w-4 text-muted-foreground" />, text: "text-muted-foreground", label: "REQUESTED" };
}

function Breaks() {
  const { user } = useAuth();
  const [type, setType] = useState<BreakType>("rest");
  const [duration, setDuration] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<BreakRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function loadHistory() {
    if (!user) return;
    const { data, error } = await supabase
      .from("break_requests")
      .select("id, type, duration_minutes, fatigue_score, status, started_at, ended_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setHistory(data as BreakRequest[]);
    setHistoryLoading(false);
  }

  useEffect(() => { loadHistory(); }, [user]);

  async function handleSubmit() {
    if (!user) { toast.error("Not signed in"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("break_requests").insert({
      user_id: user.id,
      type,
      duration_minutes: duration,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit: " + error.message);
    } else {
      toast.success(`${duration}-min ${type} break requested`);
      loadHistory();
    }
  }

  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery={null} title="Break Requests" />
      <main className="flex-1 px-8 py-6 space-y-5 max-w-4xl">

        {/* Back + title */}
        <div className="flex items-center gap-3 pt-1">
          <Link to="/user/alerts" className="h-9 w-9 flex items-center justify-center rounded-xl bg-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold leading-tight">Request a Break</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Short fatigue recovery during your shift</p>
          </div>
        </div>

        {/* Form */}
        <div className="panel p-5 space-y-5">

          {/* Break type */}
          <div>
            <div className="label-eyebrow">Break Type</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {BREAK_TYPES.map(({ id, label, desc, Icon }) => {
                const active = type === id;
                return (
                  <button
                    key={id}
                    onClick={() => setType(id)}
                    className={`flex flex-col items-center gap-2 rounded-xl py-4 border-2 transition text-center ${
                      active ? "border-navy bg-card" : "border-transparent bg-secondary"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-navy" />
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <div className="label-eyebrow">Duration</div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-xl py-3 text-sm font-bold transition border-2 ${
                    duration === d ? "border-navy bg-card" : "border-transparent bg-secondary"
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-navy py-4 flex items-center justify-center gap-2 text-navy-foreground font-display font-bold disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Submitting…" : `Request ${duration}-Min Break`}
        </button>

        {/* Need longer absence? */}
        <div className="panel px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Need longer time off?</div>
            <div className="text-xs text-muted-foreground">Submit a formal leave request</div>
          </div>
          <Link
            to="/user/leave"
            className="rounded-xl bg-gold-soft px-4 py-2 text-xs font-bold text-gold-foreground"
          >
            Apply Leave
          </Link>
        </div>

        {/* History */}
        <h3 className="text-xl font-display font-bold pt-2">Break History</h3>
        {historyLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="panel p-4 text-sm text-muted-foreground">No break requests yet.</div>
        ) : (
          history.map((req) => {
            const s = statusStyle(req.status);
            const date = new Date(req.created_at).toLocaleDateString("en-ZA", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            });
            return (
              <div key={req.id} className="panel p-3 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full ${s.bg} flex items-center justify-center`}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm capitalize">{req.type} Break</div>
                  <div className="text-xs text-muted-foreground">{date} • {req.duration_minutes}m</div>
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
