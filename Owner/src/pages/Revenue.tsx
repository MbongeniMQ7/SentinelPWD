import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { Banknote, TrendingUp, Building, AlertCircle, Zap, ArrowRight } from "lucide-react";

const Revenue = () => (
  <AppShell>
    <TopBar />
    <div className="px-5 pt-3 pb-6 space-y-4">
      <div className="label-eyebrow text-foreground/60">PERFORMANCE OVERVIEW</div>
      <h2 className="font-display text-[34px] leading-[1.1] font-bold">Revenue & Analytics</h2>
      <p className="text-foreground/70 text-[15px]">Precision insights into global earnings and company growth metrics. Data updated in real-time through the SentinelAI core.</p>

      <div className="stat-card">
        <div className="flex justify-between items-start"><span className="label-eyebrow">MONTHLY EARNINGS</span><Banknote className="h-5 w-5 text-primary/70" /></div>
        <div className="font-display font-bold text-primary text-[34px] mt-3">R142,850.00</div>
        <span className="pill bg-gold text-gold-foreground mt-2">+12.4%</span>
        <span className="text-xs text-muted-foreground ml-2">vs last month</span>
      </div>

      <div className="stat-card">
        <div className="flex justify-between items-start"><span className="label-eyebrow">GROWTH RATE</span><TrendingUp className="h-5 w-5 text-primary/70" /></div>
        <div className="font-display font-bold text-primary text-[34px] mt-3">8.2%</div>
        <div className="mt-2"><span className="pill bg-secondary text-primary">STABLE</span><span className="text-xs text-muted-foreground ml-2">Annualized projections</span></div>
      </div>

      <div className="stat-card">
        <div className="flex justify-between items-start"><span className="label-eyebrow">MARKET PRESENCE</span><Building className="h-5 w-5 text-gold" /></div>
        <div className="flex items-end justify-between mt-3">
          <div><div className="font-display font-bold text-primary text-[34px]">1,204</div><div className="label-eyebrow">ACTIVE COMPANIES</div></div>
          <div className="text-right"><div className="font-display font-bold text-primary text-2xl">42</div><div className="label-eyebrow">INACTIVE</div></div>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-primary text-xl">Revenue Trends</h3>
            <p className="text-xs text-muted-foreground mt-1">6-month fiscal trajectory</p>
          </div>
          <div className="flex gap-2">
            <button className="bg-secondary text-primary text-[10px] font-bold px-3 py-2 rounded-lg leading-tight">EXPORT<br />CSV</button>
            <button className="bg-primary text-white text-[10px] font-bold px-3 py-2 rounded-lg">FILTER</button>
          </div>
        </div>
        <div className="mt-5 h-40 relative">
          <svg viewBox="0 0 300 120" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(220 16% 80%)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(220 16% 95%)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,90 C30,80 50,60 80,55 C110,50 130,90 160,75 C190,60 210,40 240,55 C270,70 285,15 300,20 L300,120 L0,120 Z" fill="url(#rev)" />
            <path d="M0,90 C30,80 50,60 80,55 C110,50 130,90 160,75 C190,60 210,40 240,55 C270,70 285,15 300,20" fill="none" stroke="hsl(220 14% 70%)" strokeWidth="1.5" />
            {[[20, 88],[80, 55],[160, 75],[240, 55],[300, 20]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="4" fill="hsl(var(--gold))" />
            ))}
          </svg>
        </div>
        <div className="grid grid-cols-6 text-[10px] font-bold text-primary/60 tracking-wider text-center">
          {["JAN","FEB","MAR","APR","MAY","JUN"].map(m => <span key={m}>{m}</span>)}
        </div>
        <div className="border-t border-border mt-4 pt-3 grid grid-cols-2 gap-2">
          <div><div className="label-eyebrow">PEAK REVENUE</div><div className="font-display font-bold text-primary text-lg">R182,400</div></div>
          <div><div className="label-eyebrow">AVG. RETENTION</div></div>
          <div><div className="label-eyebrow">LTV (AVG)</div><div className="font-display font-bold text-primary text-lg">R2,450</div></div>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="font-display font-bold text-primary text-xl">Quarterly Target</h3>
        <div className="flex justify-between items-end mt-4"><span className="label-eyebrow">PROGRESS</span><span className="font-display font-bold text-primary text-2xl">78%</span></div>
        <div className="h-1.5 bg-secondary rounded-full mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-gold to-primary" style={{ width: "78%" }} /></div>
        <p className="text-sm text-primary/70 mt-3">System is on track to exceed Q3 benchmarks by 4.2%. Optimization of subscription tiers recommended for Q4.</p>
        <button className="mt-3 text-gold text-xs font-bold tracking-wider flex items-center gap-1">FULL REPORT <ArrowRight className="h-3 w-3" /></button>
      </div>

      <div className="stat-card">
        <div className="label-eyebrow">CRITICAL ALERTS</div>
        <div className="mt-3 space-y-3">
          <div className="flex gap-3"><AlertCircle className="h-5 w-5 text-destructive shrink-0" /><div><div className="font-bold text-primary text-sm">Churn Spike Detection</div><div className="text-xs text-muted-foreground">3 companies in 'Industrial' sector pending cancellation.</div></div></div>
          <div className="flex gap-3"><Zap className="h-5 w-5 text-gold shrink-0" /><div><div className="font-bold text-primary text-sm">New Market Expansion</div><div className="text-xs text-muted-foreground">High demand detected in EU-West zone for Sentinel Core.</div></div></div>
        </div>
      </div>
    </div>
  </AppShell>
);
export default Revenue;
