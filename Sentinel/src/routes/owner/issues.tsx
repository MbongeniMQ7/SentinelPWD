import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { BugPriority, BugStatus } from "@/lib/database.types";

interface BugReport {
  bug_id: string;
  title: string;
  description: string;
  bug_status: BugStatus;
  priority: BugPriority;
  created_at: string;
  companies: { company_name: string } | null;
  profiles: { username: string; first_name: string; last_name: string } | null;
}

interface BugCounts {
  high: number;
  standard: number;
  resolved24h: number;
}

const pillClass = (p: BugPriority) =>
  p === "HIGH" || p === "URGENT"
    ? "bg-destructive-soft text-destructive"
    : p === "NORMAL"
    ? "bg-gold text-gold-foreground"
    : "bg-secondary text-primary/70";

const fmtTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const Issues = () => {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [counts, setCounts] = useState<BugCounts>({ high: 0, standard: 0, resolved24h: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const ago24h = new Date(Date.now() - 86400000).toISOString();

      const [
        { count: high },
        { count: standard },
        { count: resolved24h },
        { data: bugList },
      ] = await Promise.all([
        supabase
          .from("bug_reports")
          .select("*", { count: "exact", head: true })
          .in("priority", ["HIGH", "URGENT"])
          .in("bug_status", ["OPEN", "IN_PROGRESS"]),
        supabase
          .from("bug_reports")
          .select("*", { count: "exact", head: true })
          .in("priority", ["LOW", "NORMAL"])
          .in("bug_status", ["OPEN", "IN_PROGRESS"]),
        supabase
          .from("bug_reports")
          .select("*", { count: "exact", head: true })
          .in("bug_status", ["RESOLVED", "CLOSED"])
          .gte("updated_at", ago24h),
        supabase
          .from("bug_reports")
          .select("bug_id, title, description, bug_status, priority, created_at, companies(company_name), profiles!reported_by_profile_id(username, first_name, last_name)")
          .in("bug_status", ["OPEN", "IN_PROGRESS"])
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      setCounts({ high: high ?? 0, standard: standard ?? 0, resolved24h: resolved24h ?? 0 });
      setBugs((bugList as unknown as BugReport[]) ?? []);
    }
    load()
      .catch(() => toast.error("Failed to load bug reports"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bugs.filter((b) => {
    const q = search.toLowerCase();
    const company = b.companies?.company_name ?? "";
    const reporter = b.profiles ? `${b.profiles.first_name} ${b.profiles.last_name}` : "";
    return !q || b.title.toLowerCase().includes(q) || company.toLowerCase().includes(q) || reporter.toLowerCase().includes(q);
  });

  async function handleResolve(bugId: string) {
    const { error } = await supabase
      .from("bug_reports")
      .update({ bug_status: "RESOLVED", resolved_at: new Date().toISOString() })
      .eq("bug_id", bugId);
    if (error) {
      toast.error("Failed to resolve bug report");
    } else {
      toast.success("Bug report marked as resolved");
      setBugs((prev) => prev.filter((b) => b.bug_id !== bugId));
      setCounts((c) => ({ ...c, high: Math.max(0, c.high - 1), resolved24h: c.resolved24h + 1 }));
    }
  }

  return (
    <AppShell>
      <TopBar title="System Issues" showBell />
      <div className="px-5 pt-3 pb-6 space-y-4">
        <div className="rounded-2xl p-5 bg-slate-400/40 relative overflow-hidden">
          <AlertTriangle className="absolute -right-4 -top-2 h-32 w-32 text-white/10" strokeWidth={1.5} />
          <div className="label-eyebrow text-white/70">CRITICAL OPEN</div>
          <div className="font-display font-bold text-white text-[44px] leading-none mt-1">
            {loading ? "—" : counts.high}
          </div>
          <div className="text-destructive font-bold mt-1">High &amp; Urgent priority</div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card border-l-4 border-gold">
          <div className="label-eyebrow">STANDARD PENDING</div>
          <div className="font-display font-bold text-primary text-[44px] leading-none mt-1">
            {loading ? "—" : counts.standard}
          </div>
          <div className="text-muted-foreground text-sm mt-1">Awaiting triage</div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card">
          <div className="label-eyebrow">RESOLVED (24H)</div>
          <div className="font-display font-bold text-primary text-[44px] leading-none mt-1">
            {loading ? "—" : counts.resolved24h}
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-4 shadow-card space-y-3">
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              placeholder="Filter by company, reporter, or title..."
              className="bg-transparent flex-1 outline-none text-sm text-primary placeholder:text-muted-foreground/70"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="label-eyebrow text-foreground/70">ACTIVE MONITORING FEED</div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading bug reports…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No open bug reports found.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((bug) => (
              <div key={bug.bug_id} className="bg-card text-card-foreground rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <span className={`pill ${pillClass(bug.priority)}`}>{bug.priority} PRIORITY</span>
                  <span className="text-xs text-muted-foreground font-semibold">{bug.bug_status}</span>
                </div>
                <h3 className="font-display font-bold text-primary text-lg mt-3 leading-tight">{bug.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bug.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {bug.companies?.company_name && <span>📋 {bug.companies.company_name}</span>}
                  {bug.profiles && (
                    <span>👤 {bug.profiles.first_name} {bug.profiles.last_name}</span>
                  )}
                  <span>🕐 {fmtTime(bug.created_at)}</span>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleResolve(bug.bug_id)}
                    className="bg-primary text-white font-bold tracking-wider text-xs px-5 py-3 rounded-lg"
                  >
                    RESOLVE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-foreground/50 pt-6">© 2026 SentinelAI Internal Operations System</div>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/issues")({ component: Issues });
