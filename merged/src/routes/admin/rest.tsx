import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { StatusBadge } from "@/components/admin/sentinel/StatusBadge";
import { Brain, Calendar, Clock, Filter, Search, ArrowRight, User } from "lucide-react";

export const Route = createFileRoute("/admin/rest")({
  head: () => ({
    meta: [
      { title: "Leave & Rest Requests — SentinelAI Admin" },
      { name: "description", content: "Personnel fatigue management with predictive insights and approval queue." },
    ],
  }),
  component: RestPage,
});

function RestPage() {
  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-warning-foreground/70 uppercase">Personnel Fatigue Management</p>
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink mt-1">Leave & Rest Requests</h1>
        <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted text-[11px] font-extrabold tracking-wider text-ink uppercase">
          <span className="h-2 w-2 rounded-full bg-warning-foreground" />
          12 Pending Approvals
        </span>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <section className="relative bg-surface rounded-2xl p-5 shadow-sm border-l-4 border-warning">
          <div className="h-9 w-9 rounded-lg bg-warning/30 flex items-center justify-center"><Brain className="h-5 w-5 text-warning-foreground" /></div>
          <p className="mt-3 text-[13px] text-ink-soft/80 leading-snug">
            Predictive analytics identified 3 team members with critical fatigue scores (&gt;85%) who have not requested rest in the last 45 days.
          </p>

          <div className="mt-5 space-y-3">
            <PredictRow initials="JD" bg="bg-critical" fatigue="92%" />
            <PredictRow initials="MR" bg="bg-yellow-700" fatigue="87%" />
          </div>

          <button
            onClick={() => toast("Opening analytics insights…")}
            className="mt-5 inline-flex items-center gap-1 text-[12px] font-extrabold tracking-wider text-warning-foreground uppercase"
          >
            View Analytics Insights <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>

        <section className="bg-surface rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Operational Status</p>
          <div className="mt-3">
            <div className="flex justify-between text-[14px] font-extrabold text-ink"><span>Workforce Availability</span><span>94.2%</span></div>
            <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-success" style={{ width: "94%" }} /></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[14px] font-extrabold text-ink"><span>Avg. Fatigue Level</span><span className="text-warning-foreground">42%</span></div>
            <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-warning" style={{ width: "42%" }} /></div>
          </div>
        </section>

        <section className="bg-surface rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-primary text-primary-foreground px-5 py-4 flex items-center justify-between">
            <h3 className="text-[18px] font-extrabold">Active Requests</h3>
            <div className="flex gap-2">
              <button onClick={() => toast("Filter requests — coming soon")} className="text-primary-foreground/80" aria-label="Filter"><Filter className="h-4 w-4" /></button>
              <button onClick={() => toast("Search requests — coming soon")} className="text-primary-foreground/80" aria-label="Search"><Search className="h-4 w-4" /></button>
            </div>
          </div>

          <ul className="divide-y divide-border">
            <RequestRow avatar={<div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center"><User className="h-5 w-5 text-ink-soft" /></div>} dateRange="Oct 12 - Oct 15" duration="3 Days · Annual Rest" />
            <RequestRow avatar={<div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground"><User className="h-5 w-5" /></div>} dateRange="Today - Oct 10" duration="2 Days · Sick Leave" urgent durationColor="text-critical" />
            <RequestRow avatar={<div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-ink-soft"><User className="h-5 w-5" /></div>} dateRange="Oct 20 - Oct 27" duration="7 Days · Comp Rest" durationColor="text-warning-foreground" />
            <RequestRow avatar={<div className="h-12 w-12 rounded-xl bg-info-soft flex items-center justify-center text-ink-soft"><User className="h-5 w-5" /></div>} dateRange="Oct 18 - Oct 19" duration="1 Day · Personal Rest" />
          </ul>

          <button
            onClick={() => toast("Loading more requests…")}
            className="w-full py-4 text-[12px] font-extrabold tracking-wider text-ink-soft uppercase"
          >
            Load 8 More Requests
          </button>
        </section>
      </div>
    </AppShell>
  );
}

function PredictRow({ initials, bg, fatigue }: { initials: string; bg: string; fatigue: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-primary-foreground text-[12px] font-extrabold ${bg}`}>{initials}</div>
      <p className="flex-1 text-[12px] text-ink-soft">Fatigue: <span className="font-bold text-ink">{fatigue}</span></p>
      <button
        onClick={() => toast.success(`Auto-granted ${initials} (${fatigue} fatigue)`)}
        className="px-4 h-9 rounded-lg bg-warning text-[10px] font-extrabold tracking-wider text-ink uppercase"
      >
        Auto-Grant
      </button>
    </div>
  );
}

function RequestRow({ avatar, dateRange, duration, urgent, durationColor }: { avatar: React.ReactNode; dateRange: string; duration: string; urgent?: boolean; durationColor?: string }) {
  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        {avatar}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-ink-soft flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {dateRange}</p>
            {urgent && <StatusBadge variant="critical">Urgent</StatusBadge>}
          </div>
          <p className={`mt-1 text-[13px] font-extrabold flex items-center gap-1.5 ${durationColor || "text-warning-foreground"}`}>
            <Clock className="h-3.5 w-3.5" /> {duration}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <button
          onClick={() => toast(`Rejected: ${duration}`)}
          className="flex-1 h-11 rounded-xl bg-muted text-[12px] font-extrabold tracking-wider text-ink uppercase"
        >
          Reject
        </button>
        <button
          onClick={() => toast.success(`Approved: ${duration}`)}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold tracking-wider uppercase"
        >
          Approve
        </button>
      </div>
    </li>
  );
}
