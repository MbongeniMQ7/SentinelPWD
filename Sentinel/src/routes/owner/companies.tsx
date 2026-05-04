import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Search, User, Radio, Eye, Plus } from "lucide-react";


const companies = [
  { id: "SN-9021", admin: "John Smith", mode: "IOT MONITORING", icon: Radio, status: "ACTIVE" },
  { id: "SN-4420", admin: "Elena Rodriguez", mode: "BIOMETRIC SCANNING", icon: Eye, status: "ACTIVE" },
  { id: "SN-1182", admin: "Marcus Thorne", mode: "IOT MONITORING", icon: Radio, status: "EXPIRED" },
  { id: "SN-3005", admin: "Sarah Chen", mode: "HYBRID MODE", icon: Radio, status: "ACTIVE", hybrid: true },
];

const Companies = () => {
  const nav = useNavigate();
  const [filter, setFilter] = useState("All");
  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input placeholder="Search companies, admins, or IDs..." className="bg-transparent flex-1 outline-none text-primary placeholder:text-muted-foreground/70" />
        </div>

        <div className="flex gap-3 mt-4">
          {["All", "IoT", "Biometric"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold ${
                filter === f ? "bg-white text-primary" : "bg-white/15 text-foreground/80"
              }`}>{f}</button>
          ))}
        </div>

        <div className="space-y-4 mt-5">
          {companies.map(c => (
            <div key={c.id} className="bg-card text-card-foreground rounded-2xl p-5 shadow-card">
              <div className="flex justify-between items-center">
                <span className="label-eyebrow">COMPANY ID: {c.id}</span>
                <span className={`pill ${c.status === "ACTIVE" ? "bg-gold text-gold-foreground" : "bg-destructive-soft text-destructive"}`}>{c.status}</span>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center"><User className="h-5 w-5 text-primary/70" /></div>
                <div>
                  <div className="text-xs text-muted-foreground">Primary Administrator</div>
                  <div className="font-display font-bold text-primary">{c.admin}</div>
                </div>
              </div>
              <div className="border-t border-border mt-4 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gold text-[12px] font-bold tracking-wider">
                  {c.hybrid ? <><Radio className="h-4 w-4" /><Eye className="h-4 w-4" /></> : <c.icon className="h-4 w-4" />}
                  {c.mode}
                </div>
                <button onClick={() => nav({ to: "/owner/company/aetheria" })} className="text-primary text-sm font-semibold underline underline-offset-4 decoration-gold">View Details</button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => nav({ to: "/owner/companies/new" })} className="fixed bottom-24 right-6 h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-card">
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/companies")({ component: Companies });
