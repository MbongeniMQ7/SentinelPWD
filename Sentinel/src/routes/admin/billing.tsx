import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { ChevronLeft, FileText, Download, CreditCard, Loader2, PackageOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { SubscriptionStatus, PaymentStatus } from "@/lib/database.types";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Subscription — SentinelAI Admin" },
      { name: "description", content: "Manage your SentinelAI subscription plan, payment history, and billing methods." },
    ],
  }),
  component: BillingPage,
});

interface SubRow {
  subscription_id: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string | null;
  subscription_plans: {
    plan_name: string;
    monthly_price: number;
    includes_iot: boolean;
    includes_camera: boolean;
    max_users: number | null;
  } | null;
}

interface PayRow {
  payment_id: string;
  amount: number;
  payment_date: string;
  payment_status: PaymentStatus;
  payment_method: string | null;
}

const STATUS_STYLE: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-muted text-ink-soft",
  CANCELLED: "bg-red-100 text-red-600",
  EXPIRED: "bg-muted text-ink-soft",
};

const PAY_STYLE: Record<PaymentStatus, string> = {
  PAID: "text-green-600",
  PENDING: "text-warning-foreground",
  FAILED: "text-red-600",
  REFUNDED: "text-ink-soft",
};

function BillingPage() {
  const { profile } = useAuth();
  const [sub, setSub] = useState<SubRow | null>(null);
  const [payments, setPayments] = useState<PayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    (async () => {
      const [{ data: subData }, { data: payData }] = await Promise.all([
        supabase
          .from("company_subscriptions")
          .select("subscription_id, status, start_date, end_date, subscription_plans(plan_name, monthly_price, includes_iot, includes_camera, max_users)")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("payments")
          .select("payment_id, amount, payment_date, payment_status, payment_method")
          .eq("company_id", profile.company_id)
          .order("payment_date", { ascending: false })
          .limit(10),
      ]);
      setSub(subData as SubRow | null);
      setPayments((payData as PayRow[]) ?? []);
      setLoading(false);
    })();
  }, [profile]);

  return (
    <AppShell>
      <TopBar showBell />
      <div className="px-5 pt-3 pb-24">
        <Link to="/admin/settings" className="inline-flex items-center text-ink mb-2"><ChevronLeft className="h-7 w-7" /></Link>
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink">Billing &<br />Subscription</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-ink-soft" />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Current plan */}
            <section className="bg-surface rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">Current Plan</p>
                {sub && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${STATUS_STYLE[sub.status]}`}>
                    {sub.status}
                  </span>
                )}
              </div>

              {sub?.subscription_plans ? (
                <>
                  <h2 className="mt-2 text-[26px] font-extrabold text-ink leading-tight">
                    {sub.subscription_plans.plan_name}
                  </h2>
                  <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">Monthly Price</p>
                      <p className="mt-1 text-[15px] font-extrabold text-ink">
                        R{sub.subscription_plans.monthly_price.toLocaleString("en-ZA")} / mo
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">Renewal Date</p>
                      <p className="mt-1 text-[15px] font-extrabold text-ink">
                        {sub.end_date ? new Date(sub.end_date).toLocaleDateString("en-ZA") : "Ongoing"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">Max Users</p>
                      <p className="mt-1 text-[15px] font-extrabold text-ink">
                        {sub.subscription_plans.max_users ?? "Unlimited"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold tracking-wider text-ink-soft uppercase">Features</p>
                      <p className="mt-1 text-[13px] font-bold text-ink">
                        {[sub.subscription_plans.includes_camera && "Camera", sub.subscription_plans.includes_iot && "IoT"].filter(Boolean).join(" + ") || "Basic"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Request subscription cancellation?")) toast.success("Cancellation request submitted to SentinelAI.");
                    }}
                    className="mt-5 w-full h-11 rounded-xl bg-muted text-ink text-[12px] font-extrabold tracking-wider uppercase"
                  >
                    Cancel Subscription
                  </button>
                </>
              ) : (
                <div className="mt-4 text-center py-6">
                  <PackageOpen className="h-9 w-9 text-ink-soft mx-auto mb-2" />
                  <p className="text-[14px] font-bold text-ink">No active subscription</p>
                  <p className="text-[12px] text-ink-soft mt-1">Contact SentinelAI to set up a plan.</p>
                </div>
              )}
            </section>

            {/* Payment history */}
            <section className="bg-surface rounded-2xl p-5 shadow-sm">
              <h3 className="text-[18px] font-extrabold text-ink">Payment History</h3>
              {payments.length === 0 ? (
                <p className="mt-4 text-[13px] text-ink-soft text-center py-4">No payment records found.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {payments.map((p) => (
                    <li key={p.payment_id} className="flex items-center gap-3 bg-muted rounded-xl p-3">
                      <div className="h-10 w-10 rounded-lg bg-surface flex items-center justify-center">
                        <FileText className="h-5 w-5 text-ink" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-extrabold text-ink truncate">
                          {p.payment_method ?? "Payment"} — {p.payment_id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-ink-soft">
                          {new Date(p.payment_date).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-extrabold text-ink">R{p.amount.toLocaleString("en-ZA")}</p>
                        <p className={`text-[10px] font-extrabold uppercase ${PAY_STYLE[p.payment_status]}`}>
                          {p.payment_status}
                        </p>
                      </div>
                      <button
                        onClick={() => toast.success(`Downloading receipt ${p.payment_id.slice(0, 8).toUpperCase()}`)}
                        className="text-ink-soft shrink-0"
                        aria-label="Download receipt"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Payment method placeholder */}
            <section className="bg-surface rounded-2xl p-5 shadow-sm">
              <h3 className="text-[18px] font-extrabold text-ink">Payment Method</h3>
              <p className="mt-3 text-[13px] text-ink-soft">
                To update your payment method, contact SentinelAI support.
              </p>
              <button
                onClick={() => toast("Contact support@sentinelai.global to update your payment method.")}
                className="mt-4 w-full h-12 rounded-xl bg-muted text-[12px] font-extrabold tracking-wider text-ink uppercase flex items-center justify-center gap-2"
              >
                <CreditCard className="h-4 w-4" /> Contact Support
              </button>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

