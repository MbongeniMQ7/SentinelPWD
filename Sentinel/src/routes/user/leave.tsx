import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { AlertCircle, Clock, Moon, Stethoscope, MoreHorizontal, Send, CheckCircle2, AlertCircle as AlertDot, ChevronDown } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/user/leave")({
  component: Leave,
});

function Leave() {
  const [type, setType] = useState("rest");
  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery={null} />
      <main className="flex-1 px-5 pb-6 space-y-5">
        {/* Banner */}
        <div className="panel bg-navy text-navy-foreground p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/10" />
          <div className="flex items-center gap-2 label-eyebrow text-gold">
            <AlertCircle className="h-3.5 w-3.5" /> Safety Alert
          </div>
          <h2 className="mt-3 text-2xl font-display font-bold leading-tight">
            High Fatigue Detected - You should rest for 30 minutes
          </h2>
          <div className="mt-3 flex items-center gap-1.5 text-xs opacity-80">
            <Clock className="h-3.5 w-3.5" /> AI Analysis based on biometric wristband telemetry
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-display font-bold">Apply for Leave</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit a formal request for recovery time.
          </p>
        </div>

        <div className="panel p-5 space-y-5">
          <div>
            <div className="label-eyebrow">Leave Type</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { id: "rest", label: "Rest", Icon: Moon },
                { id: "sick", label: "Sick", Icon: Stethoscope },
                { id: "other", label: "Other", Icon: MoreHorizontal },
              ].map(({ id, label, Icon }) => {
                const active = type === id;
                return (
                  <button
                    key={id}
                    onClick={() => setType(id)}
                    className={`flex flex-col items-center gap-2 rounded-xl py-4 border-2 transition ${
                      active ? "border-navy bg-card" : "border-transparent bg-secondary"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-navy" />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="label-eyebrow">Duration &amp; Reason</div>
            <button className="mt-3 w-full flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm">
              30 Minutes (Recommended)
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            <textarea
              rows={3}
              placeholder="Brief explanation for the request..."
              className="mt-3 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none"
            />
          </div>
        </div>

        <button className="w-full rounded-2xl bg-gold-soft hover:bg-gold/80 py-4 flex items-center justify-center gap-2 text-gold-foreground font-display font-bold">
          Submit Rest Request <Send className="h-4 w-4" />
        </button>

        <h3 className="text-xl font-display font-bold pt-2">Recent Activity</h3>

        <div className="panel p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-success-soft flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Emergency Rest</div>
            <div className="text-xs text-muted-foreground">Yesterday, 14:20 • 45m</div>
          </div>
          <span className="text-[10px] font-bold text-success tracking-wider">APPROVED</span>
        </div>

        <div className="panel p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-warning-soft flex items-center justify-center">
            <AlertDot className="h-4 w-4 text-warning" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Scheduled Break</div>
            <div className="text-xs text-muted-foreground">Today, 09:00 • 15m</div>
          </div>
          <span className="text-[10px] font-bold text-warning tracking-wider">PENDING</span>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
