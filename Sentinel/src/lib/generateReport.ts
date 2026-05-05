import jsPDF from "jspdf";
import type { DbSession } from "@/lib/fatigue/sessionStore";
import type { DbAlert } from "@/lib/fatigue/alertLog";

// ── Brand tokens (match CSS vars) ───────────────────────────────────────────
const NAVY = "#0F1B33";
const GOLD = "#D4A83A";
const GOLD_SOFT = "#F5EDD8";
const WHITE = "#FFFFFF";
const LIGHT_BG = "#F3F6FB";
const BORDER = "#E2E8F0";
const TEXT_DARK = "#1A2340";
const TEXT_MUTED = "#64748B";
const GREEN = "#22C55E";
const RED = "#EF4444";
const AMBER = "#F59E0B";

function riskColor(level: string) {
  if (level === "high") return RED;
  if (level === "moderate") return AMBER;
  return GREEN;
}

function effColor(eff: number) {
  if (eff >= 70) return GREEN;
  if (eff >= 50) return AMBER;
  return RED;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shieldPath(doc: jsPDF, cx: number, cy: number, size: number) {
  // Draw a simple shield shape using lines
  const w = size;
  const h = size * 1.2;
  const x = cx - w / 2;
  const y = cy - h / 2;
  doc.setFillColor(NAVY);
  doc.roundedRect(x, y, w, h, size * 0.18, size * 0.18, "F");
  // inner gold check-ish mark
  doc.setDrawColor(GOLD);
  doc.setLineWidth(size * 0.08);
  doc.line(cx - size * 0.22, cy, cx - size * 0.05, cy + size * 0.22);
  doc.line(cx - size * 0.05, cy + size * 0.22, cx + size * 0.25, cy - size * 0.2);
}

function drawHeader(doc: jsPDF, pageW: number, title: string, subtitle: string) {
  // Navy header band
  doc.setFillColor(NAVY);
  doc.rect(0, 0, pageW, 38, "F");

  // Gold accent line at bottom of header
  doc.setFillColor(GOLD);
  doc.rect(0, 36, pageW, 2, "F");

  // Shield logo
  shieldPath(doc, 18, 19, 12);

  // Brand name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(WHITE);
  doc.text("SentinelAI", 28, 17);

  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(GOLD);
  doc.text("WORKFORCE SAFETY MONITORING", 28, 23);

  // Report title (right-aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(WHITE);
  doc.text(title, pageW - 12, 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GOLD_SOFT);
  doc.text(subtitle, pageW - 12, 23, { align: "right" });
}

function drawFooter(doc: jsPDF, pageW: number, pageH: number, pageNum: number, totalPages: number) {
  doc.setFillColor(NAVY);
  doc.rect(0, pageH - 14, pageW, 14, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(GOLD_SOFT);
  doc.text("© 2026 SentinelAI — Confidential Safety Report", 12, pageH - 5);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 12, pageH - 5, { align: "right" });
}

function statBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  valueColor = TEXT_DARK,
  sub?: string,
) {
  doc.setFillColor(WHITE);
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(valueColor);
  doc.text(value, x + w / 2, y + h / 2 + 1, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED);
  doc.text(label.toUpperCase(), x + w / 2, y + h / 2 + 8, { align: "center" });

  if (sub) {
    doc.setFontSize(7);
    doc.setTextColor(valueColor);
    doc.text(sub, x + w / 2, y + 10, { align: "center" });
  }
}

function sectionTitle(doc: jsPDF, x: number, y: number, text: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text(text, x, y);
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.8);
  doc.line(x, y + 2, x + 60, y + 2);
}

function miniBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  values: number[],
  maxVal: number,
  barColor = NAVY,
) {
  const n = values.length;
  if (n === 0) return;
  const barW = (w - (n - 1) * 1.5) / n;
  values.forEach((v, i) => {
    const barH = (v / maxVal) * h;
    const bx = x + i * (barW + 1.5);
    const by = y + h - barH;
    doc.setFillColor(barColor);
    doc.roundedRect(bx, by, barW, barH, 0.8, 0.8, "F");
  });
}

function trendLine(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  values: number[],
  color = GOLD,
) {
  if (values.length < 2) return;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => ({
    px: x + (i / (values.length - 1)) * w,
    py: y + h - (v / max) * h * 0.85,
  }));
  doc.setDrawColor(color);
  doc.setLineWidth(1.2);
  for (let i = 0; i < pts.length - 1; i++) {
    doc.line(pts[i].px, pts[i].py, pts[i + 1].px, pts[i + 1].py);
  }
  // dots
  doc.setFillColor(color);
  pts.forEach((p) => doc.circle(p.px, p.py, 0.8, "F"));
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ReportOptions {
  userName: string;
  sessions: DbSession[];
  alerts: DbAlert[];
  period?: "week" | "month" | "all";
}

