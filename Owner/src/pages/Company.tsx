import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { MapPin, Award, Users, Fingerprint, Router, Radio, Video, AlertTriangle, Plus } from "lucide-react";

const Company = () => (
  <AppShell>
    <TopBar />
    <div className="px-5 pt-3 pb-6 space-y-5">
      <div>
        <div className="flex gap-2">
          <span className="pill bg-success/20 text-success">ACTIVE PARTNER</span>
          <span className="pill bg-secondary text-primary/80">ID: SENT-9920</span>
        </div>
        <h2 className="font-display text-[28px] leading-tight font-bold mt-3">Aetheria Logistic Ltd</h2>
        <p className="text-foreground/70 text-sm flex items-center gap-1 mt-1"><MapPin className="h-4 w-4 text-gold" />Johannesburg, South Africa</p>
        <div className="flex gap-3 mt-4">
          <button className="flex-1 bg-gold/30 text-primary font-bold tracking-wider text-xs py-3 rounded-xl">GENERATE REPORT</button>
          <button className="flex-1 border border-gold/40 text-foreground font-bold tracking-wider text-xs py-3 rounded-xl">EDIT PROFILE</button>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card space-y-4">
        <div className="label-eyebrow">COMPANY INFORMATION</div>
        <div>
          <div className="label-eyebrow">LEAD ADMINISTRATOR</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">SM</div>
            <span className="font-display font-bold text-primary">Sarah Mitchell</span>
          </div>
        </div>
        <div><div className="label-eyebrow">CONTACT EMAIL</div><div className="font-semibold text-primary mt-1">s.mitchell@aetheria.io</div></div>
        <div><div className="label-eyebrow">DATE JOINED</div><div className="font-semibold text-primary mt-1">January 14, 2026</div></div>
        <div className="border-t border-border pt-4 bg-card-muted -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl">
          <div className="label-eyebrow">CURRENT PLAN</div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-display font-bold text-primary text-lg">Enterprise Tier</span>
            <Award className="h-5 w-5 text-gold" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center"><Users className="h-6 w-6 text-primary" /></div>
          <div><div className="label-eyebrow">EMPLOYEE COUNT</div><div className="font-display font-bold text-primary text-2xl">250</div></div>
        </div>
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center"><Fingerprint className="h-6 w-6 text-primary" /></div>
          <div><div className="label-eyebrow">MONITORING MODE</div><div className="font-display font-bold text-primary text-2xl">Biometric</div></div>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-card">
        <div className="flex justify-between items-start">
          <div>
            <div className="label-eyebrow">ACTIVITY OVERVIEW</div>
            <h3 className="font-display font-bold text-primary text-xl mt-1">System Usage (7 Days)</h3>
          </div>
          <div className="text-right"><div className="text-gold font-bold">+12.5%</div><div className="label-eyebrow">VS LAST WEEK</div></div>
        </div>
        <div className="h-40 flex items-end gap-2 mt-5">
          {[55, 60, 80, 70, 35, 50, 75].map((h, i) => (
            <div key={i} className={`flex-1 rounded-t ${i === 6 ? "bg-gold" : "bg-primary"}`} style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-7 mt-2 text-[10px] font-bold text-primary/60 tracking-wider text-center">
          {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => <span key={d}>{d}</span>)}
        </div>
      </div>

      <div className="bg-card-muted text-card-foreground rounded-2xl p-5">
        <div className="label-eyebrow">DEVICE STATUS</div>
        <h3 className="font-display font-bold text-primary text-xl mt-1">Active Infrastructure Summary</h3>
        <button className="text-gold text-xs font-bold tracking-wider mt-1 underline underline-offset-4">MANAGE ALL DEVICES</button>

        <div className="space-y-3 mt-4">
          {[
            { Icon: Router, name: "Main Gateway", status: "Operational", bar: 92, color: "bg-gold", label: "92% SIGNAL" },
            { Icon: Radio, name: "Bio-Sensor Unit 04", status: "Standby", bar: 45, color: "bg-blue-400", label: "45% CAPACITY" },
            { Icon: Video, name: "Sentinel Cam 01", status: "Streaming", bar: 100, color: "bg-gold", label: "UPTIME: 14D" },
            { Icon: AlertTriangle, name: "Archive Node", status: "Error", bar: 20, color: "bg-destructive", label: "ACTION REQUIRED", danger: true },
          ].map((d, i) => (
            <div key={i} className="bg-white rounded-xl p-4">
              <d.Icon className={`h-5 w-5 ${d.danger ? "text-destructive" : "text-primary/70"}`} />
              <div className="font-display font-bold text-primary mt-2">{d.name}</div>
              <div className="text-xs text-muted-foreground">Status: {d.status}</div>
              <div className="h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
                <div className={`h-full ${d.color}`} style={{ width: `${d.bar}%` }} />
              </div>
              <div className={`text-[10px] font-bold tracking-wider mt-1 ${d.danger ? "text-destructive" : "text-primary/60"}`}>{d.label}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button className="mt-3 h-10 w-10 rounded-xl bg-white shadow flex items-center justify-center"><Plus className="h-5 w-5 text-primary" /></button>
        </div>
      </div>
    </div>
  </AppShell>
);
export default Company;
