import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Banknote, TrendingUp, Building, AlertCircle, Zap, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface RevenueData {
  monthlyRevenue: number;
  prevMonthRevenue: number;
  totalCompanies: number;
  activeCompanies: number;
  sixMonthRevenue: number[];
}

const fmtRand = (n: number) =>
  `R${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Revenue = () => {
  const [data, setData] = useState<RevenueData | null>(null);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];

      const [
        { data: currPayments },
        { data: prevPayments },
        { count: totalCompanies },
        { count: activeCompanies },
      ] = await Promise.all([
        supabase.from("payments").select("amount").eq("payment_status", "PAID").gte("payment_date", monthStart).lt("payment_date", monthEnd),
        supabase.from("payments").select("amount").eq("payment_status", "PAID").gte("payment_date", prevMonthStart).lt("payment_date", monthStart),
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
      ]);

      // Build 6-month revenue array
      const sixMonthRevenue: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().split("T")[0];
        const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).toISOString().split("T")[0];
        const { data: mp } = await supabase
          .from("payments")
          .select("amount")
          .eq("payment_status", "PAID")
          .gte("payment_date", mStart)
          .lt("payment_date", mEnd);
        sixMonthRevenue.push((mp ?? []).reduce((s, p) => s + Number(p.amount), 0));
      }

      const monthlyRevenue = (currPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const prevMonthRevenue = (prevPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);

      setData({
        monthlyRevenue,
        prevMonthRevenue,
        totalCompanies: totalCompanies ?? 0,
        activeCompanies: activeCompanies ?? 0,
        sixMonthRevenue,
      });
    }
    load().catch(() => toast.error("Failed to load revenue data"));
  }, []);

  const growthPct = data && data.prevMonthRevenue > 0
    ? (((data.monthlyRevenue - data.prevMonthRevenue) / data.prevMonthRevenue) * 100).toFixed(1)
    : null;

  const maxRevenue = data ? Math.max(...data.sixMonthRevenue, 1) : 1;
  const monthLabels = (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return d.toLocaleString("en", { month: "short" }).toUpperCase();
    });
  })();

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-3 pb-6 space-y-4">
        <div className="label-eyebrow text-foreground/60">PERFORMANCE OVERVIEW</div>
        <h2 className="font-display text-[34px] leading-[1.1] font-bold">Revenue &amp; Analytics</h2>
        <p className="text-foreground/70 text-[15px]">Precision insights into global earnings and company growth metrics. Data updated in real-time through the SentinelAI core.</p>

        <div className="stat-card">
          <div className="flex justify-between items-start"><span className="label-eyebrow">MONTHLY EARNINGS</span><Banknote className="h-5 w-5 text-primary/70" /></div>
          <div className="font-display font-bold text-primary text-[34px] mt-3">
            {data ? fmtRand(data.monthlyRevenue) : "—"}
          </div>
          {growthPct !== null && (
            <>
              <span className={`pill mt-2 ${Number(growthPct) >= 0 ? "bg-gold text-gold-foreground" : "bg-destructive-soft text-destructive"}`}>
                {Number(growthPct) >= 0 ? "+" : ""}{growthPct}%
              </span>
              <span className="text-xs text-muted-foreground ml-2">vs last month</span>
            </>
          )}
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start"><span className="label-eyebrow">GROWTH RATE</span><TrendingUp className="h-5 w-5 text-primary/70" /></div>
          <div className="font-display font-bold text-primary text-[34px] mt-3">
            {growthPct !== null ? `${growthPct}%` : "—"}
          </div>
          <div className="mt-2">
            <span className={`pill ${growthPct !== null && Number(growthPct) >= 0 ? "bg-secondary text-primary" : "bg-destructive-soft text-destructive"}`}>
              {growthPct !== null && Number(growthPct) >= 0 ? "GROWING" : "DECLINING"}
            </span>
            <span className="text-xs text-muted-foreground ml-2">Month-over-month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start"><span className="label-eyebrow">MARKET PRESENCE</span><Building className="h-5 w-5 text-gold" /></div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="font-display font-bold text-primary text-[34px]">{data?.activeCompanies ?? "—"}</div>
              <div className="label-eyebrow">ACTIVE COMPANIES</div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-primary text-2xl">{data ? data.totalCompanies - data.activeCompanies : "—"}</div>
              <div className="label-eyebrow">INACTIVE</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-primary text-xl">Revenue Trends</h3>
              <p className="text-xs text-muted-foreground mt-1">6-month fiscal trajectory</p>
            </div>
          </div>
          <div className="mt-5 h-40 flex items-end gap-2">
            {(data?.sixMonthRevenue ?? Array(6).fill(0)).map((rev, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-secondary transition-all"
                style={{ height: `${Math.round((rev / maxRevenue) * 100)}%`, minHeight: rev > 0 ? "4px" : "0" }}
              />
            ))}
          </div>
          <div className="grid grid-cols-6 mt-2 text-[10px] font-bold text-primary/60 tracking-wider text-center">
            {monthLabels.map((m) => <span key={m}>{m}</span>)}
          </div>
          <div className="border-t border-border mt-4 pt-3 grid grid-cols-2 gap-2">
            <div>
              <div className="label-eyebrow">PEAK REVENUE</div>
              <div className="font-display font-bold text-primary text-lg">
                {data ? fmtRand(Math.max(...data.sixMonthRevenue)) : "—"}
              </div>
            </div>
            <div>
              <div className="label-eyebrow">PREV MONTH</div>
              <div className="font-display font-bold text-primary text-lg">
                {data ? fmtRand(data.prevMonthRevenue) : "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="label-eyebrow">SYSTEM NOTICES</div>
          <div className="mt-3 space-y-3">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <div className="font-bold text-primary text-sm">Monitor Subscription Expiries</div>
                <div className="text-xs text-muted-foreground">Check for companies with approaching end dates.</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Zap className="h-5 w-5 text-gold shrink-0" />
              <div>
                <div className="font-bold text-primary text-sm">Revenue Growth Active</div>
                <div className="text-xs text-muted-foreground">Payment inflow is being tracked in real-time.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/revenue")({ component: Revenue });