export function downloadReport({ userName, sessions, alerts, period = "month" }: ReportOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const MARGIN = 12;
  const CONTENT_W = pageW - MARGIN * 2;

  const now = new Date();
  const periodLabel =
    period === "week"
      ? `Week of ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : period === "month"
        ? now.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : "All Time";

  // ── Filter by period ──
  let filteredSessions = sessions;
  let filteredAlerts = alerts;
  if (period === "week") {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filteredSessions = sessions.filter((s) => new Date(s.terminated_at) >= cutoff);
    filteredAlerts = alerts.filter((a) => new Date(a.fired_at) >= cutoff);
  } else if (period === "month") {
    filteredSessions = sessions.filter((s) => {
      const d = new Date(s.terminated_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    filteredAlerts = alerts.filter((a) => {
      const d = new Date(a.fired_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  // ── Compute stats ──
  const avgScore =
    filteredSessions.length > 0
      ? filteredSessions.reduce((s, x) => s + x.score, 0) / filteredSessions.length
      : null;
  const efficiency = avgScore !== null ? Math.round(100 - avgScore) : null;
  const highSessions = filteredSessions.filter((s) => s.level === "high").length;
  const highAlerts = filteredAlerts.filter((a) => a.level === "high").length;
  const ackRate =
    highAlerts > 0
      ? Math.round(
          (filteredAlerts.filter((a) => a.acknowledged && a.level === "high").length / highAlerts) *
            100,
        )
      : null;

  // Scores over time (last 10)
  const scoreTrend = filteredSessions
    .slice(0, 10)
    .reverse()
    .map((s) => s.score);

  const totalPages = 2;

  // ════════════════════════════════════════════════════════════════
  // PAGE 1 — Executive Summary
  // ════════════════════════════════════════════════════════════════
  drawHeader(doc, pageW, "Safety Report", periodLabel);

  let y = 46;

  // Recipient line
  doc.setFillColor(LIGHT_BG);
  doc.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_DARK);
  doc.text(`Prepared for: ${userName}`, MARGIN + 6, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_MUTED);
  doc.text(`Generated: ${now.toLocaleString()}`, MARGIN + 6, y + 10);
  y += 18;

  // Section: Key Metrics
  sectionTitle(doc, MARGIN, y, "Key Metrics");
  y += 7;

  const boxW = (CONTENT_W - 6) / 4;
  statBox(
    doc,
    MARGIN,
    y,
    boxW,
    24,
    "Sessions",
    filteredSessions.length.toString(),
    NAVY,
  );
  statBox(
    doc,
    MARGIN + boxW + 2,
    y,
    boxW,
    24,
    "Efficiency",
    efficiency !== null ? `${efficiency}%` : "—",
    efficiency !== null ? effColor(efficiency) : TEXT_MUTED,
  );
  statBox(
    doc,
    MARGIN + (boxW + 2) * 2,
    y,
    boxW,
    24,
    "High Risk",
    highSessions.toString(),
    highSessions > 0 ? RED : GREEN,
  );
  statBox(
    doc,
    MARGIN + (boxW + 2) * 3,
    y,
    boxW,
    24,
    "Alerts",
    filteredAlerts.length.toString(),
    filteredAlerts.length > 0 ? AMBER : GREEN,
  );
  y += 30;

  // Section: Fatigue Score Trend
  sectionTitle(doc, MARGIN, y, "Fatigue Score Trend");
  y += 6;

  doc.setFillColor(WHITE);
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, 44, 3, 3, "FD");

  if (scoreTrend.length >= 2) {
    // Background grid lines
    doc.setDrawColor(BORDER);
    doc.setLineWidth(0.2);
    [25, 50, 75].forEach((pct) => {
      const gy = y + 4 + (44 - 8) * (1 - pct / 100) * 0.85;
      doc.line(MARGIN + 4, gy, MARGIN + CONTENT_W - 4, gy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(TEXT_MUTED);
      doc.text(`${pct}`, MARGIN + 1, gy + 1);
    });

    // The trend line (fatigue scores — lower is better)
    trendLine(doc, MARGIN + 10, y + 4, CONTENT_W - 14, 36, scoreTrend, GOLD);

    // Session labels at x axis
    scoreTrend.forEach((_, i) => {
      const px = MARGIN + 10 + (i / (scoreTrend.length - 1)) * (CONTENT_W - 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(TEXT_MUTED);
      doc.text(`S${i + 1}`, px - 1.5, y + 43);
    });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MUTED);
    doc.text("No session data available for this period.", MARGIN + CONTENT_W / 2, y + 22, {
      align: "center",
    });
  }
  y += 50;

  // Section: Alert Summary
  sectionTitle(doc, MARGIN, y, "Alert Summary");
  y += 7;

  const highCount = filteredAlerts.filter((a) => a.level === "high").length;
  const modCount = filteredAlerts.filter((a) => a.level === "moderate").length;
  const ackCount = filteredAlerts.filter((a) => a.acknowledged).length;

  const alertBoxW = (CONTENT_W - 4) / 3;
  statBox(doc, MARGIN, y, alertBoxW, 22, "High Risk", highCount.toString(), highCount > 0 ? RED : GREEN);
  statBox(doc, MARGIN + alertBoxW + 2, y, alertBoxW, 22, "Moderate", modCount.toString(), modCount > 0 ? AMBER : GREEN);
  statBox(doc, MARGIN + (alertBoxW + 2) * 2, y, alertBoxW, 22, "Acknowledged", ackCount.toString(), NAVY);
  y += 28;

  // Alert bar chart
  if (filteredAlerts.length > 0) {
    const recentAlerts = filteredAlerts.slice(0, 12).reverse();
    const barVals = recentAlerts.map((a) => (a.level === "high" ? 2 : 1));
    doc.setFillColor(WHITE);
    doc.setDrawColor(BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, 28, 3, 3, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED);
    doc.text("Recent alerts (red = high, amber = moderate)", MARGIN + 4, y + 6);
    miniBarChart(doc, MARGIN + 4, y + 9, CONTENT_W - 8, 14, barVals, 2, AMBER);
    // Overlay high ones in red
    recentAlerts.forEach((a, i) => {
      if (a.level === "high") {
        const bw = (CONTENT_W - 8 - (recentAlerts.length - 1) * 1.5) / recentAlerts.length;
        const bx = MARGIN + 4 + i * (bw + 1.5);
        doc.setFillColor(RED);
        doc.roundedRect(bx, y + 9 + 14 - 14, bw, 14, 0.8, 0.8, "F");
      }
    });
    y += 34;
  }

  // Vigilance rating block
  doc.setFillColor(GOLD_SOFT);
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(TEXT_DARK);
  doc.text("VIGILANCE RATING", MARGIN + 6, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(TEXT_DARK);
  const vigilanceText =
    ackRate !== null
      ? `${ackRate}% acknowledgement rate on high-risk alerts.`
      : "No high-risk alerts recorded this period.";
  doc.text(vigilanceText, MARGIN + 6, y + 14);
  y += 24;

  drawFooter(doc, pageW, pageH, 1, totalPages);

  // ════════════════════════════════════════════════════════════════
  // PAGE 2 — Session Log
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(doc, pageW, "Session Log", periodLabel);

  y = 46;
  sectionTitle(doc, MARGIN, y, "Session History");
  y += 7;

  if (filteredSessions.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MUTED);
    doc.text("No sessions recorded for this period.", MARGIN + CONTENT_W / 2, y + 10, {
      align: "center",
    });
  } else {
    // Table header
    doc.setFillColor(NAVY);
    doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(WHITE);
    const cols = [MARGIN + 3, MARGIN + 52, MARGIN + 82, MARGIN + 112, MARGIN + 140, MARGIN + 162];
    ["Date & Time", "Score", "Level", "Duration", "Blink Rate", "Eye Closure"].forEach((h, i) => {
      doc.text(h, cols[i], y + 5.2);
    });
    y += 9;

    const maxRows = Math.floor((pageH - y - 20) / 7);
    const rows = filteredSessions.slice(0, maxRows);

    rows.forEach((s, idx) => {
      const rowY = y + idx * 7;
      if (idx % 2 === 0) {
        doc.setFillColor(LIGHT_BG);
        doc.rect(MARGIN, rowY, CONTENT_W, 7, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(TEXT_DARK);
      doc.text(formatDateTime(s.terminated_at), cols[0], rowY + 4.8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(riskColor(s.level));
      doc.text(s.score.toString(), cols[1], rowY + 4.8);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(riskColor(s.level));
      doc.text(s.level.toUpperCase(), cols[2], rowY + 4.8);

      doc.setTextColor(TEXT_DARK);
      const mins = Math.floor(s.duration_seconds / 60);
      const secs = s.duration_seconds % 60;
      doc.text(`${mins}m ${secs}s`, cols[3], rowY + 4.8);
      doc.text(`${s.blink_rate.toFixed(1)}/min`, cols[4], rowY + 4.8);
      doc.text(`${(s.eye_closure * 100).toFixed(1)}%`, cols[5], rowY + 4.8);
    });

    if (filteredSessions.length > maxRows) {
      const remainY = y + rows.length * 7 + 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(TEXT_MUTED);
      doc.text(
        `… and ${filteredSessions.length - maxRows} more sessions not shown.`,
        MARGIN,
        remainY,
      );
    }
  }

  // Signature / compliance block at bottom of page 2
  const sigY = pageH - 40;
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, sigY, MARGIN + 60, sigY);
  doc.line(MARGIN + CONTENT_W - 60, sigY, MARGIN + CONTENT_W, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED);
  doc.text("Worker Signature", MARGIN + 10, sigY + 5);
  doc.text("Supervisor Signature", MARGIN + CONTENT_W - 50, sigY + 5);
  doc.text(
    "This report is generated automatically by SentinelAI and is intended for internal safety compliance use only.",
    pageW / 2,
    sigY + 15,
    { align: "center", maxWidth: CONTENT_W },
  );

  drawFooter(doc, pageW, pageH, 2, totalPages);

  // ── Save ──
  const filename = `SentinelAI_Report_${userName.replace(/\s+/g, "_")}_${period}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`;
  doc.save(filename);
}
