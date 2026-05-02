import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { CreditCard, LifeBuoy, UserPlus, ChevronRight, LogOut, Bell, Globe, Shield } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SentinelAI Admin" },
      { name: "description", content: "Manage your SentinelAI account, billing, support, and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <TopBar showBell showAvatar />
      <div className="px-5 pt-4">
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink">Settings</h1>
        <p className="mt-3 text-[13px] text-ink-soft">Manage your account and SentinelAI workspace.</p>
      </div>

      <div className="px-5 mt-5 space-y-3">
        <SettingsLink to="/billing" icon={<CreditCard className="h-5 w-5" />} label="Billing & Subscription" sub="Enterprise Plan • Renews Oct 2026" />
        <SettingsLink to="/support" icon={<LifeBuoy className="h-5 w-5" />} label="System Integrity / Support" sub="24 active tickets" />
        <SettingsLink to="/onboarding" icon={<UserPlus className="h-5 w-5" />} label="Register New Personnel" sub="Onboard a new sentinel" />
        <SettingsLink to="/rest" icon={<Shield className="h-5 w-5" />} label="Leave & Rest Requests" sub="12 pending approvals" />

        <div className="bg-surface rounded-2xl p-2 shadow-sm">
          <Row icon={<Bell className="h-5 w-5" />} label="Notifications" />
          <Row icon={<Globe className="h-5 w-5" />} label="Region & Language" sub="Global Terminal (EN-UK)" />
        </div>

        <Link to="/" className="mt-4 w-full h-12 rounded-xl bg-muted text-ink text-[13px] font-extrabold tracking-wider uppercase flex items-center justify-center gap-2">
          <LogOut className="h-4 w-4" /> Log Out
        </Link>
      </div>
    </AppShell>
  );
}

function SettingsLink({ to, icon, label, sub }: { to: string; icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 bg-surface rounded-2xl p-4 shadow-sm">
      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-ink">{icon}</div>
      <div className="flex-1">
        <p className="text-[14px] font-extrabold text-ink">{label}</p>
        {sub && <p className="text-[11px] text-ink-soft">{sub}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-ink-soft" />
    </Link>
  );
}

function Row({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-ink">{icon}</div>
      <div className="flex-1">
        <p className="text-[14px] font-extrabold text-ink">{label}</p>
        {sub && <p className="text-[11px] text-ink-soft">{sub}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-ink-soft" />
    </div>
  );
}
