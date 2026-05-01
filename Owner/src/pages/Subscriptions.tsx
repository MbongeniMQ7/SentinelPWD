import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { TrendingUp, Download, User, Star, Building } from "lucide-react";
import { useState } from "react";

const tiers = [
  { name: "BASIC", price: "R49", accounts: "1,240", Icon: User, accent: "bg-secondary text-primary" },
  { name: "PRO", price: "R199", accounts: "482", Icon: Star, accent: "bg-gold text-gold-foreground", featured: true },
  { name: "ENTERPRISE", price: "R899", accounts: "86", Icon: Building, accent: "bg-primary text-white" },
];

const payments = [
  { i: "A", name: "Apex Logistics Inc.", date: "Oct 12, 2023", amount: "R899.00", plan: "" },
  { i: "V", name: "Velox Systems", date: "Oct 11, 2023", amount: "R199.00", plan: "Pro" },
  { i: "S", name: "Skyline Tech", date: "Oct 10, 2023", amount: "R49.00", plan: "Bas" },
  { i: "L", name: "Lunar Media", date: "Oct 09, 2023", amount: "R199.00", plan: "Pro" },
];

const Subscriptions = () => {
  const [tab, setTab] = useState("ALL");
  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-3 pb-6 space-y-4">
        <div className="rounded-2xl p-6 bg-gradient-hero shadow-card">
          <div className="label-eyebrow text-white/60">MONTHLY RECURRING REVENUE</div>
          <div className="font-display font-bold text-white text-[34px] mt-2">R142,850.00</div>
          <div className="flex items-center gap-1 text-gold font-bold text-sm mt-1"><TrendingUp className="h-4 w-4" />+12.4% vs last month</div>
          <button className="mt-5 bg-gold text-gold-foreground font-bold tracking-wider text-xs px-5 py-3 rounded-xl flex items-center gap-2"><Download className="h-4 w-4" />DOWNLOAD REPORT</button>
        </div>

        {tiers.map(t => (
          <div key={t.name} className={`bg-card text-card-foreground rounded-2xl p-5 shadow-card ${t.featured ? "border-t-4 border-gold" : ""}`}>
            <div className="flex justify-between items-start">
              <span className={`pill ${t.accent}`}>{t.name}</span>
              <t.Icon className={`h-5 w-5 ${t.featured ? "text-gold fill-gold" : "text-primary/60"}`} />
            </div>
            <div className="font-display font-bold text-primary text-[34px] mt-3">{t.price}<span className="text-base text-muted-foreground font-normal">/mo</span></div>
            <div className="border-t border-border mt-4 pt-3"><div className="label-eyebrow">ACTIVE ACCOUNTS</div><div className="font-display font-bold text-primary text-2xl mt-1">{t.accounts}</div></div>
          </div>
        ))}

        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-primary text-2xl">Recent Payment Tracking</h3>
          <p className="text-sm text-muted-foreground">Real-time subscription transaction logs</p>
          <div className="bg-secondary rounded-xl p-1 flex mt-4 text-xs font-bold tracking-wider">
            {["ALL","ACTIVE","EXPIRED","PENDING"].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg ${tab === t ? "bg-white text-primary shadow" : "text-primary/60"}`}>{t}</button>
            ))}
          </div>

          <div className="grid grid-cols-[auto_2fr_2fr_2fr_1fr] gap-2 mt-6 text-[10px] font-bold text-primary/60 tracking-wider">
            <span /><span>NAME</span><span>DATE</span><span>AMOUNT</span><span>PLAN STATUS</span>
          </div>
          <div className="space-y-3 mt-2">
            {payments.map((p, i) => (
              <div key={i} className="grid grid-cols-[auto_2fr_2fr_2fr_1fr] gap-2 items-center pt-3 border-t border-border">
                <div className="h-8 w-8 rounded-md bg-secondary text-primary font-bold text-sm flex items-center justify-center">{p.i}</div>
                <div className="font-display font-bold text-primary text-sm leading-tight">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.date}</div>
                <div className="font-bold text-primary text-sm">{p.amount}</div>
                <div className="text-xs text-primary">{p.plan}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
export default Subscriptions;
