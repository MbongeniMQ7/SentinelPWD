import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Moon, Globe, AlertTriangle, Activity, FileText, AtSign, RotateCcw, ShieldCheck, Search, FileCheck, ExternalLink, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { resetPassword } from "@/lib/auth";

export const Route = createFileRoute("/user/settings")({
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const [dark, setDark] = useState(false);
  const [fatigue, setFatigue] = useState(true);
  const [vitals, setVitals] = useState(true);
  const [weekly, setWeekly] = useState(false);

  async function handleChangePassword() {
    if (!user?.email) return;
    const { error } = await resetPassword(user.email);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Password reset link sent to your email.");
    }
  }

  return (
    <div className="app-shell px-5 py-6 pb-10">
      <header className="flex items-center gap-3 mb-6">
        <Link to="/user/profile" className="h-9 w-9 rounded-full flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
      </header>

      <Section label="App Preferences">
        <Row icon={<Moon className="h-4 w-4" />} title="Dark Mode" sub="Adjust visual interface" trailing={<Toggle on={dark} onChange={setDark} />} />
        <Row icon={<Globe className="h-4 w-4" />} title="Language" sub="English (UK)" trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />} onClick={() => toast("Language picker coming soon")} />
      </Section>

      <Section label="Notifications">
        <Row icon={<AlertTriangle className="h-4 w-4 text-gold-foreground" />} iconBg="bg-gold-soft" title="Fatigue Alerts" sub="Real-time safety prompts" trailing={<Toggle on={fatigue} onChange={setFatigue} />} />
        <Row icon={<Activity className="h-4 w-4" />} title="Vitals Warnings" sub="Heart rate & temperature alerts" trailing={<Toggle on={vitals} onChange={setVitals} />} />
        <Row icon={<FileText className="h-4 w-4" />} title="Weekly Reports" sub="Email summary of performance" trailing={<Toggle on={weekly} onChange={setWeekly} />} />
      </Section>

      <Section label="Account">
        <Row
          icon={<AtSign className="h-4 w-4" />}
          title="Email Address"
          sub={user?.email ?? "—"}
          trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          onClick={() => toast("Email update flow coming soon")}
        />
        <Row
          icon={<RotateCcw className="h-4 w-4" />}
          title="Change Password"
          sub="Send a reset link to your email"
          trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
          onClick={handleChangePassword}
        />
        <Row icon={<ShieldCheck className="h-4 w-4" />} title="Two-Factor Authentication" sub={<span className="text-gold-foreground font-semibold">Enabled</span>} trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />} onClick={() => toast("Two-factor settings coming soon")} />
      </Section>

      <Section label="Security">
        <Row icon={<Search className="h-4 w-4" />} title="Privacy Policy" trailing={<ExternalLink className="h-4 w-4 text-muted-foreground" />} onClick={() => toast("Opening privacy policy…")} />
        <Row icon={<FileCheck className="h-4 w-4" />} title="Terms of Service" trailing={<ExternalLink className="h-4 w-4 text-muted-foreground" />} onClick={() => toast("Opening terms of service…")} />
      </Section>

      <div className="mt-8 flex flex-col items-center gap-2">
        <span className="rounded-full bg-card border border-border px-3 py-1 text-[11px] font-bold tracking-widest flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> SENTINELAI V1.0.0
        </span>
        <span className="text-xs text-muted-foreground">Build: 2026.04.01.Secure</span>
      </div>

      <div className="mt-6 text-center">
        <Link to="/user/support" className="text-xs font-bold text-gold-foreground tracking-wider">CONTACT SUPPORT</Link>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="label-eyebrow mb-2">{label}</div>
      <div className="panel divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ icon, iconBg = "bg-secondary", title, sub, trailing, onClick }: { icon: React.ReactNode; iconBg?: string; title: string; sub?: React.ReactNode; trailing?: React.ReactNode; onClick?: () => void }) {
  const content = (
    <>
      <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center text-navy`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
      {trailing}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition">
        {content}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {content}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition ${on ? "bg-gold-foreground" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
