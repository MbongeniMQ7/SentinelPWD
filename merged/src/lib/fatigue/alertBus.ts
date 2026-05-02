/**
 * Tiny pub/sub event bus for fatigue alerts.
 *
 * The Worker Dashboard listens for `workerAlert` (Moderate+).
 * The Manager Dashboard listens for `managerAlert` (High; payload carries
 * the worker's id so the manager view can highlight the at-risk operator).
 *
 * Decoupled from React on purpose — any module (worker page, admin page,
 * background service worker) can subscribe.
 */

export type RiskLevel = "low" | "moderate" | "high";

export interface WorkerAlertPayload {
  workerId: string;
  workerName?: string;
  score: number;
  level: Exclude<RiskLevel, "low">;
  message: string;
  timestamp: number;
}

export interface ManagerAlertPayload extends WorkerAlertPayload {
  level: "high";
}

export type AlertEventMap = {
  workerAlert: WorkerAlertPayload;
  managerAlert: ManagerAlertPayload;
};

type Listener<K extends keyof AlertEventMap> = (
  payload: AlertEventMap[K],
) => void;

class FatigueAlertBus {
  private listeners: { [K in keyof AlertEventMap]?: Set<Listener<K>> } = {};

  on<K extends keyof AlertEventMap>(event: K, listener: Listener<K>): () => void {
    let set = this.listeners[event] as Set<Listener<K>> | undefined;
    if (!set) {
      set = new Set();
      this.listeners[event] = set as Set<Listener<keyof AlertEventMap>> as never;
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  emit<K extends keyof AlertEventMap>(event: K, payload: AlertEventMap[K]): void {
    const set = this.listeners[event] as Set<Listener<K>> | undefined;
    if (!set || set.size === 0) return;
    // Copy so subscribers can unsubscribe during emit without mutating mid-iter.
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[fatigueAlertBus] listener threw", err);
      }
    }
  }
}

export const fatigueAlertBus = new FatigueAlertBus();
