/**
 * In-memory ring buffer of recent fatigue alerts.
 *
 * The alert bus is fire-and-forget by design — listeners only see events that
 * occur while they are subscribed. Manager UIs need to display history (e.g.
 * the Active Alerts feed), so this module persists the last N alerts and
 * exposes a React hook + observable store.
 *
 * This is intentionally lightweight: we keep things in-memory only, so a hard
 * refresh resets the log. A future server-backed store can drop in by
 * replacing the snapshot/subscribe implementation.
 */

import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { fatigueAlertBus, type ManagerAlertPayload, type WorkerAlertPayload } from "./alertBus";

export type AlertKind = "worker" | "manager";

export interface LoggedAlert {
  id: string;
  kind: AlertKind;
  workerId: string;
  workerName?: string;
  level: "moderate" | "high";
  score: number;
  message: string;
  timestamp: number;
  /** Whether the alert has been acknowledged by an operator. */
  acknowledged: boolean;
}

const MAX_LOG_ENTRIES = 50;

let alertLog: LoggedAlert[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function pushAlert(entry: LoggedAlert) {
  // Newest first; cap to MAX_LOG_ENTRIES
  alertLog = [entry, ...alertLog].slice(0, MAX_LOG_ENTRIES);
  notify();
  // Persist to Supabase in the background
  void saveAlertToDb(entry);
}

let initialised = false;

/**
 * Idempotently wires the log to the alert bus. Called automatically the first
 * time the log is observed.
 */
function ensureWired() {
  if (initialised) return;
  initialised = true;

  fatigueAlertBus.on("workerAlert", (p: WorkerAlertPayload) => {
    pushAlert({
      id: `wa-${p.workerId}-${p.timestamp}`,
      kind: "worker",
      workerId: p.workerId,
      workerName: p.workerName,
      level: p.level,
      score: p.score,
      message: p.message,
      timestamp: p.timestamp,
      acknowledged: false,
    });
  });

  fatigueAlertBus.on("managerAlert", (p: ManagerAlertPayload) => {
    pushAlert({
      id: `ma-${p.workerId}-${p.timestamp}`,
      kind: "manager",
      workerId: p.workerId,
      workerName: p.workerName,
      level: "high",
      score: p.score,
      message: `HIGH RISK — ${p.workerName ?? p.workerId}`,
      timestamp: p.timestamp,
      acknowledged: false,
    });
  });
}

export function getAlertLogSnapshot(): readonly LoggedAlert[] {
  return alertLog;
}

export function acknowledgeAlert(id: string) {
  let changed = false;
  alertLog = alertLog.map((a) => {
    if (a.id === id && !a.acknowledged) {
      changed = true;
      return { ...a, acknowledged: true };
    }
    return a;
  });
  if (changed) notify();
}

export function clearAlertLog() {
  if (alertLog.length === 0) return;
  alertLog = [];
  notify();
}

/**
 * React hook returning the current alert log. Auto-wires the bus on first use.
 */
export function useAlertLog(): readonly LoggedAlert[] {
  ensureWired();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getAlertLogSnapshot,
    getAlertLogSnapshot,
  );
}

// ── Supabase persistence ───────────────────────────────────────────────────────

export interface DbAlert {
  id: string;
  kind: AlertKind;
  level: "moderate" | "high";
  score: number;
  message: string;
  acknowledged: boolean;
  fired_at: string;
}

/**
 * Persist a fired alert to Supabase fatigue_alerts table.
 * Fire-and-forget — errors are swallowed so monitoring is never blocked.
 */
export async function saveAlertToDb(alert: LoggedAlert): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("fatigue_alerts").insert({
    user_id: user.id,
    kind: alert.kind,
    level: alert.level,
    score: alert.score,
    message: alert.message,
    acknowledged: false,
    fired_at: new Date(alert.timestamp).toISOString(),
  });
}

/**
 * Load the user's alert history from Supabase, newest first.
 */
export async function loadAlertsFromDb(
  limit = 50
): Promise<{ alerts: DbAlert[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { alerts: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("fatigue_alerts")
    .select("id, kind, level, score, message, acknowledged, fired_at")
    .eq("user_id", user.id)
    .order("fired_at", { ascending: false })
    .limit(limit);

  if (error) return { alerts: [], error: error.message };
  return { alerts: (data ?? []) as DbAlert[], error: null };
}

/**
 * Mark an alert as acknowledged in Supabase.
 */
export async function acknowledgeAlertInDb(id: string): Promise<void> {
  await supabase
    .from("fatigue_alerts")
    .update({ acknowledged: true })
    .eq("id", id);
}
