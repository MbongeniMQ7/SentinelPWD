import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Cpu, Radio, Bell, Shield, RotateCcw, FileWarning, ChevronRight, LogOut, BadgeCheck } from "lucide-react";
import { useState } from "react";
import avatarImg from "@/assets/avatar-marcus.jpg";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  const [push, setPush] = useState(true);

  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery={null} />
      <main className="flex-1 px-5 pb-6 space-y-5">
        {/* Profile hero */}
        <div className="panel bg-navy text-navy-foreground p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/10" />
          <div className="flex items-start gap-4 relative">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl overflow-hidden bg-card">
                <img src={avatarImg} alt="Marcus Thorne" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gold-soft flex items-center justify-center ring-2 ring-navy">
                <BadgeCheck className="h-4 w-4 text-gold-foreground" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              <h1 className="font-display text-3xl font-bold leading-tight">Marcus<br />Thorne</h1>
              <p className="text-sm opacity-70 mt-1">Lead Safety<br />Operations</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> STATUS: ACTIVE
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="label-eyebrow mb-2">Hardware Ecosystem</div>
          <div className="space-y-3">
            <div className="panel p-4">
              <div className="label-eyebrow">Device ID</div>
              <div className="font-display text-2xl font-bold mt-1">HIVE-7721</div>
              <Cpu className="h-4 w-4 text-muted-foreground mt-2" />
            </div>
            <div className="panel p-4">
              <div className="label-eyebrow">Connectivity</div>
              <div className="font-display text-2xl font-bold mt-1 flex items-center gap-2">
                Connected <span className="h-2 w-2 rounded-full bg-success" />
              </div>
              <Radio className="h-4 w-4 text-muted-foreground mt-2" />
            </div>
            <div className="panel p-4">
              <div className="label-eyebrow">Battery</div>
              <div className="font-display text-2xl font-bold mt-1">85%</div>
              <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gold" style={{ width: "85%" }} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="label-eyebrow mb-2">Configuration</div>
          <div className="space-y-3">
            <ConfigRow
              icon={<Bell className="h-4 w-4" />}
              title="Push Notifications"
              sub="Real-time safety alerts & fatigue warnings"
              trailing={
                <button onClick={() => setPush(!push)} className={`relative h-6 w-11 rounded-full ${push ? "bg-gold" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${push ? "left-[22px]" : "left-0.5"}`} />
                </button>
              }
            />
            <Link to="/settings"><ConfigRow icon={<Shield className="h-4 w-4" />} title="Privacy Settings" sub="Manage data sharing & telemetry" trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />} /></Link>
            <ConfigRow icon={<RotateCcw className="h-4 w-4" />} title="Change Password" sub="Last updated 45 days ago" trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />} />
            <Link to="/support"><ConfigRow icon={<FileWarning className="h-4 w-4" />} title="Log an Issue" sub="Report an issue" trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />} /></Link>
          </div>
        </div>

        <button className="w-full rounded-2xl bg-danger-soft py-4 flex items-center justify-center gap-2 text-danger font-bold">
          <LogOut className="h-4 w-4" /> Logout from Device
        </button>

        <div className="text-center label-eyebrow opacity-70 pt-2">
          SentinelAI v4.2.0 • Security Protocol<br />Enabled
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function ConfigRow({ icon, title, sub, trailing }: { icon: React.ReactNode; title: string; sub: string; trailing: React.ReactNode }) {
  return (
    <div className="panel p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-navy">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      {trailing}
    </div>
  );
}
