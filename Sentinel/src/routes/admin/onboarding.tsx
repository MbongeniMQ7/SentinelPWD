import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { ChevronRight, Briefcase, Cpu, Wifi, Fingerprint, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/onboarding")({
  head: () => ({
    meta: [
      { title: "Register New Personnel — SentinelAI Admin" },
      { name: "description", content: "Initialize a new sentinel entry and select the appropriate monitoring protocol." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const [protocol, setProtocol] = useState<"iot" | "bio">("iot");
  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4">
        <p className="flex items-center gap-1 text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
          Workforce <ChevronRight className="h-3 w-3" /> Onboarding
        </p>
        <h1 className="mt-1 text-[34px] leading-[1.05] font-extrabold text-ink">Register New Personnel</h1>
        <p className="mt-3 text-[13px] text-ink-soft leading-snug">
          Initialize a new sentinel entry. Select the appropriate monitoring protocol to begin automated workforce integration.
        </p>
      </div>

      <div className="px-5 mt-5 space-y-5">
        <form className="bg-surface rounded-2xl p-5 shadow-sm space-y-5">
          <Field label="GIVEN NAME" placeholder="e.g. Marcus" />
          <Field label="SURNAME" placeholder="e.g. Thorne" />
          <Field label="DESIGNATED ROLE" placeholder="Select Operational Role…" icon={<Briefcase className="h-4 w-4" />} />

          <div>
            <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Monitoring Protocol</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProtocol("iot")}
                className={`flex flex-col items-center gap-1 py-4 rounded-xl border-2 transition ${
                  protocol === "iot" ? "bg-surface border-ink shadow" : "bg-muted border-transparent"
                }`}
              >
                <Wifi className="h-4 w-4 text-ink" />
                <span className="text-[12px] font-extrabold tracking-wider text-ink uppercase text-center">IoT<br />Deployment</span>
              </button>
              <button
                type="button"
                onClick={() => setProtocol("bio")}
                className={`flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 transition ${
                  protocol === "bio" ? "bg-surface border-ink shadow" : "bg-muted border-transparent"
                }`}
              >
                <Fingerprint className="h-4 w-4 text-ink" />
                <span className="text-[12px] font-extrabold tracking-wider text-ink uppercase">Biometric</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Primary Device ID</p>
              <span className="px-2 py-0.5 rounded-md bg-warning text-[9px] font-extrabold tracking-wider text-ink uppercase">Required for IoT</span>
            </div>
            <div className="mt-2 relative">
              <Cpu className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                placeholder="STNL - XXXX - XXXX"
                className="w-full h-12 pl-10 pr-3 rounded-xl bg-muted text-[14px] text-ink placeholder:text-ink-soft outline-none"
              />
            </div>
          </div>

          <Link to="/admin/workforce" className="w-full h-13 mt-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 py-4">
            Register Employee <ArrowRight className="h-4 w-4" />
          </Link>
        </form>

        <section className="bg-surface-muted rounded-2xl p-5 shadow-sm dot-pattern relative overflow-hidden">
          <div className="h-10 w-10 rounded-xl bg-warning/30 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-warning-foreground" /></div>
          <h2 className="mt-3 text-[20px] font-extrabold text-ink">Enterprise Security Protocol</h2>
          <p className="mt-2 text-[13px] text-ink-soft/80 leading-snug">
            Registering personnel initiates a global unique identifier. Ensure all information matches official identification for 256-bit encrypted ledger logging.
          </p>
          <ul className="mt-4 space-y-2.5 text-[12px] font-extrabold tracking-wider text-ink uppercase">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-warning-foreground" /> Real-Time GPS Tracking Ready</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-warning-foreground" /> Instant Biometric Auth Support</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-warning-foreground" /> Fleet Management Integration</li>
          </ul>
        </section>

        <aside className="relative bg-surface-muted rounded-2xl p-5 shadow-sm border-l-4 border-warning">
          <p className="text-[11px] font-extrabold tracking-wider text-warning-foreground uppercase">Technical Note</p>
          <p className="mt-2 text-[13px] text-ink leading-snug">
            SentinelAI employs <em className="font-extrabold not-italic">Editorial Intelligence</em>. Your data entry flows directly into the command-and-control ledger, visible by regional supervisors immediately after registration.
          </p>
        </aside>

        <div className="rounded-2xl overflow-hidden bg-primary text-primary-foreground p-4">
          <div className="font-mono text-[10px] leading-4 text-primary-foreground/70 space-y-0.5">
            <div className="flex justify-between"><span>Telemetrics</span><span>SC Stable</span><span>Pulse Stream</span><span>OK</span></div>
            <div className="flex justify-between"><span>Geofence</span><span>0.5 Thorne</span><span>Personnel anchored</span><span>SYNC</span></div>
            <div className="flex justify-between"><span>Sensor Network</span><span>0.5 Tasic</span><span>Sensor connection</span><span>OK</span></div>
            <div className="flex justify-between"><span>Surveillance Activated</span><span>0.5 Source</span><span>Database Inversiones</span><span>SHED</span></div>
            <div className="flex justify-between"><span>Time logs in lapse</span><span>0.5 Source</span><span>Below 1.5 days</span><span>1.5</span></div>
          </div>
          <p className="mt-3 text-[11px] font-extrabold tracking-wider uppercase">Secure Ledger Instance: <span className="text-warning">Active</span></p>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, placeholder, icon }: { label: string; placeholder: string; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">{label}</label>
      <div className="mt-2 relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">{icon}</span>}
        <input placeholder={placeholder} className={`w-full h-12 ${icon ? "pl-10" : "pl-3"} pr-3 rounded-xl bg-muted text-[14px] text-ink placeholder:text-ink-soft outline-none`} />
      </div>
    </div>
  );
}
