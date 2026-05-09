import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/user/BrandLogo";
import { AvatarBadge } from "@/components/user/AvatarBadge";
import { HelpCircle, Paperclip, Headphones, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/user/support")({
  component: Support,
});

function Support() {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  type BugRow = {
    bug_id: string;
    title: string;
    description: string;
    bug_status: string;
    priority: string;
    created_at: string;
  };
  const [reports, setReports] = useState<BugRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.profile_id) return;
    setReportsLoading(true);
    supabase
      .from("bug_reports")
      .select("bug_id, title, description, bug_status, priority, created_at")
      .eq("reported_by_profile_id", profile.profile_id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setReports((data as BugRow[]) ?? []);
        setReportsLoading(false);
      });
  }, [profile?.profile_id]);

  async function handleSubmitBug(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title for your bug report.");
      return;
    }
    if (!profile?.profile_id) {
      toast.error("You must be signed in to submit a report.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("bug_reports").insert({
      reported_by_profile_id: profile.profile_id,
      company_id: profile.company_id ?? null,
      title: title.trim(),
      description: description.trim() || "No description provided.",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit report", { description: error.message });
      return;
    }
    setTitle("");
    setDescription("");
    toast.success("Bug report submitted", {
      description: "Our team will review your report shortly. Thank you!",
    });
    // Refresh list
    supabase
      .from("bug_reports")
      .select("bug_id, title, description, bug_status, priority, created_at")
      .eq("reported_by_profile_id", profile.profile_id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setReports((data as BugRow[]) ?? []));
  }

  return (
    <div className="app-shell px-5 py-5 pb-10">
      <header className="flex items-center justify-between mb-6">
        <BrandLogo />
        <AvatarBadge />
      </header>

      <h1 className="text-4xl font-display font-bold leading-tight">
        Vigilant Support<br /><span className="text-muted-foreground">at Your Service.</span>
      </h1>

      {/* Submit issue */}
      <form onSubmit={handleSubmitBug} noValidate>
        <div className="panel p-5 mt-6">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-navy flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">Report a Bug</h2>
              <p className="text-sm text-muted-foreground">
                Detailed reports help us resolve technical hurdles faster.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="label-eyebrow">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              className="mt-2 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-4">
            <div className="label-eyebrow">Description</div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the steps to reproduce or the nature of the error..."
              className="mt-2 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none"
            />
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5 mt-0.5" />
              <span>Attach screenshot<br />(optional)</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-navy text-navy-foreground font-bold px-6 py-3 text-sm leading-tight disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send<br />Report
            </button>
          </div>
        </div>
      </form>

      {/* Direct line */}
      <div className="panel bg-navy text-navy-foreground p-5 mt-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gold/10" />
        <Headphones className="h-7 w-7 text-gold" />
        <h3 className="mt-3 font-display text-2xl font-bold">Direct Line</h3>
        <p className="text-sm opacity-70 mt-1">Available 24/7 for critical site safety failures.</p>
        <div className="mt-3 font-display font-bold text-xl tracking-wider">+1 (800) SENTINEL</div>
      </div>

      {/* Email */}
      <div className="panel p-5 mt-5">
        <Mail className="h-6 w-6 text-navy" />
        <h3 className="mt-3 font-display text-xl font-bold">Email Support</h3>
        <p className="text-sm text-muted-foreground">Standard response time under 2 hours.</p>
        <div className="mt-3 font-bold">support@sentinelai.io</div>
      </div>

      <h3 className="mt-8 mb-4 flex items-center justify-between">
        <span className="font-display text-2xl font-bold">Recent Issues</span>
        {(() => {
          const openCount = reports.filter(r => r.bug_status === "OPEN" || r.bug_status === "IN_PROGRESS").length;
          return openCount > 0 ? (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">{openCount} Active</span>
          ) : null;
        })()}
      </h3>

      <div className="space-y-3">
        {reportsLoading ? (
          [1, 2].map(n => <div key={n} className="panel h-16 animate-pulse bg-secondary/50 rounded-2xl" />)
        ) : reports.length === 0 ? (
          <div className="panel p-4 text-sm text-muted-foreground">No reports submitted yet.</div>
        ) : (
          reports.map(r => {
            const isOpen = r.bug_status === "OPEN" || r.bug_status === "IN_PROGRESS";
            const timeAgo = (() => {
              const diff = Date.now() - new Date(r.created_at).getTime();
              const mins = Math.floor(diff / 60000);
              const hours = Math.floor(mins / 60);
              const days = Math.floor(hours / 24);
              if (days >= 1) return `${days}d ago`;
              if (hours >= 1) return `${hours}h ago`;
              return `${mins}m ago`;
            })();
            return (
              <Issue
                key={r.bug_id}
                status={r.bug_status.replace("_", " ")}
                statusBg={isOpen ? "bg-gold-soft text-gold-foreground" : "bg-secondary text-muted-foreground"}
                time={timeAgo}
                title={r.title}
                desc={r.description}
              />
            );
          })
        )}
      </div>

      <button className="mt-5 w-full rounded-2xl border-2 border-dashed border-border py-4 text-sm font-bold">
        View Archive
      </button>
    </div>
  );
}

function Issue({ status, statusBg, time, title, desc }: { status: string; statusBg: string; time: string; title: string; desc: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-widest ${statusBg}`}>{status}</span>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
      <h4 className="mt-2 font-display font-bold">{title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
