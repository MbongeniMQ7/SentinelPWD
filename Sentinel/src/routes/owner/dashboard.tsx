import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Building2, ShieldCheck, Banknote, Users } from "lucide-react";

const Dashboard = () => {
  const [usageRange, setUsageRange] = useState<"DAY" | "WEEK">("DAY");
  const stats = [
    { Icon: Building2, value: "42", label: "TOTAL COMPANIES", badge: "+4 THIS MONTH", badgeStyle: "bg-gold text-gold-foreground" },
    { Icon: ShieldCheck, value: "38", label: "ACTIVE SUBS", badge: "91% RATE", badgeStyle: "bg-gold text-gold-foreground" },
    { Icon: Banknote, value: "R125,400", label: "", badge: "TARGET: 105%", badgeStyle: "bg-[#5a4a1a] text-gold" },
    { Icon: Users, value: "1,250", label: "TOTAL USERS", badge: "LIVE NOW: 142", badgeStyle: "bg-secondary text-primary" },
  ];

  return (
    <AppShell>
      <TopBar showSettings />
      <div className="px-5 pt-2 pb-6">
        <h2 className="font-display text-[34px] leading-tight font-bold">Systems Overview</h2>
        <p className="text-foreground/70 mt-2 text-[15px]">Real-time performance metrics for the SentinelAI ecosystem.</p>

        <div className="space-y-4 mt-6">
          {stats.map(({ Icon, value, label, badge, badgeStyle }, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-primary/70">
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`pill ${badgeStyle}`}>{badge}</span>
              </div>
              <div className="mt-4 font-display font-bold text-primary text-[40px] leading-none">{value}</div>
              {label && <div className="label-eyebrow mt-2">{label}</div>}
            </div>
          ))}

          {/* Monitoring Mode */}
          <div className="stat-card">
            <h3 className="font-display font-bold text-primary text-xl">Monitoring Mode</h3>
            <div className="relative h-56 mt-4 flex items-center justify-center">
              <div className="absolute h-44 w-44 rotate-45 border-2 border-secondary rounded-2xl" />
              <div className="absolute h-44 w-44 rotate-45 border-[6px] border-primary rounded-2xl" />
              <div className="absolute h-44 w-2 bg-gradient-gold rounded-full rotate-[20deg] origin-center" />
              <div className="text-center">
                <div className="font-display font-bold text-primary text-3xl">62%</div>
                <div className="label-eyebrow text-primary/60">BIOMETRIC</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-around text-sm">
              <span className="flex items-center gap-2 text-primary"><span className="h-2 w-2 rounded-full bg-primary" />Biometric Flow</span>
              <span className="flex items-center gap-2 text-primary"><span className="h-2 w-2 rounded-full bg-gold" />IoT Telemetry</span>
            </div>
          </div>

          {/* Recent Usage */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-primary text-xl">Recent System Usage</h3>
              <div className="bg-secondary rounded-full p-1 flex">
                {(["DAY", "WEEK"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUsageRange(r)}
                    className={`text-xs font-bold px-4 py-1 rounded-full transition ${
                      usageRange === r ? "bg-white shadow text-primary" : "text-primary/60"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 h-40 flex items-end gap-2">
              {[55, 70, 95, 65, 0, 60, 78].map((h, i) => (
                <div key={i} className={`flex-1 rounded-t-md ${h ? "bg-secondary" : ""}`} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="grid grid-cols-7 mt-2 text-[10px] font-bold text-primary/60 tracking-wider text-center">
              {["MON","TUE","WED","THU","","SAT","SUN"].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-[11px] font-bold tracking-wider text-primary/70">
              <span>AVG<br />LATENCY</span><span>PEAK LOAD</span><span>API<br />REQUESTS</span>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => toast("Add new metric — coming soon")}
                className="mt-3 h-9 w-9 rounded-tl-xl bg-primary text-white flex items-center justify-center text-xl"
                aria-label="Add"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};


export const Route = createFileRoute("/owner/dashboard")({ component: Dashboard });
