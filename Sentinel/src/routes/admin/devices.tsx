import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { Watch, CloudOff, Wrench, HelpCircle, UserX, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { WristbandStatus } from "@/lib/database.types";

export const Route = createFileRoute("/admin/devices")({
  head: () => ({
    meta: [
      { title: "Device Management â€” SentinelAI Admin" },
      { name: "description", content: "Real-time status tracking and employee assignment for the Sentinel wearable fleet." },
    ],
  }),
  component: DevicesPage,
});

interface Wristband {
  wristband_id: string;
  device_serial_number: string;
  status: WristbandStatus;
  last_active_at: string | null;
  assigned_employee_profile_id: string | null;
  assigneeName?: string;
}

const STATUS_ICON: Record<WristbandStatus, React.ReactNode> = {
  ACTIVE: <Watch className="h-5 w-5 text-green-600" />,
  INACTIVE: <CloudOff className="h-5 w-5 text-ink-soft" />,
  MAINTENANCE: <Wrench className="h-5 w-5 text-warning-foreground" />,
  LOST: <HelpCircle className="h-5 w-5 text-red-500" />,
};

const STATUS_BADGE: Record<WristbandStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-muted text-ink-soft",
  MAINTENANCE: "bg-warning/20 text-warning-foreground",
  LOST: "bg-red-100 text-red-700",
};

function DevicesPage() {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<Wristband[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!profile?.company_id) return;
    setLoading(true);

    const { data: wristbands, error } = await supabase
      .from("iot_wristbands")
      .select("wristband_id, device_serial_number, status, last_active_at, assigned_employee_profile_id")
      .eq("company_id", profile.company_id)
      .order("status");

    if (error) { toast.error("Failed to load devices."); setLoading(false); return; }

    const rows: Wristband[] = wristbands ?? [];

    // Batch-load assigned employee names
    const assignedIds = rows.map((r) => r.assigned_employee_profile_id).filter(Boolean) as string[];
    if (assignedIds.length > 0) {
      const { data: empProfiles } = await supabase
        .from("employee_profiles")
        .select("employee_profile_id, profile_id")
        .in("employee_profile_id", assignedIds);

      const profileIds = (empProfiles ?? []).map((e) => e.profile_id);
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("profile_id, first_name, last_name")
          .in("profile_id", profileIds);

        const nameMap = Object.fromEntries(
          (empProfiles ?? []).map((e) => {
            const p = (profiles ?? []).find((pr) => pr.profile_id === e.profile_id);
            return [e.employee_profile_id, p ? `${p.first_name} ${p.last_name}` : "â€”"];
          })
        );

        rows.forEach((r) => {
          if (r.assigned_employee_profile_id) {
            r.assigneeName = nameMap[r.assigned_employee_profile_id] ?? "â€”";
          }
        });
      }
    }

    setDevices(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  const counts = {
    active: devices.filter((d) => d.status === "ACTIVE").length,
    inactive: devices.filter((d) => d.status === "INACTIVE" || d.status === "LOST").length,
    maintenance: devices.filter((d) => d.status === "MAINTENANCE").length,
  };

  return (
    <AppShell>
      <TopBar
        right={
          <button onClick={load} disabled={loading} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 text-ink ${loading ? "animate-spin" : ""}`} />
          </button>
        }
        showBell
      />
      <div className="px-5 pt-4">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-warning-foreground/70 uppercase">Fleet Oversight</p>
        <h1 className="text-[34px] leading-[1.05] font-extrabold text-ink mt-1">Device Management</h1>
        <p className="mt-3 text-[13px] text-ink-soft">Real-time status tracking for the Sentinel wearable fleet.</p>
      </div>

      <div className="px-5 mt-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-ink-soft" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-16">
            <Watch className="h-10 w-10 text-ink-soft mx-auto mb-3" />
            <p className="text-[15px] font-bold text-ink">No devices registered</p>
            <p className="text-[13px] text-ink-soft mt-1">Wristbands onboarded to this company will appear here.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {devices.map((d) => (
                <div key={d.wristband_id} className="bg-surface rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                      {STATUS_ICON[d.status]}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${STATUS_BADGE[d.status]}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="mt-4 text-[10px] font-extrabold tracking-wider text-ink-soft">DEVICE ID</p>
                  <p className="text-[18px] font-extrabold text-ink">{d.device_serial_number}</p>

                  <div className={`mt-3 p-3 rounded-xl ${d.assigned_employee_profile_id ? "bg-muted" : "bg-muted border border-dashed border-border"}`}>
                    <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">ASSIGNED TO</p>
                    <div className="mt-1 flex items-center gap-2">
                      {d.assigned_employee_profile_id ? (
                        <span className="text-[14px] font-bold text-ink">{d.assigneeName ?? "Employee"}</span>
                      ) : (
                        <><UserX className="h-4 w-4 text-ink-soft" /><span className="text-[14px] font-bold text-ink-soft">Unassigned</span></>
                      )}
                    </div>
                  </div>

                  {d.last_active_at && (
                    <p className="mt-2 text-[11px] text-ink-soft">
                      Last active: {new Date(d.last_active_at).toLocaleString("en-ZA")}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <section className="mt-5 bg-surface rounded-2xl p-4 shadow-sm">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[9px] font-extrabold tracking-wider text-ink-soft uppercase">ACTIVE</p>
                  <p className="mt-1 text-[24px] font-extrabold text-green-600">{counts.active}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[9px] font-extrabold tracking-wider text-ink-soft uppercase">MAINTENANCE</p>
                  <p className="mt-1 text-[24px] font-extrabold text-warning-foreground">{counts.maintenance}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[9px] font-extrabold tracking-wider text-ink-soft uppercase">OFFLINE</p>
                  <p className="mt-1 text-[24px] font-extrabold text-ink-soft">{counts.inactive}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] font-extrabold tracking-wider text-ink-soft uppercase text-center">
                Total: {devices.length} device{devices.length !== 1 ? "s" : ""}
              </p>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
