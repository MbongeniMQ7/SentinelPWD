import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/sentinel/StatusBadge";
import { ChevronLeft, Search, FileText, Download, CheckCircle2, Pencil, CreditCard } from "lucide-react";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Subscription — SentinelAI Admin" },
      { name: "description", content: "Manage your SentinelAI subscription plan, payment history, and billing methods." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  return (
    <AppShell>
      <TopBar right={<button className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><Search className="h-4 w-4 text-ink" /></button>} showBell />
      <div className="px-5 pt-3">
        <Link to="/settings" className="inline-flex items-center text-ink mb-2"><ChevronLeft className="h-7 w-7" /></Link>
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink">Billing &<br />Subscription</h1>
      </div>

      <div className="px-5 mt-5 space-y-5">
        <section className="bg-surface rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Current Plan</p>
            <StatusBadge variant="warning">Active</StatusBadge>
          </div>
          <h2 className="mt-2 text-[26px] font-extrabold text-ink leading-tight">Enterprise Plan</h2>
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">Billing Cycle</p>
              <p className="mt-1 text-[15px] font-extrabold text-ink">Annual Billing</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">Renewal Date</p>
              <p className="mt-1 text-[15px] font-extrabold text-ink">October 24, 2026</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="h-11 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold tracking-wider uppercase">Manage Plan</button>
            <button className="h-11 rounded-xl bg-muted text-ink text-[12px] font-extrabold tracking-wider uppercase">Cancel Subscription</button>
          </div>
        </section>

        <section className="bg-surface-muted rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-extrabold text-ink">Payment History</h3>
            <button className="text-[11px] font-extrabold tracking-wider text-ink uppercase">Download All</button>
          </div>
          <ul className="mt-4 space-y-3">
            {[
              { id: "9283-24", date: "April 18, 2026" },
              { id: "8841-24", date: "April 12, 2026" },
              { id: "7721-24", date: "March 12, 2026" },
            ].map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 bg-surface rounded-xl p-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><FileText className="h-5 w-5 text-ink" /></div>
                <div className="flex-1">
                  <p className="text-[13px] font-extrabold text-ink">Invoice #SAI-{inv.id}</p>
                  <p className="text-[11px] text-ink-soft">{inv.date} • PDF</p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-extrabold text-ink">R1,250.00</p>
                  <button className="text-ink-soft inline-flex"><Download className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative rounded-2xl p-5 text-primary-foreground overflow-hidden bg-primary">
          <h3 className="text-[22px] font-extrabold">Unlock Higher Limits</h3>
          <p className="mt-2 text-[13px] text-primary-foreground/80">Increase your workforce capacity, priority alerts, and advanced predictive modeling with our Pro Plus tier.</p>
          <ul className="mt-4 space-y-2 text-[13px]">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-warning" /> Unlimited Device Connections</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-warning" /> 24/7 Priority Sentinel Support</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-warning" /> Advanced Forensic Auditing</li>
          </ul>
          <button className="mt-5 w-full h-12 rounded-xl bg-warning text-ink text-[13px] font-extrabold tracking-wider uppercase">Upgrade to Pro Plus</button>
          <span className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full border-4 border-primary-foreground/10" />
        </section>

        <section className="bg-surface-muted rounded-2xl p-5 shadow-sm">
          <h3 className="text-[18px] font-extrabold text-ink">Payment Method</h3>
          <div className="mt-3 flex items-center gap-3 bg-surface rounded-xl p-3">
            <div className="h-10 w-14 rounded-md bg-gradient-to-br from-blue-300 to-blue-500" />
            <div className="flex-1">
              <p className="text-[14px] font-extrabold text-ink">Visa ending in 4242</p>
              <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Expires 12/26</p>
            </div>
            <button className="text-ink-soft"><Pencil className="h-4 w-4" /></button>
          </div>
          <button className="mt-3 w-full h-12 rounded-xl bg-surface border border-border text-[12px] font-extrabold tracking-wider text-ink uppercase flex items-center justify-center gap-2">
            <CreditCard className="h-4 w-4" /> Add New Method
          </button>
        </section>
      </div>
    </AppShell>
  );
}
