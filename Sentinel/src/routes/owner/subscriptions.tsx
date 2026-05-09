import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { TrendingUp, Download, User, Star, Building } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const TIER_META = [
  { name: "BASIC",      price: "R49",  Icon: User,     accent: "bg-secondary text-primary" },
  { name: "PRO",        price: "R199", Icon: Star,     accent: "bg-gold text-gold-foreground", featured: true },
  { name: "ENTERPRISE", price: "R899", Icon: Building, accent: "bg-primary text-white" },
];

type PaymentRow = {
  payment_id: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  company_name: string;
  plan_name: string;
};

type TierCounts = Record<string, number>;

function fmtZAR(n: number) {
  return `R${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

const Subscriptions = () => {
  const [tab, setTab] = useState("ALL");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [mrr, setMrr] = useState<number | null>(null);
  const [tierCounts, setTierCounts] = useState<TierCounts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Fetch recent payments joined with companies and subscription plans
      const { data: rawPayments } = await supabase
        .from("payments")
        .select(`
          payment_id,
          amount,
          payment_date,
          payment_status,
          companies ( company_name ),
          company_subscriptions (
            subscription_plans ( plan_name )
          )
        `)
        .order("payment_date", { ascending: false })
        .limit(20);

      if (rawPayments) {
        const rows: PaymentRow[] = rawPayments.map((p: Record<string, unknown>) => {
          const co = p.companies as Record<string, string> | null;
          const cs = p.company_subscriptions as Record<string, unknown> | null;
          const sp = cs?.subscription_plans as Record<string, string> | null;
          return {
            payment_id: p.payment_id as string,
            amount: p.amount as number,
            payment_date: p.payment_date as string,
            payment_status: p.payment_status as string,
            company_name: co?.company_name ?? "—",
            plan_name: sp?.plan_name ?? "",
          };
        });
        setPayments(rows);

        // MRR = sum of all PAID payments for current month
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthTotal = rows
          .filter(r => r.payment_status === "PAID" && r.payment_date.startsWith(monthStr))
          .reduce((acc, r) => acc + Number(r.amount), 0);
        // Fall back to total of all PAID if no current-month data
        const totalPaid = rows
          .filter(r => r.payment_status === "PAID")
          .reduce((acc, r) => acc + Number(r.amount), 0);
        setMrr(monthTotal > 0 ? monthTotal : totalPaid > 0 ? totalPaid : null);
      }

      // Active subscription counts grouped by plan name
      const { data: activeSubs } = await supabase
        .from("company_subscriptions")
        .select(`status, subscription_plans ( plan_name )`)
        .eq("status", "ACTIVE");

      if (activeSubs) {
        const counts: TierCounts = {};
        for (const sub of activeSubs as Record<string, unknown>[]) {
          const sp = sub.subscription_plans as Record<string, string> | null;
          const plan = sp?.plan_name?.toUpperCase() ?? "UNKNOWN";
          counts[plan] = (counts[plan] ?? 0) + 1;
        }
        setTierCounts(counts);
      }

      setLoading(false);
    }
    void load();
  }, []);

  const tiers = TIER_META.map(t => ({
    ...t,
    accounts: tierCounts[t.name] != null ? String(tierCounts[t.name]) : loading ? "…" : "0",
  }));
  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-3 pb-6 space-y-4">
        <div className="rounded-2xl p-6 bg-gradient-hero shadow-card">
          <div className="label-eyebrow text-white/60">MONTHLY RECURRING REVENUE</div>
          <div className="font-display font-bold text-white text-[34px] mt-2">
            {loading ? <span className="animate-pulse text-2xl opacity-60">Loading…</span> : mrr != null ? fmtZAR(mrr) : "—"}
          </div>
          <div className="flex items-center gap-1 text-gold font-bold text-sm mt-1">
            <TrendingUp className="h-4 w-4" />
            Live from payment records
          </div>
          <button className="mt-5 bg-gold text-gold-foreground font-bold tracking-wider text-xs px-5 py-3 rounded-xl flex items-center gap-2">
            <Download className="h-4 w-4" />DOWNLOAD REPORT
          </button>
        </div>

        {tiers.map(t => (
          <div key={t.name} className={`bg-card text-card-foreground rounded-2xl p-5 shadow-card ${t.featured ? "border-t-4 border-gold" : ""}`}>
            <div className="flex justify-between items-start">
              <span className={`pill ${t.accent}`}>{t.name}</span>
              <t.Icon className={`h-5 w-5 ${t.featured ? "text-gold fill-gold" : "text-primary/60"}`} />
            </div>
            <div className="font-display font-bold text-primary text-[34px] mt-3">
              {t.price}<span className="text-base text-muted-foreground font-normal">/mo</span>
            </div>
            <div className="border-t border-border mt-4 pt-3">
              <div className="label-eyebrow">ACTIVE ACCOUNTS</div>
              <div className="font-display font-bold text-primary text-2xl mt-1">{t.accounts}</div>
            </div>
          </div>
        ))}

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-primary text-2xl">Recent Payment Tracking</h3>
          <p className="text-sm text-muted-foreground">Real-time subscription transaction logs</p>
          <div className="bg-secondary rounded-xl p-1 flex mt-4 text-xs font-bold tracking-wider">
            {(["ALL", "PAID", "PENDING", "FAILED"] as const).map(s => (
              <button key={s} onClick={() => setTab(s)} className={`flex-1 py-2 rounded-lg ${tab === s ? "bg-white text-primary shadow" : "text-primary/60"}`}>{s}</button>
            ))}
          </div>

          <div className="grid grid-cols-[auto_2fr_2fr_2fr_1fr] gap-2 mt-6 text-[10px] font-bold text-primary/60 tracking-wider">
            <span /><span>COMPANY</span><span>DATE</span><span>AMOUNT</span><span>STATUS</span>
          </div>
          <div className="space-y-3 mt-2">
            {loading ? (
              [1, 2, 3].map(n => (
                <div key={n} className="h-10 rounded-xl bg-secondary animate-pulse" />
              ))
            ) : payments.filter(p => tab === "ALL" || p.payment_status === tab).length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No payment records found.</div>
            ) : (
              payments
                .filter(p => tab === "ALL" || p.payment_status === tab)
                .map(p => (
                  <div key={p.payment_id} className="grid grid-cols-[auto_2fr_2fr_2fr_1fr] gap-2 items-center pt-3 border-t border-border">
                    <div className="h-8 w-8 rounded-md bg-secondary text-primary font-bold text-sm flex items-center justify-center">
                      {p.company_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="font-display font-bold text-primary text-sm leading-tight truncate">{p.company_name}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.payment_date)}</div>
                    <div className="font-bold text-primary text-sm">{fmtZAR(p.amount)}</div>
                    <div className={`text-[10px] font-bold ${
                      p.payment_status === "PAID" ? "text-success" :
                      p.payment_status === "FAILED" ? "text-danger" :
                      "text-warning-foreground"
                    }`}>{p.plan_name || p.payment_status}</div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/subscriptions")({ component: Subscriptions });
