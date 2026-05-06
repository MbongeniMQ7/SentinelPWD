import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { Search, User, Radio, Eye, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CompanyStatus } from "@/lib/database.types";

interface CompanyRow {
  company_id: string;
  company_name: string;
  industry: string | null;
  status: CompanyStatus;
  contact_email: string | null;
  primary_admin: string | null;
  monitoring_type: string | null;
}

const Companies = () => {
  const nav = useNavigate();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: companyRows, error } = await supabase
        .from("companies")
        .select("company_id, company_name, industry, status, contact_email")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load companies");
        return;
      }

      const enriched: CompanyRow[] = await Promise.all(
        (companyRows ?? []).map(async (c) => {
          const { data: managers } = await supabase
            .from("profiles")
            .select("first_name, last_name, employee_profiles(monitoring_type)")
            .eq("company_id", c.company_id)
            .eq("role", "MANAGER")
            .limit(1);

          const mgr = managers?.[0];
          const adminName = mgr ? `${mgr.first_name} ${mgr.last_name}` : null;

          const { data: epRows } = await supabase
            .from("employee_profiles")
            .select("monitoring_type, profiles!inner(company_id)")
            .eq("profiles.company_id", c.company_id)
            .limit(50);

          let cameraCount = 0;
          let iotCount = 0;
          for (const ep of epRows ?? []) {
            if (ep.monitoring_type === "CAMERA") cameraCount++;
            else if (ep.monitoring_type === "IOT_WRISTBAND") iotCount++;
            else if (ep.monitoring_type === "BOTH") { cameraCount++; iotCount++; }
          }

          let monitoringType = "CAMERA";
          if (cameraCount > 0 && iotCount > 0) monitoringType = "HYBRID";
          else if (iotCount > 0) monitoringType = "IOT";

          return { ...c, primary_admin: adminName, monitoring_type: monitoringType };
        })
      );

      setCompanies(enriched);
    }
    load().finally(() => setLoading(false));
  }, []);

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.company_name.toLowerCase().includes(q) ||
      (c.primary_admin ?? "").toLowerCase().includes(q) ||
      c.company_id.toLowerCase().includes(q);
    const matchesFilter =
      filter === "All" ||
      (filter === "IoT" && c.monitoring_type === "IOT") ||
      (filter === "Biometric" && c.monitoring_type === "CAMERA");
    return matchesSearch && matchesFilter;
  });

  const getMonitoringIcon = (type: string | null) => {
    if (type === "IOT") return Radio;
    if (type === "HYBRID") return Radio;
    return Eye;
  };

  const getMonitoringLabel = (type: string | null) => {
    if (type === "IOT") return "IOT MONITORING";
    if (type === "HYBRID") return "HYBRID MODE";
    return "BIOMETRIC SCANNING";
  };

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4 pb-24">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            placeholder="Search companies, admins, or IDs..."
            className="bg-transparent flex-1 outline-none text-primary placeholder:text-muted-foreground/70"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-4">
          {["All", "IoT", "Biometric"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold ${
                filter === f ? "bg-white text-primary" : "bg-white/15 text-foreground/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading companies…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No companies found.</p>
        ) : (
          <div className="space-y-4 mt-5">
            {filtered.map((c) => {
              const isHybrid = c.monitoring_type === "HYBRID";
              const MonIcon = getMonitoringIcon(c.monitoring_type);
              return (
                <div key={c.company_id} className="bg-card text-card-foreground rounded-2xl p-5 shadow-card">
                  <div className="flex justify-between items-center">
                    <span className="label-eyebrow truncate max-w-[60%]">{c.company_name}</span>
                    <span
                      className={`pill ${
                        c.status === "ACTIVE"
                          ? "bg-gold text-gold-foreground"
                          : "bg-destructive-soft text-destructive"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  {c.industry && (
                    <p className="text-xs text-muted-foreground mt-1">{c.industry}</p>
                  )}
                  <div className="flex items-center gap-3 mt-4">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <User className="h-5 w-5 text-primary/70" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Primary Administrator</div>
                      <div className="font-display font-bold text-primary">
                        {c.primary_admin ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border mt-4 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gold text-[12px] font-bold tracking-wider">
                      {isHybrid ? (
                        <><Radio className="h-4 w-4" /><Eye className="h-4 w-4" /></>
                      ) : (
                        <MonIcon className="h-4 w-4" />
                      )}
                      {getMonitoringLabel(c.monitoring_type)}
                    </div>
                    <button
                      onClick={() => nav({ to: "/owner/company/$id", params: { id: c.company_id } })}
                      className="text-primary text-sm font-semibold underline underline-offset-4 decoration-gold"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => nav({ to: "/owner/companies/new" })}
          className="fixed bottom-24 right-6 h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-card"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/companies/")({ component: Companies });
