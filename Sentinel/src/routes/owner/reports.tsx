import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/owner/AppShell";
import { TopBar } from "@/components/owner/TopBar";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  FileText,
  Download,
  Users,
  Building2,
  Banknote,
  Camera,
  Watch,
  AlertTriangle,
  Bug,
  ClipboardList,
  Loader2,
} from "lucide-react";

interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const REPORTS: ReportDef[] = [
  {
    id: "users",
    title: "Users Report",
    description: "All platform users: names, roles, companies, status.",
    icon: <Users className="h-5 w-5 text-gold" />,
    category: "People",
  },
  {
    id: "companies",
    title: "Companies Report",
    description: "All registered companies with status and subscription info.",
    icon: <Building2 className="h-5 w-5 text-gold" />,
    category: "Business",
  },
  {
    id: "revenue",
    title: "Financial Report",
    description: "Payments history with amounts, statuses, and dates.",
    icon: <Banknote className="h-5 w-5 text-gold" />,
    category: "Finance",
  },
  {
    id: "alerts",
    title: "Risk Alerts Report",
    description: "All fatigue & risk alerts by level, employee, and company.",
    icon: <AlertTriangle className="h-5 w-5 text-gold" />,
    category: "Safety",
  },
  {
    id: "camera",
    title: "Camera Sessions Report",
    description: "Biometric camera analysis sessions with fatigue scores.",
    icon: <Camera className="h-5 w-5 text-gold" />,
    category: "Monitoring",
  },
  {
    id: "iot",
    title: "IoT Wristbands Report",
    description: "Device inventory: serial numbers, status, battery, assignments.",
    icon: <Watch className="h-5 w-5 text-gold" />,
    category: "Monitoring",
  },
  {
    id: "bugs",
    title: "Bug Reports",
    description: "All submitted bug reports with priorities and statuses.",
    icon: <Bug className="h-5 w-5 text-gold" />,
    category: "Operations",
  },
  {
    id: "audit",
    title: "Audit Log Report",
    description: "Full system audit trail — user actions and timestamps.",
    icon: <ClipboardList className="h-5 w-5 text-gold" />,
    category: "Audit",
  },
];

