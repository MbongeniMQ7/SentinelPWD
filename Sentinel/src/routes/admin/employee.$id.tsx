import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/admin/layout/AppShell";
import { ArrowLeft, Camera, Watch, Loader2, AlertTriangle, Bell } from "lucide-react";
import { StatusBadge } from "@/components/admin/sentinel/StatusBadge";
import { supabase } from "@/lib/supabase";
import type { RiskLevel, AlertType } from "@/lib/database.types";

export const Route = createFileRoute("/admin/employee/$id")({
  head: () => ({
    meta: [
      { title: "Employee Details â€” SentinelAI Admin" },
      { name: "description", content: "Detailed personnel biometrics, risk trend analysis, and IoT device performance." },
    ],
  }),
  component: EmployeeDetails,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6">
        <p>{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }}>Retry</button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">Employee not found</div>,
});

interface EmployeeData {
  profile_id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  status: string;
  employee_profiles: {
    employee_profile_id: string;
    department: string | null;
    job_title: string | null;
    monitoring_type: string;
    is_monitoring_enabled: boolean;
  } | null;
}

interface AlertRow {
  alert_id: string;
  alert_type: AlertType;
  risk_level: RiskLevel;
  alert_message: string;
  fatigue_score: number | null;
  created_at: string;
}

const RISK_BADGE: Record<RiskLevel, { variant: "success" | "warning" | "critical"; label: string }> = {
  LOW: { variant: "success", label: "Low Risk" },
  MODERATE: { variant: "warning", label: "Moderate Risk" },
  HIGH: { variant: "critical", label: "High Risk" },
};

function EmployeeDetails() {
  const { id } = Route.useParams();
  const [emp, setEmp] = useState<EmployeeData | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(`
          profile_id, first_name, last_name, username, email, status,
          employee_profiles(employee_profile_id, department, job_title, monitoring_type, is_monitoring_enabled)
        `)
        .eq("profile_id", id)
        .eq("role", "EMPLOYEE")
        .maybeSingle();

      if (error || !profile) { setNotFound(true); setLoading(false); return; }

      setEmp(profile as unknown as EmployeeData);

      const empProfileId = (profile as unknown as EmployeeData).employee_profiles?.employee_profile_id;
      if (empProfileId) {
        const { data: alertData } = await supabase
          .from("risk_alerts")
          .select("alert_id, alert_type, risk_level, alert_message, fatigue_score, created_at")
          .eq("employee_profile_id", empProfileId)
          .order("created_at", { ascending: false })
          .limit(8);
        setAlerts((alertData as AlertRow[]) ?? []);
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-ink-soft" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !emp) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center">
          <p className="text-[18px] font-bold text-ink">Employee not found</p>
          <Link to="/admin/workforce" className="mt-4 inline-flex items-center text-[13px] text-ink-soft underline">â† Back to Workforce</Link>
        </div>
      </AppShell>
    );
  }

  const ep = emp.employee_profiles;
  const monType = ep?.monitoring_type ?? "CAMERA";
  const initials = `${emp.first_name[0] ?? ""}${emp.last_name[0] ?? ""}`.toUpperCase();
  const latestAlert = alerts[0];

  return (
    <AppShell>
      <header className="sticky top-0 z-40 bg-surface border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/admin/workforce" className="p-2 -ml-2 text-ink"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-[15px] font-bold text-ink">Employee Details</h1>
          <button onClick={() => toast("Notifications coming soon")} className="p-2 -mr-2 text-ink" aria-label="Alerts"><Bell className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="px-5 mt-5 space-y-5 pb-24">
        {/* Profile card */}
        <section className="relative bg-surface rounded-2xl p-5 shadow-sm overflow-hidden">
          <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-warning/20" />
          <div className="relative flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center text-[32px] font-extrabold text-primary ring-4 ring-surface">
              {initials}
            </div>
            <h2 className="mt-4 text-[26px] font-extrabold text-ink leading-tight">
              {emp.first_name} {emp.last_name}
            </h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              {ep?.job_title ?? "Employee"}{ep?.department ? ` â€¢ ${ep.department}` : ""}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-soft">@{emp.username} â€¢ {emp.email}</p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-extrabold tracking-wider text-ink uppercase">
                {emp.status}
              </span>
              <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-extrabold tracking-wider text-ink uppercase flex items-center gap-1">
                {monType === "CAMERA" || monType === "BOTH" ? <Camera className="h-3 w-3" /> : null}
                {monType === "IOT_WRISTBAND" || monType === "BOTH" ? <Watch className="h-3 w-3" /> : null}
                {monType.replace("_", " ")}
              </span>
              {ep?.is_monitoring_enabled ? (
                <span className="px-3 py-1 rounded-full bg-green-100 text-[10px] font-extrabold tracking-wider text-green-700 uppercase">â— Monitoring On</span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-red-100 text-[10px] font-extrabold tracking-wider text-red-600 uppercase">Monitoring Off</span>
              )}
            </div>

            {latestAlert && (
              <div className="mt-5 w-full border-t border-border pt-5">
                <p className="text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase mb-2">Latest Risk Signal</p>
                <div className="bg-muted rounded-xl p-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-extrabold text-ink">{latestAlert.alert_type.replace(/_/g, " ")}</p>
                    <StatusBadge variant={RISK_BADGE[latestAlert.risk_level].variant}>
                      {RISK_BADGE[latestAlert.risk_level].label}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[12px] text-ink-soft">{latestAlert.alert_message}</p>
                  {latestAlert.fatigue_score !== null && (
                    <p className="mt-1 text-[11px] text-ink-soft">Fatigue: {latestAlert.fatigue_score}%</p>
                  )}
                  <p className="mt-1 text-[10px] text-ink-soft">{new Date(latestAlert.created_at).toLocaleString("en-ZA")}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Alert history */}
        <section className="bg-surface rounded-2xl p-5 shadow-sm">
          <h3 className="text-[14px] font-extrabold tracking-wider text-ink uppercase">Alert History</h3>
          {alerts.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-soft text-center py-4">No alerts recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {alerts.map((a) => (
                <li key={a.alert_id} className="flex items-start gap-3 p-3 bg-muted rounded-xl">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    a.risk_level === "HIGH" ? "bg-red-100" : a.risk_level === "MODERATE" ? "bg-warning/20" : "bg-muted border border-border"
                  }`}>
                    <AlertTriangle className={`h-4 w-4 ${a.risk_level === "HIGH" ? "text-red-600" : a.risk_level === "MODERATE" ? "text-warning-foreground" : "text-ink-soft"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold text-ink">{a.alert_type.replace(/_/g, " ")}</p>
                    <p className="text-[12px] text-ink-soft truncate">{a.alert_message}</p>
                    <p className="text-[10px] text-ink-soft mt-0.5">{new Date(a.created_at).toLocaleString("en-ZA")}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-extrabold tracking-wider uppercase ${
                    a.risk_level === "HIGH" ? "text-red-600" : a.risk_level === "MODERATE" ? "text-warning-foreground" : "text-green-600"
                  }`}>
                    {a.risk_level}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
