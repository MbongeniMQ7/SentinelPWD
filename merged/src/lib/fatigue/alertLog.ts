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