async function fetchAndBuildPDF(reportId: string): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date().toLocaleString();
  const pageW = doc.internal.pageSize.getWidth();

  const header = (title: string) => {
    doc.setFillColor(18, 18, 18);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SentinelAI — " + title, 14, 14);
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.text(`Generated: ${now}`, pageW - 14, 14, { align: "right" });
    doc.setTextColor(30, 30, 30);
  };

  const addRow = (doc: jsPDF, y: number, cols: string[], widths: number[], startX = 14): number => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    let x = startX;
    doc.setFontSize(8);
    cols.forEach((col, i) => {
      doc.text(String(col ?? ""), x + 1, y);
      x += widths[i];
    });
    return y + 6;
  };

  const addTableHeader = (doc: jsPDF, y: number, cols: string[], widths: number[], startX = 14): number => {
    doc.setFillColor(240, 240, 240);
    doc.rect(startX, y - 4, widths.reduce((a, b) => a + b, 0), 7, "F");
    doc.setFont("helvetica", "bold");
    const r = addRow(doc, y, cols, widths, startX);
    doc.setFont("helvetica", "normal");
    return r;
  };

  if (reportId === "users") {
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, username, email, role, status, companies(company_name)")
      .order("first_name");
    header("Users Report");
    let y = 30;
    const cols = ["First Name", "Last Name", "Username", "Email", "Role", "Status", "Company"];
    const widths = [26, 26, 26, 50, 22, 18, 32];
    y = addTableHeader(doc, y, cols, widths);
    for (const r of data ?? []) {
      const co = (r as any).companies;
      const companyName = Array.isArray(co) ? co[0]?.company_name ?? "" : co?.company_name ?? "";
      y = addRow(doc, y, [r.first_name ?? "", r.last_name ?? "", r.username ?? "", r.email ?? "", r.role ?? "", r.status ?? "", companyName], widths);
    }
  } else if (reportId === "companies") {
    const { data } = await supabase
      .from("companies")
      .select("company_name, status, industry, city, country, created_at")
      .order("company_name");
    header("Companies Report");
    let y = 30;
    const cols = ["Company Name", "Status", "Industry", "City", "Country", "Created"];
    const widths = [50, 22, 30, 24, 24, 30];
    y = addTableHeader(doc, y, cols, widths);
    for (const r of data ?? []) {
      y = addRow(doc, y, [r.company_name ?? "", r.status ?? "", r.industry ?? "", r.city ?? "", r.country ?? "", r.created_at ? new Date(r.created_at).toLocaleDateString() : ""], widths);
    }
  } else if (reportId === "revenue") {
    const { data } = await supabase
      .from("payments")
      .select("amount, payment_status, payment_date, payment_method, companies(company_name)")
      .order("payment_date", { ascending: false });
    header("Financial Report");
    let y = 30;
    const cols = ["Company", "Amount (R)", "Status", "Method", "Date"];
    const widths = [55, 25, 25, 30, 35];
    y = addTableHeader(doc, y, cols, widths);
    for (const r of data ?? []) {
      const co = (r as any).companies;
      const companyName = Array.isArray(co) ? co[0]?.company_name ?? "" : co?.company_name ?? "";
      y = addRow(doc, y, [companyName, String((r.amount ?? 0).toFixed(2)), r.payment_status ?? "", r.payment_method ?? "", r.payment_date ? new Date(r.payment_date).toLocaleDateString() : ""], widths);
    }
  } else if (reportId === "alerts") {
    const { data } = await supabase
      .from("risk_alerts")
      .select("risk_level, alert_type, message, fatigue_score, created_at, profiles(first_name, last_name), companies(company_name)")
      .order("created_at", { ascending: false });
    header("Risk Alerts Report");
    let y = 30;
    const cols = ["Employee", "Company", "Level", "Type", "Score", "Date"];
    const widths = [40, 40, 20, 25, 15, 30];
    y = addTableHeader(doc, y, cols, widths);
    for (const r of data ?? []) {
      const p = (r as any).profiles;
      const co = (r as any).companies;
      const emp = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "Unknown";
      const comp = Array.isArray(co) ? co[0]?.company_name ?? "" : co?.company_name ?? "";
      y = addRow(doc, y, [emp, comp, r.risk_level ?? "", r.alert_type ?? "", String(r.fatigue_score ?? ""), r.created_at ? new Date(r.created_at).toLocaleDateString() : ""], widths);
    }
  } else if (reportId === "camera") {
    const { data } = await supabase
      .from("camera_analysis_sessions")
      .select("status, fatigue_score, model_version, started_at, ended_at, profiles(first_name, last_name), companies(company_name)")
      .order("started_at", { ascending: false });
    header("Camera Sessions Report");
    let y = 30;
    const cols = ["Employee", "Company", "Status", "Fatigue %", "Model", "Started"];
    const widths = [40, 40, 22, 18, 20, 30];
    y = addTableHeader(doc, y, cols, widths);
    for (const r of data ?? []) {
      const p = (r as any).profiles;
      const co = (r as any).companies;
      const emp = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "Unknown";
      const comp = Array.isArray(co) ? co[0]?.company_name ?? "" : co?.company_name ?? "";
      y = addRow(doc, y, [emp, comp, r.status ?? "", String(r.fatigue_score ?? ""), r.model_version ?? "", r.started_at ? new Date(r.started_at).toLocaleDateString() : ""], widths);
    }
  } else if (reportId === "iot") {
    const { data } = await supabase
      .from("iot_wristbands")
      .select("serial_number, status, battery_level, firmware_version, last_active_at, profiles(first_name, last_name), companies(company_name)")
      .order("last_active_at", { ascending: false, nullsFirst: false });
    header("IoT Wristbands Report");
    let y = 30;
    const cols = ["Serial", "Assigned To", "Company", "Status", "Battery", "Last Active"];
    const widths = [35, 40, 35, 22, 15, 28];
    y = addTableHeader(doc, y, cols, widths);
    for (const r of data ?? []) {
      const p = (r as any).profiles;
      const co = (r as any).companies;
      const emp = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "Unassigned";
      const comp = Array.isArray(co) ? co[0]?.company_name ?? "" : co?.company_name ?? "";
      y = addRow(doc, y, [r.serial_number ?? "", emp, comp, r.status ?? "", r.battery_level !== null ? `${r.battery_level}%` : "", r.last_active_at ? new Date(r.last_active_at).toLocaleDateString() : ""], widths);
    }
  } else if (reportId === "bugs") {
    const { data } = await supabase
      .from("bug_reports")
      .select("title, bug_status, priority, created_at, companies(company_name), profiles(first_name, last_name)")
      .order("created_at", { ascending: false });
    header("Bug Reports");
    let y = 30;
    const cols = ["Title", "Company", "Reporter", "Priority", "Status", "Date"];
    const widths = [50, 35, 30, 18, 18, 25];
    y = addTableHeader(doc, y, cols, widths);
    for (const r of data ?? []) {
      const p = (r as any).profiles;
      const co = (r as any).companies;
      const reporter = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "";
      const comp = Array.isArray(co) ? co[0]?.company_name ?? "" : co?.company_name ?? "";
      const shortTitle = (r.title ?? "").length > 35 ? (r.title ?? "").slice(0, 35) + "…" : (r.title ?? "");
      y = addRow(doc, y, [shortTitle, comp, reporter, r.priority ?? "", r.bug_status ?? "", r.created_at ? new Date(r.created_at).toLocaleDateString() : ""], widths);
    }
  } else if (reportId === "audit") {
    const { data } = await supabase
      .from("audit_logs")
      .select("action_type, description, created_at, profiles(username)")
      .order("created_at", { ascending: false });
    header("Audit Log Report");
    let y = 30;
    const cols = ["Action", "Description", "Actor", "Date"];
    const widths = [35, 95, 30, 25];
    y = addTableHeader(doc, y, cols, widths);
    for (const r of data ?? []) {
      const p = (r as any).profiles;
      const actor = p ? `@${p.username ?? ""}` : "System";
      const desc = (r.description ?? "").length > 70 ? (r.description ?? "").slice(0, 70) + "…" : (r.description ?? "");
      y = addRow(doc, y, [r.action_type ?? "", desc, actor, r.created_at ? new Date(r.created_at).toLocaleDateString() : ""], widths);
    }
  }

  const fileName = `SentinelAI_${reportId}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}

const Reports = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const categories = [...new Set(REPORTS.map((r) => r.category))];

  async function download(report: ReportDef) {
    setDownloading(report.id);
    try {
      await fetchAndBuildPDF(report.id);
      toast.success(`${report.title} downloaded.`);
    } catch (err: any) {
      toast.error("Failed to generate report: " + (err?.message ?? "unknown error"));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <AppShell>
      <TopBar title="Reports" />
      <div className="px-4 pt-3 pb-24 space-y-5">
        <div>
          <h2 className="font-display text-[26px] font-bold">Reports</h2>
          <p className="text-sm text-muted-foreground">Download PDF reports for any data category.</p>
        </div>

        {categories.map((cat) => (
          <div key={cat}>
            <div className="label-eyebrow mb-3">{cat.toUpperCase()}</div>
            <div className="space-y-2">
              {REPORTS.filter((r) => r.category === cat).map((report) => (
                <div
                  key={report.id}
                  className="bg-card rounded-2xl px-5 py-4 shadow-card flex items-center gap-4"
                >
                  <div className="shrink-0">{report.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-primary">{report.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                  </div>
                  <button
                    onClick={() => download(report)}
                    disabled={downloading !== null}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold tracking-wide disabled:opacity-50"
                  >
                    {downloading === report.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-xl bg-secondary px-5 py-4 text-sm text-muted-foreground">
          <FileText className="h-4 w-4 inline mr-2 opacity-60" />
          Reports are generated from live Supabase data and saved as PDF files.
        </div>
      </div>
    </AppShell>
  );
};

export const Route = createFileRoute("/owner/reports")({ component: Reports });
