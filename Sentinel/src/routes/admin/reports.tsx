import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/admin/layout/AppShell";
import { TopBar } from "@/components/admin/layout/TopBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { FileDown, Users, Camera, Bell, Bug, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const REPORTS: ReportDef[] = [
  {
    id: "employees",
    title: "Employee List",
    description: "All employees in your company with status and monitoring type.",
    icon: Users,
    color: "text-primary",
  },
  {
    id: "camera",
    title: "Camera Sessions",
    description: "All camera analysis sessions including start/stop times and status.",
    icon: Camera,
    color: "text-green-600",
  },
  {
    id: "alerts",
    title: "Risk Alerts",
    description: "All risk alerts generated for your company's employees.",
    icon: Bell,
    color: "text-warning-foreground",
  },
  {
    id: "bugs",
    title: "Bug Reports",
    description: "Bug reports submitted by your team to SentinelAI.",
    icon: Bug,
    color: "text-red-600",
  },
];

function buildPDF(title: string, subtitle: string, headers: string[], rows: string[][]): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(10, 20, 50);
  doc.rect(0, 0, W, 28, "F");

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SentinelAI Workforce", 14, 11);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(title, 14, 20);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text(`${subtitle} — Generated ${new Date().toLocaleString("en-ZA")}`, 14, 26);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 34,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [10, 20, 50], textColor: [212, 175, 55], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`);
}

function ReportsPage() {
  const { profile } = useAuth();
  const [generating, setGenerating] = useState<string | null>(null);

  const generate = async (reportId: string) => {
    if (!profile?.company_id || generating) return;
    setGenerating(reportId);

    try {
      if (reportId === "employees") {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            `first_name, last_name, username, email, status, role, created_at,
             employee_profiles(monitoring_type, department, job_title, is_monitoring_enabled)`
          )
          .eq("company_id", profile.company_id)
          .eq("role", "EMPLOYEE")
          .order("created_at", { ascending: false });

        if (error || !data) { toast.error("Failed to fetch employees."); return; }

        const rows = data.map((e: any) => [
          `${e.first_name} ${e.last_name}`,
          e.username,
          e.email ?? "—",
          e.status,
          e.employee_profiles?.monitoring_type ?? "—",
          e.employee_profiles?.department ?? "—",
          e.employee_profiles?.job_title ?? "—",
          e.employee_profiles?.is_monitoring_enabled ? "Yes" : "No",
          new Date(e.created_at).toLocaleDateString("en-ZA"),
        ]);

        buildPDF(
          "Employee List",
          profile.company_id,
          ["Name", "Username", "Email", "Status", "Monitoring", "Department", "Job Title", "Monitoring Active", "Registered"],
          rows
        );
        toast.success("Employee report downloaded.");
      }

      else if (reportId === "camera") {
        const { data, error } = await supabase
          .from("camera_analysis_sessions")
          .select(
            `started_at, stopped_at, status, stop_reason, model_version,
             profiles!camera_analysis_sessions_employee_profile_id_fkey(first_name, last_name, username)`
          )
          .eq("company_id", profile.company_id)
          .order("started_at", { ascending: false })
          .limit(500);

        if (error || !data) { toast.error("Failed to fetch camera sessions."); return; }

        const rows = data.map((s: any) => {
          const dur = s.stopped_at
            ? Math.round((new Date(s.stopped_at).getTime() - new Date(s.started_at).getTime()) / 60000)
            : null;
          return [
            s.profiles ? `${s.profiles.first_name} ${s.profiles.last_name}` : "—",
            s.profiles?.username ?? "—",
            new Date(s.started_at).toLocaleString("en-ZA"),
            s.stopped_at ? new Date(s.stopped_at).toLocaleString("en-ZA") : "Still running",
            dur !== null ? `${dur} min` : "—",
            s.status,
            s.stop_reason ?? "—",
            s.model_version ?? "—",
          ];
        });

        buildPDF(
          "Camera Sessions",
          profile.company_id,
          ["Employee", "Username", "Started", "Stopped", "Duration", "Status", "Stop Reason", "Model"],
          rows
        );
        toast.success("Camera sessions report downloaded.");
      }

      else if (reportId === "alerts") {
        const { data, error } = await supabase
          .from("risk_alerts")
          .select(
            `alert_type, risk_level, message, is_seen, created_at,
             profiles!risk_alerts_profile_id_fkey(first_name, last_name, username)`
          )
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false })
          .limit(500);

        if (error || !data) { toast.error("Failed to fetch alerts."); return; }

        const rows = data.map((a: any) => [
          a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : "—",
          a.profiles?.username ?? "—",
          a.alert_type,
          a.risk_level,
          a.message ?? "—",
          a.is_seen ? "Seen" : "Unseen",
          new Date(a.created_at).toLocaleString("en-ZA"),
        ]);

        buildPDF(
          "Risk Alerts",
          profile.company_id,
          ["Employee", "Username", "Alert Type", "Risk Level", "Message", "Status", "Date"],
          rows
        );
        toast.success("Alerts report downloaded.");
      }

      else if (reportId === "bugs") {
        const { data, error } = await supabase
          .from("bug_reports")
          .select(
            `title, description, bug_status, priority, created_at,
             profiles!bug_reports_reported_by_profile_id_fkey(first_name, last_name, username)`
          )
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false });

        if (error || !data) { toast.error("Failed to fetch bug reports."); return; }

        const rows = data.map((b: any) => [
          b.profiles ? `${b.profiles.first_name} ${b.profiles.last_name}` : "—",
          b.profiles?.username ?? "—",
          b.title,
          b.priority,
          b.bug_status,
          new Date(b.created_at).toLocaleString("en-ZA"),
        ]);

        buildPDF(
          "Bug Reports",
          profile.company_id,
          ["Reporter", "Username", "Title", "Priority", "Status", "Date"],
          rows
        );
        toast.success("Bug reports downloaded.");
      }
    } catch (err) {
      toast.error("Report generation failed.");
      console.error(err);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <AppShell>
      <TopBar />
      <div className="px-5 pt-4 pb-24">
        <p className="text-[11px] font-extrabold tracking-wider text-ink-soft uppercase">
          Operations
        </p>
        <h1 className="mt-1 text-[34px] leading-[1.05] font-extrabold text-ink">Reports</h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          Download PDF reports for your company's data.
        </p>

        <div className="mt-6 space-y-3">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            const busy = generating === r.id;
            return (
              <div
                key={r.id}
                className="bg-surface rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className={`h-5 w-5 ${r.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-extrabold text-ink">{r.title}</p>
                    <p className="text-[12px] text-ink-soft mt-0.5 leading-snug">
                      {r.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => generate(r.id)}
                  disabled={!!generating}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold tracking-wider uppercase disabled:opacity-50"
                  aria-label={`Download ${r.title}`}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  {busy ? "…" : "PDF"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-ink-soft mt-8">
          Reports are scoped to your company's data only.
        </p>
      </div>
    </AppShell>
  );
}
