import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { supabase } from "@/lib/supabase";
import { Watch, Search, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type WristbandStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "LOST";

interface Wristband {
  wristband_id: string;
  serial_number: string;
  status: WristbandStatus;
  last_active_at: string | null;
  battery_level: number | null;
  firmware_version: string | null;
  profile: { first_name: string; last_name: string; username: string } | null;
  company: { company_name: string } | null;
}

const STATUS_STYLE: Record<WristbandStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  MAINTENANCE: "bg-yellow-100 text-yellow-700",
  LOST: "bg-red-100 text-red-600",
};

const IoTWristbands = () => {
  const [wristbands, setWristbands] = useState<Wristband[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | WristbandStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ active: 0, inactive: 0, maintenance: 0, lost: 0, total: 0 });

  const fetch = useCallback(async () => {
    setLoading(true);

    const [{ count: active }, { count: inactive }, { count: maintenance }, { count: lost }, { count: total }] =
      await Promise.all([
        supabase.from("iot_wristbands").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
        supabase.from("iot_wristbands").select("*", { count: "exact", head: true }).eq("status", "INACTIVE"),
        supabase.from("iot_wristbands").select("*", { count: "exact", head: true }).eq("status", "MAINTENANCE"),
        supabase.from("iot_wristbands").select("*", { count: "exact", head: true }).eq("status", "LOST"),
        supabase.from("iot_wristbands").select("*", { count: "exact", head: true }),
      ]);
    setCounts({
      active: active ?? 0,
      inactive: inactive ?? 0,
      maintenance: maintenance ?? 0,
      lost: lost ?? 0,
      total: total ?? 0,
    });

    let q = supabase
      .from("iot_wristbands")
      .select(
        `wristband_id, serial_number, status, last_active_at, battery_level, firmware_version,
         profiles!iot_wristbands_employee_profile_id_fkey(first_name, last_name, username),
         companies!iot_wristbands_company_id_fkey(company_name)`
      )
      .order("last_active_at", { ascending: false, nullsFirst: false })
      .limit(200);

    if (filterStatus !== "ALL") q = q.eq("status", filterStatus);

    const { data } = await q;
    let rows: Wristband[] = (data ?? []).map((r: any) => ({
      ...r,
      profile: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles,
      company: Array.isArray(r.companies) ? r.companies[0] ?? null : r.companies,
    }));

    if (search.trim()) {
      const term = search.toLowerCase();
      rows = rows.filter(
        (w) =>
          w.serial_number?.toLowerCase().includes(term) ||
          w.profile?.first_name?.toLowerCase().includes(term) ||
          w.profile?.last_name?.toLowerCase().includes(term) ||
          w.profile?.username?.toLowerCase().includes(term) ||
          w.company?.company_name?.toLowerCase().includes(term)
      );
    }

    setWristbands(rows);
    setLoading(false);
  }, [filterStatus, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const statCards = [
    { label: "Active", value: counts.active, color: "text-green-600" },
    { label: "Inactive", value: counts.inactive, color: "text-muted-foreground" },
    { label: "Maintenance", value: counts.maintenance, color: "text-yellow-600" },
    { label: "Lost", value: counts.lost, color: "text-red-500" },
  ];

  return (
    <AppShell>
      <TopBar title="IoT Wristbands" />
      <div className="px-4 pt-3 pb-24 space-y-4">
        <div>
          <h2 className="font-display text-[26px] font-bold">IoT Wristbands</h2>
          <p className="text-sm text-muted-foreground">
            {counts.active} / {counts.total} devices active
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {statCards.map(({ label, value, color }) => (
            <div key={label} className="bg-card rounded-2xl p-3 shadow-card text-center">
              <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by serial, employee, or company…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card shadow-card text-sm outline-none"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["ALL", "ACTIVE", "INACTIVE", "MAINTENANCE", "LOST"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filterStatus === s ? "bg-primary text-white" : "bg-card text-muted-foreground shadow-card"
              }`}
            >
              {s === "ALL" ? "All" : s}
            </button>
          ))}
          <button
            onClick={fetch}
            className="ml-auto p-2 rounded-xl bg-card shadow-card text-muted-foreground hover:text-primary"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Wristband list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : wristbands.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Watch className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No wristbands found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wristbands.map((w) => {
              const statusStyle = STATUS_STYLE[w.status] ?? "bg-gray-100 text-gray-500";
              return (
                <div key={w.wristband_id} className="bg-card rounded-xl px-4 py-3 shadow-card flex items-center gap-3">
                  <div className="shrink-0">
                    {w.status === "ACTIVE" ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-primary">{w.serial_number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {w.profile
                        ? `${w.profile.first_name} ${w.profile.last_name} (@${w.profile.username})`
                        : "Unassigned"}
                      {w.company && ` · ${w.company.company_name}`}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {w.last_active_at && (
                        <span className="text-[11px] text-muted-foreground">
                          Last seen {formatDistanceToNow(new Date(w.last_active_at), { addSuffix: true })}
                        </span>
                      )}
                      {w.battery_level !== null && (
                        <span
                          className={`text-[11px] font-semibold ${
                            w.battery_level < 20 ? "text-red-500" : w.battery_level < 50 ? "text-yellow-600" : "text-green-600"
                          }`}
                        >
                          🔋 {w.battery_level}%
                        </span>
                      )}
                      {w.firmware_version && (
                        <span className="text-[11px] text-muted-foreground">fw {w.firmware_version}</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 ${statusStyle}`}>
                    {w.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/iot")({ component: IoTWristbands });
