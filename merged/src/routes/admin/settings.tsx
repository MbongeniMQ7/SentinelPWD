import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribePushNotifications,
  type PushTransportHandle,
} from "@/lib/fatigue/transport";
import { CreditCard, LifeBuoy, UserPlus, ChevronRight, LogOut, Bell, Globe, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SentinelAI Admin" },
      { name: "description", content: "Manage your SentinelAI account, billing, support, and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [perm, setPerm] = useState(getNotificationPermission);
  const pushHandleRef = useRef<PushTransportHandle | null>(null);

  useEffect(() => {
    // Auto-wire the push transport on mount if permission is already granted.
    if (perm === "granted" && !pushHandleRef.current) {
      pushHandleRef.current = subscribePushNotifications({ minLevel: "high" });
    }
    return () => {
      pushHandleRef.current?.disconnect();
      pushHandleRef.current = null;
    };
  }, [perm]);

  const desktopAlertsLabel =
    perm === "granted"
      ? "Desktop Alerts — Enabled"
      : perm === "denied"
        ? "Desktop Alerts — Blocked"
        : perm === "unsupported"
          ? "Desktop Alerts — Unsupported"
          : "Enable Desktop Alerts";

  const desktopAlertsSub =
    perm === "granted"
      ? "OS-level notifications for high-risk fatigue events"
      : perm === "denied"
        ? "Re-enable in your browser site settings"
        : perm === "unsupported"
          ? "Your browser does not support notifications"
          : "OS-level alerts when a worker hits High risk";

  async function onToggleDesktopAlerts() {
    if (perm === "unsupported") {
      toast.error("This browser does not support desktop notifications");
      return;
    }
    if (perm === "denied") {
      toast("Desktop alerts are blocked. Re-enable them in your browser site settings.");
      return;
    }
    if (perm === "granted") {
      toast("Desktop alerts already enabled");
      return;
    }
    const next = await requestNotificationPermission();
    setPerm(next);
    if (next === "granted") {
      pushHandleRef.current?.disconnect();
      pushHandleRef.current = subscribePushNotifications({ minLevel: "high" });
      toast.success("Desktop alerts enabled");
    } else if (next === "denied") {
      toast.error("Desktop alerts were blocked");
    }
  }

  return (
    <AppShell>
      <TopBar showBell showAvatar />
      <div className="px-5 pt-4">
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink">Settings</h1>
        <p className="mt-3 text-[13px] text-ink-soft">Manage your account and SentinelAI workspace.</p>
      </div>

      <div className="px-5 mt-5 space-y-3">
        <SettingsLink to="/admin/billing" icon={<CreditCard className="h-5 w-5" />} label="Billing & Subscription" sub="Enterprise Plan • Renews Oct 2026" />
        <SettingsLink to="/admin/support" icon={<LifeBuoy className="h-5 w-5" />} label="System Integrity / Support" sub="24 active tickets" />
        <SettingsLink to="/admin/onboarding" icon={<UserPlus className="h-5 w-5" />} label="Register New Personnel" sub="Onboard a new sentinel" />
        <SettingsLink to="/admin/rest" icon={<Shield className="h-5 w-5" />} label="Leave & Rest Requests" sub="12 pending approvals" />

        <div className="bg-surface rounded-2xl p-2 shadow-sm">
          <Row
            icon={<Bell className="h-5 w-5" />}
            label={desktopAlertsLabel}
            sub={desktopAlertsSub}
            onClick={onToggleDesktopAlerts}
          />
          <Row icon={<Bell className="h-5 w-5" />} label="Notifications" onClick={() => toast("Notification settings coming soon")} />
          <Row icon={<Globe className="h-5 w-5" />} label="Region & Language" sub="Global Terminal (EN-UK)" onClick={() => toast("Region & language settings coming soon")} />
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

function Row({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition"
    >
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-ink">{icon}</div>
      <div className="flex-1">
        <p className="text-[14px] font-extrabold text-ink">{label}</p>
        {sub && <p className="text-[11px] text-ink-soft">{sub}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-ink-soft" />
    </button>
  );
}
