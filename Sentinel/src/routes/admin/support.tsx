import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { Bug, Loader2, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { BugPriority, BugStatus } from "@/lib/database.types";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "Bug Report — SentinelAI Admin" },
      { name: "description", content: "Comprehensive audit of technical tickets and system anomalies requiring administrative resolution." },
    ],
  }),
  component: SupportPage,
});

interface BugRow {
  bug_id: string;
  title: string;
  description: string;
  bug_status: BugStatus;
  priority: BugPriority;
  created_at: string;
}

const PRIORITY_STYLE: Record<BugPriority, string> = {
  LOW: "bg-muted text-ink-soft",
  NORMAL: "bg-primary/10 text-primary",
  HIGH: "bg-warning/20 text-warning-foreground",
  URGENT: "bg-red-100 text-red-700",
};

const STATUS_STYLE: Record<BugStatus, string> = {
  OPEN: "text-red-600",
  IN_PROGRESS: "text-warning-foreground",
  RESOLVED: "text-green-600",
  CLOSED: "text-ink-soft",
};

function SupportPage() {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<BugPriority>("NORMAL");
  const [loading, setLoading] = useState(false);
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [bugsLoading, setBugsLoading] = useState(true);

  async function loadBugs() {
    if (!profile?.profile_id) return;
    const { data } = await supabase
      .from("bug_reports")
      .select("bug_id, title, description, bug_status, priority, created_at")
      .eq("reported_by_profile_id", profile.profile_id)
      .order("created_at", { ascending: false })
      .limit(50);
    setBugs((data as BugRow[]) ?? []);
    setBugsLoading(false);
  }

  useEffect(() => { loadBugs(); }, [profile]);

  const submit = async () => {
    if (!title.trim()) { toast.error("Title is required."); return; }
    if (!description.trim()) { toast.error("Description is required."); return; }
    if (!profile?.profile_id) { toast.error("Not authenticated."); return; }

    setLoading(true);
    const { error } = await supabase.from("bug_reports").insert({
      reported_by_profile_id: profile.profile_id,
      company_id: profile.company_id ?? null,
      title: title.trim(),
      description: description.trim(),
      priority,
      bug_status: "OPEN",
    });
    setLoading(false);

    if (error) { toast.error("Failed to submit: " + error.message); return; }

    toast.success("Bug report submitted to SentinelAI.");
    setTitle("");
    setDescription("");
    setPriority("NORMAL");
    loadBugs();
  };

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4 pb-24">
        <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
          Support
        </p>
        <h1 className="mt-1 text-[34px] leading-[1.05] font-extrabold text-ink">Bug Report</h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          Report an issue to the SentinelAI team. We'll respond as soon as possible.
        </p>

        {/* Submit Form */}
        <div className="mt-5 bg-surface rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <label className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase block mb-2">
              TITLE
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={200}
              className="w-full h-12 px-3 rounded-xl bg-muted text-[13px] text-ink placeholder:text-ink-soft outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase block mb-2">
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, what you expected, and steps to reproduce…"
              rows={5}
              className="w-full px-3 py-3 rounded-xl bg-muted text-[13px] text-ink placeholder:text-ink-soft outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase block mb-2">
              PRIORITY
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["LOW", "NORMAL", "HIGH", "URGENT"] as BugPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2.5 rounded-xl border-2 text-[11px] font-extrabold tracking-wider uppercase text-center transition ${
                    priority === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-ink-soft"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-extrabold tracking-wider text-[13px] uppercase rounded-xl flex items-center justify-center gap-2 py-4 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Submitting…" : "Submit Report"}
          </button>
        </div>

        {/* Previous reports */}
        <div className="mt-6">
          <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase mb-3">
            YOUR PREVIOUS REPORTS
          </p>
          {bugsLoading ? (
            <p className="text-[13px] text-ink-soft text-center py-8">Loading…</p>
          ) : bugs.length === 0 ? (
            <div className="text-center py-10">
              <Bug className="h-9 w-9 text-ink-soft mx-auto mb-2" />
              <p className="text-[13px] font-bold text-ink">No reports yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bugs.map((b) => (
                <div key={b.bug_id} className="bg-surface rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-extrabold text-ink flex-1 min-w-0 truncate">{b.title}</p>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                        PRIORITY_STYLE[b.priority]
                      }`}
                    >
                      {b.priority}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-soft mt-1 line-clamp-2">{b.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span
                      className={`text-[12px] font-extrabold tracking-wider uppercase ${STATUS_STYLE[b.bug_status]}`}
                    >
                      {b.bug_status.replace("_", " ")}
                    </span>
                    <span className="text-[11px] text-ink-soft">
                      {new Date(b.created_at).toLocaleDateString("en-ZA")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
