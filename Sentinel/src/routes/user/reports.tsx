import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/user/AppHeader";
import { BottomNav } from "@/components/user/BottomNav";
import { BarChart3, LineChart, TrendingUp, TrendingDown, Download, Loader2 } from "lucide-react";
import { loadSessionHistory, type DbSession } from "@/lib/fatigue/sessionStore";
import { loadAlertsFromDb, type DbAlert } from "@/lib/fatigue/alertLog";
import { downloadReport } from "@/lib/generateReport";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/user/reports")({
  component: Reports,
});

function buildTrendPath(sessions: DbSession[]): string {
  const pts = sessions.slice(0, 8).reverse();
  if (pts.length < 2) return "";
  const w = 300, h = 80;
  const coords = pts.map((s, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - (s.score / 100) * h * 0.8 - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${coords[0]} ` + coords.slice(1).map((c) => `L${c}`).join(" ");
}

interface WeekGroup {
  weekLabel: string;
  sessions: DbSession[];
  avgScore: number;
  highCount: number;
}

function groupByWeek(sessions: DbSession[]): WeekGroup[] {
  const map = new Map<string, DbSession[]>();
  for (const s of sessions) {
    const d = new Date(s.terminated_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([weekLabel, grpSessions]) => ({
    weekLabel,
    sessions: grpSessions,
    avgScore: grpSessions.reduce((sum, s) => sum + s.score, 0) / grpSessions.length,
    highCount: grpSessions.filter((s) => s.level === "high").length,
  }));
}

function Reports() {
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [alerts, setAlerts] = useState<DbAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<"week" | "month" | "all" | null>(null);
  const { profile } = useProfile();
  const userName = profile?.full_name ?? profile?.email ?? "User";

  useEffect(() => {
    Promise.all([loadSessionHistory(60), loadAlertsFromDb(100)]).then(([s, a]) => {
      setSessions(s.sessions);
      setAlerts(a.alerts);
      setLoading(false);
    });
  }, []);

  async function handleDownload(period: "week" | "month" | "all") {
    setDownloading(period);
    await new Promise((r) => setTimeout(r, 50)); // let state render
    downloadReport({ userName, sessions, alerts, period });
    setDownloading(null);
  }

  const now = new Date();

  const thisMonthSessions = sessions.filter((s) => {
    const d = new Date(s.terminated_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthSessions = sessions.filter((s) => {
    const d = new Date(s.terminated_at);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });

  const avgScore = (arr: DbSession[]) =>
    arr.length === 0 ? null : arr.reduce((sum, s) => sum + s.score, 0) / arr.length;

  const thisMonthAvg = avgScore(thisMonthSessions);
  const lastMonthAvg = avgScore(lastMonthSessions);
  const efficiencyIndex = thisMonthAvg !== null ? Math.round(100 - thisMonthAvg) : null;
  const lastMonthEfficiency = lastMonthAvg !== null ? Math.round(100 - lastMonthAvg) : null;
  const efficiencyDelta =
    efficiencyIndex !== null && lastMonthEfficiency !== null
      ? efficiencyIndex - lastMonthEfficiency
      : null;

  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thisWeekAlerts = alerts.filter((a) => new Date(a.fired_at) >= oneWeekAgo);
  const lastWeekAlerts = alerts.filter(
    (a) => new Date(a.fired_at) >= twoWeeksAgo && new Date(a.fired_at) < oneWeekAgo,
  );
  const highAlerts = alerts.filter((a) => a.level === "high");
  const ackRate =
    highAlerts.length === 0
      ? null
      : Math.round((highAlerts.filter((a) => a.acknowledged).length / highAlerts.length) * 100);
  const alertReduction =
    lastWeekAlerts.length > 0
      ? Math.round(((lastWeekAlerts.length - thisWeekAlerts.length) / lastWeekAlerts.length) * 100)
      : null;

  const trendPath = buildTrendPath(sessions);
  const weeklyGroups = groupByWeek(sessions.slice(0, 28));

  return (
    <div className="app-shell flex flex-col">
      <AppHeader battery={null} />
      <main className="flex-1 px-5 pb-6 space-y-5">
        <div>
          <h1 className="text-4xl font-display font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Comprehensive insights into your fatigue patterns and safety compliance metrics.
          </p>
        </div>

        {/* Hero card */}
        <div className="panel bg-navy text-navy-foreground p-6 relative overflow-hidden">
          <div className="label-eyebrow text-gold">Historical Trend</div>
          <h2 className="mt-2 text-3xl font-display font-bold">Fatigue Mitigation</h2>
          <svg viewBox="0 0 300 80" className="mt-6 w-full h-20">
            {trendPath ? (
              <path d={trendPath} stroke="oklch(0.86 0.12 88)" strokeWidth="3" fill="none" />
            ) : (
              <path
                d="M0,55 C50,40 80,65 120,50 S200,15 260,30 L300,20"
                stroke="oklch(0.86 0.12 88 / 0.3)"
                strokeWidth="3"
                fill="none"
                strokeDasharray="4 4"
              />
            )}
          </svg>
          <div className="mt-4 flex items-end gap-3">
            {loading ? (
              <div className="h-12 w-24 rounded-lg bg-white/10 animate-pulse" />
            ) : efficiencyIndex !== null ? (
              <>
                <div className="text-5xl font-display font-bold text-gold">{efficiencyIndex}%</div>
                {efficiencyDelta !== null && (
                  <div>
                    <div
                      className={`font-bold flex items-center gap-1 ${efficiencyDelta >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {efficiencyDelta >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {efficiencyDelta >= 0 ? "+" : ""}
                      {efficiencyDelta}%
                    </div>
                    <div className="text-xs opacity-70">vs Last Month</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm opacity-60">No session data yet</div>
            )}
          </div>
          <div className="text-xs opacity-70 mt-1">
            Efficiency Index ({thisMonthSessions.length} sessions this month)
          </div>
        </div>

        {/* Vigilance Rating */}
        <div className="panel bg-gold-soft p-6">
          <div className="label-eyebrow text-gold-foreground">Alert Accuracy</div>
          <h3 className="mt-1 text-2xl font-display font-bold text-gold-foreground">
            Vigilance Rating
          </h3>
          {loading ? (
            <div className="mt-4 h-4 w-48 rounded bg-gold-foreground/20 animate-pulse" />
          ) : (
            <>
              <div className="mt-4 inline-flex items-center gap-2 font-bold text-gold-foreground">
                <LineChart className="h-4 w-4" />
                {ackRate !== null ? `${ackRate}% Acknowledgement Rate` : "No alerts yet"}
              </div>
              <p className="mt-1 text-sm text-gold-foreground/80">
                {alertReduction !== null && alertReduction > 0
                  ? `Active monitoring has reduced critical alerts by ${alertReduction}% this week.`
                  : alertReduction !== null && alertReduction < 0
                    ? `Critical alerts increased by ${Math.abs(alertReduction)}% this week.`
                    : `${thisWeekAlerts.length} alert${thisWeekAlerts.length !== 1 ? "s" : ""} fired this week · ${alerts.length} total recorded.`}
              </p>
            </>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Sessions" value={loading ? "—" : sessions.length.toString()} />
          <StatCard
            label="High Risk"
            value={loading ? "—" : highAlerts.length.toString()}
            accent={highAlerts.length > 0}
          />
          <StatCard label="This Week" value={loading ? "—" : thisWeekAlerts.length.toString()} />
        </div>

        {/* Download buttons */}
        <div className="panel p-4">
          <h3 className="text-base font-display font-bold mb-3">Download Report</h3>
          <div className="grid grid-cols-3 gap-2">
            {(["week", "month", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handleDownload(p)}
                disabled={loading || downloading !== null}
                className="rounded-xl bg-navy text-navy-foreground py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {downloading === p ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <h3 className="text-xl font-display font-bold">Recent Sessions</h3>
          <span className="text-xs font-bold text-muted-foreground">{sessions.length} total</span>
        </div>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="panel p-4 h-20 animate-pulse bg-secondary/50" />
          ))
        ) : sessions.length === 0 ? (
          <div className="panel p-6 text-center text-muted-foreground text-sm">
            No sessions recorded yet. Start monitoring to see data here.
          </div>
        ) : (
          weeklyGroups.map((group) => <SessionGroupCard key={group.weekLabel} group={group} />)
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel p-3 text-center">
      <div className={`text-2xl font-display font-bold ${accent ? "text-red-500" : ""}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function SessionGroupCard({ group }: { group: WeekGroup }) {
  const efficiency = Math.round(100 - group.avgScore);
  const hasHigh = group.highCount > 0;
  return (
    <div className="panel p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          {hasHigh ? (
            <LineChart className="h-5 w-5 text-red-500" />
          ) : (
            <BarChart3 className="h-5 w-5 text-navy" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-display font-bold text-base leading-tight">
            Week of {group.weekLabel}
          </h4>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${hasHigh ? "bg-red-100 text-red-700" : "bg-secondary text-foreground"}`}
            >
              {hasHigh ? `${group.highCount} High Risk` : "Low Risk"}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {group.sessions.length} session{group.sessions.length !== 1 ? "s" : ""} ·{" "}
              {efficiency}% efficiency
            </span>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-xl font-display font-bold ${efficiency >= 70 ? "text-green-600" : efficiency >= 50 ? "text-amber-500" : "text-red-500"}`}
          >
            {efficiency}%
          </div>
        </div>
      </div>
    </div>
  );
}
