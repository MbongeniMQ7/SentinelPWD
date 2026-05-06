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
      { title: "Employee Details — SentinelAI Admin" },
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
          <Link to="/admin/workforce" className="mt-4 inline-flex items-center text-[13px] text-ink-soft underline">← Back to Workforce</Link>
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
              {ep?.job_title ?? "Employee"}{ep?.department ? ` • ${ep.department}` : ""}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-soft">@{emp.username} • {emp.email}</p>

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
                <span className="px-3 py-1 rounded-full bg-green-100 text-[10px] font-extrabold tracking-wider text-green-700 uppercase">● Monitoring On</span>
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
    meta: [
      { title: "Employee Details — SentinelAI Admin" },
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

function EmployeeDetails() {
  const [range, setRange] = useState<"1H" | "12H" | "24H">("12H");
  return (
    <AppShell>
      <header className="sticky top-0 z-40 bg-surface border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/admin/workforce" className="p-2 -ml-2 text-ink"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-[15px] font-bold text-ink">Employee Details</h1>
          <button onClick={() => toast("Search coming soon")} className="p-2 -mr-2 text-ink" aria-label="Search"><Search className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="px-5 mt-5 space-y-5">
        <section className="relative bg-surface rounded-2xl p-5 shadow-sm overflow-hidden">
          <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-warning/20" />
          <div className="relative flex flex-col items-center text-center">
            <img src={martin} width={96} height={96} loading="lazy" alt="Martin Smith" className="h-24 w-24 rounded-2xl object-cover ring-4 ring-surface" />
            <h2 className="mt-4 text-[26px] font-extrabold text-ink leading-tight">Martin Smith</h2>
            <p className="mt-1 text-[13px] text-ink-soft">Senior Operations Technician • ID: SEN-9942</p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-extrabold tracking-wider text-ink uppercase">Zone 4: Logistics</span>
              <span className="px-3 py-1 rounded-full bg-muted text-[10px] font-extrabold tracking-wider text-ink uppercase">Shift B: Night</span>
              <span className="px-3 py-1 rounded-full bg-info-soft text-[10px] font-extrabold tracking-wider text-ink uppercase">⊙ Active Status</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 w-full text-left">
              <div>
                <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">ACTIVE DEVICE</p>
                <p className="mt-1 text-[14px] font-bold text-ink">Sentinel Band V3</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">CONNECTIVITY</p>
                <p className="mt-1 text-[14px] font-bold text-success flex items-center gap-1">● 98% Stable</p>
              </div>
            </div>

            <div className="mt-6 w-full border-t border-border pt-5 flex flex-col items-center">
              <p className="text-[11px] font-extrabold tracking-[0.18em] text-ink-soft uppercase">Real-Time Fatigue Score</p>
              <Donut72 />
              <button
                onClick={() => toast("Mandatory 15m break recommended")}
                className="mt-4 px-5 h-10 rounded-full bg-warning text-[11px] font-extrabold tracking-wider text-ink uppercase"
              >
                Moderate Risk Warning
              </button>
              <p className="mt-3 text-[11px] text-ink-soft">Threshold exceeded: Recommendation – Mandatory 15m Break.</p>
            </div>
          </div>
        </section>

        <section className="bg-surface rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[18px] font-extrabold text-ink">Risk Trend Analysis</h3>
              <p className="mt-1 text-[10px] font-extrabold tracking-wider text-ink-soft">PAST 12 HOURS PERFORMANCE</p>
            </div>
            <div className="flex gap-1">
              {(["1H", "12H", "24H"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                    range === r ? "bg-primary text-primary-foreground" : "bg-muted text-ink hover:bg-muted/70"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 relative h-44">
            <svg viewBox="0 0 320 160" className="w-full h-full">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.83 0.17 85)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="oklch(0.83 0.17 85)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[30, 70, 110].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="oklch(0.92 0.01 250)" strokeDasharray="2 4" />)}
              <path d="M0,130 L40,125 L80,118 L120,110 L160,90 L200,72 L240,55 L280,40 L320,30" fill="none" stroke="oklch(0.55 0.13 75)" strokeWidth="2.5" />
              <path d="M0,130 L40,125 L80,118 L120,110 L160,90 L200,72 L240,55 L280,40 L320,30 L320,160 L0,160 Z" fill="url(#grad)" />
              <line x1="200" x2="200" y1="0" y2="160" stroke="oklch(0.85 0.02 250)" strokeDasharray="3 3" />
              <circle cx="200" cy="72" r="4" fill="oklch(0.18 0.035 260)" />
            </svg>
            <div className="absolute top-3 left-[55%] bg-primary text-primary-foreground text-[11px] font-bold px-2 py-1 rounded-md">
              22:45
              <div className="text-warning text-[10px]">64% Risk</div>
            </div>
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-bold text-ink-soft">
            <span>18:00</span><span>20:00</span><span>22:00</span><span>00:00</span><span>02:00</span><span>04:00</span><span>06:00 (CURRENT)</span>
          </div>
        </section>

        <section className="bg-surface-muted rounded-2xl p-5 shadow-sm">
          <h3 className="text-[14px] font-extrabold tracking-wider text-ink uppercase">Alert History</h3>
          <ul className="mt-4 space-y-3">
            <AlertItem icon={<AlertTriangle className="h-4 w-4 text-critical" />} bg="bg-critical/10" title="Micro-sleep Detected" meta="04:12 AM • Zone 4 Platform" tag={<span className="text-[10px] font-extrabold tracking-wider text-critical">CRITICAL ACTION TAKEN</span>} />
            <AlertItem icon={<AlertOctagon className="h-4 w-4 text-warning-foreground" />} bg="bg-warning/30" title="Heart Rate Spike" meta="02:30 AM • Loading Bay" tag={<span className="text-[10px] font-extrabold tracking-wider text-warning-foreground underline">FOLLOW-UP REQUIRED</span>} />
            <AlertItem icon={<BellOff className="h-4 w-4 text-ink-soft" />} bg="bg-muted" title="Device Disconnect" meta="11:15 PM • Break Room" />
          </ul>
          <button
            onClick={() => toast.success("Generating full incident report…")}
            className="mt-5 w-full h-11 rounded-xl bg-muted text-[12px] font-extrabold tracking-wider text-ink uppercase"
          >
            Download Full Incident Report
          </button>
        </section>

        <section className="bg-surface rounded-2xl p-5 shadow-sm">
          <h3 className="text-[12px] font-extrabold tracking-wider text-ink uppercase flex items-center gap-2"><Wifi className="h-4 w-4" /> IoT Performance Metrics</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="AVERAGE HEART RATE" value="82 BPM" sub="Stable Condition" subColor="text-success" stripeColor="bg-success" />
            <Metric label="BLOOD PRESSURE (EST.)" value="134/88 mmHg" sub="Elevated: Monitor" subColor="text-warning-foreground" stripeColor="bg-warning" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="DEVICE ID" value="SN-66782-XQ" />
            <Metric label="BATTERY LIFE" value="84%" bar />
          </div>
        </section>

        <section className="bg-surface rounded-2xl p-5 shadow-sm">
          <h3 className="text-[12px] font-extrabold tracking-wider text-ink uppercase flex items-center gap-2"><Eye className="h-4 w-4" /> Biometric Cognition</h3>
          <div className="mt-4 space-y-4">
            <BioBar label="FOCUS LEVEL" value="42%" pct={42} color="bg-warning" />
            <BioBar label="BLINK RATE PATTERN" value="Critical High" pct={88} color="bg-critical" tone="critical-soft" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div>
              <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">HEAD POSITION</p>
              <p className="mt-1 text-[13px] font-bold text-ink">Downward Tilt Trend</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">SACCADE FREQUENCY</p>
              <p className="mt-1 text-[13px] font-bold text-ink">Sub-optimal</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Donut72() {
  const r = 56, c = 2 * Math.PI * r, pct = 0.72;
  return (
    <div className="relative h-40 w-40 mt-3">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="oklch(0.94 0.01 250)" strokeWidth="12" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="oklch(0.83 0.17 85)" strokeWidth="12" strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[34px] font-extrabold text-ink">72%</span>
      </div>
    </div>
  );
}

function AlertItem({ icon, bg, title, meta, tag }: { icon: React.ReactNode; bg: string; title: string; meta: string; tag?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 p-3 bg-surface rounded-xl">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-[14px] font-extrabold text-ink">{title}</p>
        <p className="text-[12px] text-ink-soft">{meta}</p>
        {tag && <div className="mt-1">{tag}</div>}
      </div>
    </li>
  );
}

function Metric({ label, value, sub, subColor, stripeColor, bar }: { label: string; value: string; sub?: string; subColor?: string; stripeColor?: string; bar?: boolean }) {
  return (
    <div className={`relative bg-surface-muted rounded-xl p-3 overflow-hidden ${stripeColor ? "before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-r-full before:" + stripeColor : ""}`}>
      <p className="text-[10px] font-extrabold tracking-wider text-ink-soft">{label}</p>
      <p className="mt-1 text-[18px] font-extrabold text-ink">{value}</p>
      {sub && <p className={`text-[11px] font-bold ${subColor || "text-ink-soft"}`}>{sub}</p>}
      {bar && <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-success" style={{ width: "84%" }} /></div>}
    </div>
  );
}

function BioBar({ label, value, pct, color, tone }: { label: string; value: string; pct: number; color: string; tone?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[12px] font-bold text-ink">
        <span className="tracking-wider">{label}</span>
        <span className={tone === "critical-soft" ? "text-critical" : ""}>{value}</span>
      </div>
      <div className={`mt-1.5 h-2 rounded-full overflow-hidden ${tone === "critical-soft" ? "bg-critical/15" : "bg-muted"}`}>
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
