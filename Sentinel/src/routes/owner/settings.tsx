import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Sliders, Shield, Bell, Receipt, ChevronRight, CreditCard, Pencil, Copy, UserPlus, AlertTriangle, Zap, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import type { PaymentStatus } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_OWNER_NOTIFICATION_SETTINGS,
  emitOwnerNotification,
  enableDesktopNotificationsIfNeeded,
  isMonthlyBillingRetry,
  isServerPerformanceSignal,
  loadOwnerNotificationSettings,
  sameNotificationSettings,
  saveOwnerNotificationSettings,
  type OwnerNotificationSettings,
} from "@/lib/systemNotifications";

const Settings = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [toggles, setToggles] = useState<OwnerNotificationSettings>(DEFAULT_OWNER_NOTIFICATION_SETTINGS);
  const [savedToggles, setSavedToggles] = useState<OwnerNotificationSettings>(DEFAULT_OWNER_NOTIFICATION_SETTINGS);
  const seenEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const settings = loadOwnerNotificationSettings();
    setToggles(settings);
    setSavedToggles(settings);
  }, []);

  useEffect(() => {
    const channels = [] as ReturnType<typeof supabase.channel>[];

    async function fetchCompanyName(companyId: string | null | undefined) {
      if (!companyId) return null;
      const { data } = await supabase
        .from("companies")
        .select("company_name")
        .eq("company_id", companyId)
        .single();
      return data?.company_name ?? null;
    }

    if (savedToggles.reg) {
      const registrationChannel = supabase
        .channel("owner-settings-company-signups")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "companies",
          },
          (payload) => {
            const company = payload.new as {
              company_id: string;
              company_name?: string | null;
              contact_email?: string | null;
            };
            const eventId = `company:${company.company_id}`;
            if (seenEventsRef.current.has(eventId)) return;
            seenEventsRef.current.add(eventId);
            emitOwnerNotification({
              title: "New company signup",
              description: `${company.company_name ?? "A new company"} joined the platform${company.contact_email ? ` • ${company.contact_email}` : ""}.`,
              tag: eventId,
            });
          },
        )
        .subscribe();
      channels.push(registrationChannel);
    }

    if (savedToggles.sys) {
      const performanceChannel = supabase
        .channel("owner-settings-system-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "audit_logs",
          },
          (payload) => {
            const audit = payload.new as {
              audit_id?: string;
              action_type?: string | null;
              description?: string | null;
            };
            if (!isServerPerformanceSignal(audit)) return;
            const eventId = `audit:${audit.audit_id ?? `${audit.action_type}:${audit.description ?? ""}`}`;
            if (seenEventsRef.current.has(eventId)) return;
            seenEventsRef.current.add(eventId);
            emitOwnerNotification({
              title: "Server performance drop",
              description: audit.description ?? "A realtime performance warning was recorded in the audit log.",
              tag: eventId,
            });
          },
        )
        .subscribe();
      channels.push(performanceChannel);
    }

    if (savedToggles.pay) {
      const billingChannel = supabase
        .channel("owner-settings-billing-retries")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payments",
          },
          async (payload) => {
            const payment = payload.new as {
              payment_id: string;
              company_id?: string | null;
              payment_date: string;
              payment_status: PaymentStatus;
            };
            if (!payment?.payment_id || !isMonthlyBillingRetry(payment.payment_date, payment.payment_status)) {
              return;
            }

            const eventId = `payment:${payment.payment_id}:${payment.payment_status}`;
            if (seenEventsRef.current.has(eventId)) return;
            seenEventsRef.current.add(eventId);

            const companyName = await fetchCompanyName(payment.company_id);
            emitOwnerNotification({
              title: "Monthly billing retry",
              description: `${companyName ?? "A company"} has a ${payment.payment_status.toLowerCase()} payment that may require a retry this month.`,
              tag: eventId,
            });
          },
        )
        .subscribe();
      channels.push(billingChannel);
    }

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [savedToggles.pay, savedToggles.reg, savedToggles.sys, profile?.profile_id]);

  const T = ({ k }: { k: keyof typeof toggles }) => (
    <button onClick={() => setToggles(s => ({ ...s, [k]: !s[k] }))}
      className={`h-7 w-12 rounded-full p-1 transition-colors ${toggles[k] ? "bg-gold" : "bg-secondary"}`}>
      <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${toggles[k] ? "translate-x-5" : ""}`} />
    </button>
  );

  async function handleSaveChanges() {
    const permission = await enableDesktopNotificationsIfNeeded(toggles);
    saveOwnerNotificationSettings(toggles);
    setSavedToggles(toggles);

    await supabase.from("audit_logs").insert({
      profile_id: profile?.profile_id ?? null,
      company_id: profile?.company_id ?? null,
      action_type: "SETTINGS_UPDATED",
      description: "Notification preferences updated in owner settings.",
    });

    if (permission === "denied") {
      toast("Settings saved. Browser notifications are blocked, so alerts will show in-app only.");
      return;
    }

    toast.success("Notification settings saved.");
  }

  function handleDiscardChanges() {
    setToggles(savedToggles);
    toast("Reverted unsaved notification changes.");
  }

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-3 pb-6 space-y-5">
        <div>
          <h2 className="font-display text-[34px] leading-tight font-bold">Platform Settings</h2>
          <p className="text-foreground/70 mt-2 text-sm">Manage global system configurations and enterprise parameters.</p>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-xl bg-gold flex items-center justify-center text-gold-foreground"><Sliders className="h-5 w-5" /></div>
            <span className="label-eyebrow">ACCESS LEVEL</span>
          </div>
          {[
            { Icon: Sliders, label: "General Config", active: true },
            { Icon: Shield, label: "Security & Keys" },
            { Icon: Bell, label: "Notifications" },
            { Icon: Receipt, label: "Subscriptions" },
          ].map(({ Icon, label, active }) => (
            <button key={label} className={`w-full flex items-center justify-between py-3 px-2 rounded-xl ${active ? "bg-card-muted" : ""}`}>
              <span className="flex items-center gap-3 text-primary font-semibold"><Icon className="h-5 w-5" />{label}</span>
              {!active && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          ))}
        </div>

        <div className="bg-surface text-surface-foreground rounded-2xl p-5 relative overflow-hidden">
          <div className="label-eyebrow text-foreground/60">SYSTEM LOAD</div>
          <div className="font-display font-bold text-foreground text-[40px] leading-none mt-1">12.4%</div>
          <div className="h-1 bg-foreground/10 mt-3 rounded-full overflow-hidden"><div className="h-full bg-gold" style={{ width: "12.4%" }} /></div>
          <p className="text-xs text-foreground/60 mt-2">All services operational across 4 regions.</p>
        </div>

        <div>
          <h3 className="font-display font-bold text-xl flex items-center gap-2"><CreditCard className="h-5 w-5 text-gold" />Subscription Plans</h3>
          <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card mt-3 space-y-4">
            {[
              { name: "Starter Enterprise", desc: "Up to 10 companies, basic biometrics.", price: "499" },
              { name: "Pro Sentinel", desc: "Unlimited companies, 24/7 monitoring.", price: "1,299", popular: true },
            ].map(p => (
              <div key={p.name}>
                <div className="flex items-center gap-2"><span className="font-display font-bold text-primary">{p.name}</span>{p.popular && <span className="pill bg-gold text-gold-foreground">POPULAR</span>}</div>
                <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-secondary rounded-lg px-4 py-2.5 flex items-center justify-between"><span className="text-primary/60">R</span><span className="font-display font-bold text-primary">{p.price}</span></div>
                  <button className="h-10 w-10 rounded-lg flex items-center justify-center text-primary"><Pencil className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            <button className="w-full text-center text-primary font-bold underline underline-offset-4 decoration-gold pt-2">Add New Tier</button>
          </div>
        </div>

        <div>
          <h3 className="font-display font-bold text-xl flex items-center gap-2"><span className="h-1 w-3 bg-gold rounded-full" /><span className="h-1 w-3 bg-gold rounded-full" /><span className="h-1 w-3 bg-gold rounded-full" />System Configuration</h3>
          <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card mt-3 space-y-4">
            <div><div className="label-eyebrow">GLOBAL THRESHOLD (MS)</div><input defaultValue="250" className="mt-2 w-full bg-secondary rounded-lg px-4 py-3 text-primary outline-none" /></div>
            <div><div className="label-eyebrow">DATA RETENTION (DAYS)</div><input defaultValue="90" className="mt-2 w-full bg-secondary rounded-lg px-4 py-3 text-primary outline-none" /></div>
            <div>
              <div className="label-eyebrow">MASTER API KEY</div>
              <div className="mt-2 bg-secondary rounded-lg px-4 py-3 flex items-center justify-between">
                <code className="text-primary text-sm">sk-sentinel-84h2-92j1-k092l-p921</code>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Last rotated 12 days ago.</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-display font-bold text-xl flex items-center gap-2"><Bell className="h-5 w-5 text-gold" />Notifications</h3>
          <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card mt-3 space-y-4">
            {[
              { Icon: UserPlus, k: "reg", title: "New Company Registration", desc: "Alert admins when a new enterprise signs up.", color: "text-primary" },
              { Icon: AlertTriangle, k: "sys", title: "System Latency", desc: "Real-time alerts for server performance drops.", color: "text-destructive" },
              { Icon: Zap, k: "pay", title: "Payment Failures", desc: "Monthly billing retry notification.", color: "text-primary" },
            ].map(({ Icon, k, title, desc, color }, i, arr) => (
              <div key={k} className={`flex items-center gap-3 ${i < arr.length - 1 ? "pb-4 border-b border-border" : ""}`}>
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center"><Icon className={`h-5 w-5 ${color}`} /></div>
                <div className="flex-1"><div className="font-bold text-primary text-sm">{title}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
                <T k={k as any} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={handleDiscardChanges}
            disabled={sameNotificationSettings(toggles, savedToggles)}
            className="font-display font-bold text-foreground disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            className="bg-white text-primary font-bold tracking-wider text-xs px-6 py-4 rounded-xl"
          >
            SAVE CHANGES
          </button>
        </div>

        <button
          type="button"
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-4 text-sm font-bold text-destructive"
        >
          <LogOut className="h-4 w-4" /> Log Out
        </button>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/settings")({ component: Settings });
