import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowLeft, Search, SlidersHorizontal, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "System Integrity Ledger — SentinelAI Admin" },
      { name: "description", content: "Comprehensive audit of technical tickets and system anomalies requiring administrative resolution." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-3">
        <Link to="/alerts" className="inline-flex items-center text-ink mb-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink">System Integrity Ledger</h1>
        <p className="mt-3 text-[13px] text-ink-soft leading-snug">
          Comprehensive audit of technical tickets and system anomalies requiring administrative resolution.
        </p>

        <div className="mt-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input placeholder="Search ticket ID, user, or hardware..." className="w-full h-11 pl-9 pr-3 rounded-xl bg-muted text-[13px] outline-none" />
          </div>
          <button className="h-11 w-11 rounded-xl bg-surface border border-border flex items-center justify-center"><SlidersHorizontal className="h-4 w-4 text-ink" /></button>
        </div>
      </div>

      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        <KpiCard label="Active Issues" value="24" trail={<span className="text-critical text-[12px] font-bold">+4 since AM</span>} />
        <KpiCard label="Critical Faults" value="02" valueColor="text-warning" trail={<span className="text-warning-foreground text-[10px] font-extrabold tracking-wider uppercase">Requires Action</span>} dark />
        <KpiCard label="Avg Resolve Time" value="4.2h" stripe trail={<span className="text-ink-soft text-[11px] font-bold">-15% improvement</span>} />
        <KpiCard label="Pending Updates" value="12" valueColor="text-ink" warning />
      </div>

      <div className="px-5 mt-5">
        <div className="grid grid-cols-4 text-[10px] font-extrabold tracking-wider text-ink-soft uppercase pb-2 border-b border-border">
          <span>Incident Detail</span><span>Reporter</span><span className="col-span-1 text-center">Time</span><span className="text-right">Status</span>
        </div>

        <ul className="mt-4 space-y-3">
          <Ticket cat="Device Fault" catTone="critical" id="#TKT-9042" title="Camera Node CN-422 Signal Interruption" desc="Complete visual feed loss at Sector 4 Perimeter. Hardware diagnostic indicates potential sensor burnout." reporter="John Doe" role="Field Tech" date="Oct 24, 2023" time="14:22 GMT" status="OPEN" statusTone="text-critical" />
          <Ticket cat="App Logic" catTone="warning" id="#TKT-8911" title="Mobile App Sync Conflict (iOS)" desc="Supervisor reports shifts not updating in real-time on iPad Pro devices after latest firmware patch." reporter="Sarah Kim" role="Fleet Lead" date="Oct 23, 2023" time="09:15 GMT" status="IN PROGRESS" statusTone="bg-warning text-ink rounded-md px-2 py-1" />
          <Ticket cat="Data Integrity" catTone="info" id="#TKT-8850" title="Telemetry Data Discrepancy" desc="GPS logs in automated report v.2.1 showing 3m variance compared to raw sensor data export." reporter="Ray Miller" role="Data Analyst" date="Oct 22, 2023" time="18:40 GMT" status="RESOLVED" statusTone="bg-info-soft text-ink rounded-md px-2 py-1" />
          <Ticket cat="Device Fault" catTone="critical" id="#TKT-8842" title="Unresponsive Terminal Unit XT-9" desc="Kiosk terminal in North Lobby failing to accept credential scans. Power cycling failed." reporter="Ana Martinez" role="Site Admin" date="Oct 22, 2023" time="11:05 GMT" status="OPEN" statusTone="text-critical" />
        </ul>
      </div>
    </AppShell>
  );
}

function KpiCard({ label, value, valueColor, trail, dark, warning, stripe }: { label: string; value: string; valueColor?: string; trail?: React.ReactNode; dark?: boolean; warning?: boolean; stripe?: boolean }) {
  const bg = dark ? "bg-primary/40 text-primary-foreground" : warning ? "bg-warning text-ink" : "bg-surface text-ink";
  return (
    <div className={`relative rounded-2xl p-4 shadow-sm ${bg} ${stripe ? "border-l-4 border-warning" : ""}`}>
      <p className={`text-[10px] font-extrabold tracking-wider uppercase ${dark ? "text-primary-foreground/70" : warning ? "text-ink/80" : "text-ink-soft"}`}>{label}</p>
      <p className={`mt-2 text-[30px] leading-none font-extrabold ${valueColor || ""}`}>{value}</p>
      {trail && <div className="mt-1">{trail}</div>}
    </div>
  );
}

function Ticket({ cat, catTone, id, title, desc, reporter, role, date, time, status, statusTone }: { cat: string; catTone: "critical" | "warning" | "info"; id: string; title: string; desc: string; reporter: string; role: string; date: string; time: string; status: string; statusTone: string }) {
  const tone = catTone === "critical" ? "pill-critical" : catTone === "warning" ? "pill-warning" : "pill-info";
  return (
    <li className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase ${tone}`}>{cat}</span>
        <span className="text-[11px] font-bold text-ink-soft">{id}</span>
      </div>
      <h3 className="mt-3 text-[16px] font-extrabold text-ink leading-tight">{title}</h3>
      <p className="mt-1 text-[12px] text-ink-soft leading-snug">{desc}</p>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-extrabold text-ink">{reporter.split(" ").map(n => n[0]).join("")}</div>
          <div>
            <p className="text-[12px] font-extrabold text-ink">{reporter}</p>
            <p className="text-[9px] font-extrabold tracking-wider text-ink-soft uppercase">{role}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold text-ink">{date}</p>
          <p className="text-[10px] text-ink-soft">{time}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button className={`inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wider uppercase ${statusTone.includes("bg-") ? statusTone : statusTone}`}>
          {status} <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}
