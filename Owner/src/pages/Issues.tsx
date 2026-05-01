import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Search, Calendar, AlertTriangle } from "lucide-react";

const issues = [
  { p: "HIGH", id: "#LOG-88219", title: "Wristband sync failure - Batch #401", company: "OmniHealth Corp", time: "2 mins ago" },
  { p: "MEDIUM", id: "#LOG-88215", title: "API Latency Spike: auth_endpoint_v2", company: "Secure Guard Ltd", time: "18 mins ago" },
  { p: "LOW", id: "#LOG-88210", title: "User Profile Image Upload Timeout", company: "AeroLogistics Inc", time: "1h 42m ago" },
  { p: "HIGH", id: "#LOG-88198", title: "Emergency Protocol Trigger Malfunction", company: "Sentinel North", time: "3h 12m ago" },
];

const pillClass = (p: string) =>
  p === "HIGH" ? "bg-destructive-soft text-destructive"
  : p === "MEDIUM" ? "bg-gold text-gold-foreground"
  : "bg-secondary text-primary/70";

const Issues = () => (
  <AppShell>
    <TopBar title="System Issues" showBell />
    <div className="px-5 pt-3 pb-6 space-y-4">
      <div className="rounded-2xl p-5 bg-slate-400/40 relative overflow-hidden">
        <AlertTriangle className="absolute -right-4 -top-2 h-32 w-32 text-white/10" strokeWidth={1.5} />
        <div className="label-eyebrow text-white/70">CRITICAL OPEN</div>
        <div className="font-display font-bold text-white text-[44px] leading-none mt-1">12</div>
        <div className="text-destructive font-bold mt-1">+2 from last hour</div>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card border-l-4 border-gold">
        <div className="label-eyebrow">STANDARD PENDING</div>
        <div className="font-display font-bold text-primary text-[44px] leading-none mt-1">28</div>
        <div className="text-muted-foreground text-sm mt-1">Awaiting triage</div>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card">
        <div className="label-eyebrow">RESOLVED (24H)</div>
        <div className="font-display font-bold text-primary text-[44px] leading-none mt-1">142</div>
        <div className="text-success font-bold text-sm mt-1">98.2% Sla</div>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input placeholder="Filter by Company or Issue..." className="bg-transparent flex-1 outline-none text-sm text-primary placeholder:text-muted-foreground/70" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold tracking-wider">
          <button className="border border-border rounded-lg py-2.5 text-primary">ALL TYPES</button>
          <button className="border border-border rounded-lg py-2.5 text-primary">ALL PRIORITIES</button>
          <button className="bg-secondary rounded-lg py-2.5 text-primary flex items-center justify-center gap-1"><Calendar className="h-3 w-3" />DATE<br />RANGE</button>
        </div>
      </div>

      <div className="label-eyebrow text-foreground/70">ACTIVE MONITORING FEED</div>

      <div className="space-y-4">
        {issues.map(it => (
          <div key={it.id} className="bg-card text-card-foreground rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-2">
              <span className={`pill ${pillClass(it.p)}`}>{it.p} PRIORITY</span>
              <span className="text-xs text-muted-foreground font-semibold">{it.id}</span>
            </div>
            <h3 className="font-display font-bold text-primary text-lg mt-3 leading-tight">{it.title}</h3>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>📋 {it.company}</span><span>🕐 {it.time}</span>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="bg-primary text-white font-bold tracking-wider text-xs px-5 py-3 rounded-lg">RESOLVE</button>
              <button className="text-primary font-bold tracking-wider text-xs px-2 py-3 underline underline-offset-4 decoration-gold">VIEW LOGS</button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-foreground/50 pt-6">© 2026 SentinelAI Internal Operations System</div>
    </div>
  </AppShell>
);
export default Issues;
