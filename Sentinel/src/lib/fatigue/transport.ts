/**
 * Optional transport layer that bridges the in-process `fatigueAlertBus` to
 * external systems:
 *
 *   - WebSocket: forwards `workerAlert` / `managerAlert` events to a backend,
 *     and re-emits inbound messages onto the bus so a manager device can see
 *     alerts coming from another worker's session.
 *   - Web Push / Notification API: surfaces high-risk events as desktop /
 *     OS-level notifications even when the tab is in the background.
 *
 * Everything degrades gracefully: if no URL is configured, the WebSocket is
 * skipped; if the browser denies notifications, push is skipped. The toast
 * listeners and in-memory alert log keep working regardless.
 */

import {
  fatigueAlertBus,
  type ManagerAlertPayload,
  type WorkerAlertPayload,
} from "./alertBus";

// --------------------------------------------------------------------------
// WebSocket transport
// --------------------------------------------------------------------------

type EnvelopeKind = "workerAlert" | "managerAlert";

interface BusEnvelope {
  kind: EnvelopeKind;
  payload: WorkerAlertPayload | ManagerAlertPayload;
  /** Tag set on outbound messages so we can ignore our own echoes. */
  origin?: string;
}

export interface WebSocketTransportOptions {
  url: string;
  /** Stable client tag echoed in every outbound message. */
  origin?: string;
  /** Reconnect backoff in ms; defaults to 2s growing to 30s. */
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
}

export interface WebSocketTransportHandle {
  disconnect(): void;
  /** Currently-open socket if connected; null while reconnecting. */
  readonly socket: WebSocket | null;
}

/**
 * Connects the alert bus to a WebSocket. Outbound: every alert emitted on
 * the bus is sent over the socket. Inbound: well-formed envelopes are
 * re-emitted on the bus so other listeners (toasts, alert log, manager UI)
 * can react.
 */
export function connectFatigueWebSocket(
  opts: WebSocketTransportOptions,
): WebSocketTransportHandle {
  const origin = opts.origin ?? `client-${Math.random().toString(36).slice(2, 10)}`;
  const baseDelay = opts.reconnectBaseMs ?? 2_000;
  const maxDelay = opts.reconnectMaxMs ?? 30_000;

  let disposed = false;
  let socket: WebSocket | null = null;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const offWorker = fatigueAlertBus.on("workerAlert", (p) => {
    sendEnvelope({ kind: "workerAlert", payload: p, origin });
  });
  const offManager = fatigueAlertBus.on("managerAlert", (p) => {
    sendEnvelope({ kind: "managerAlert", payload: p, origin });
  });

  function sendEnvelope(env: BusEnvelope) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    try {
      socket.send(JSON.stringify(env));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[fatigueTransport] send failed", err);
    }
  }

  function scheduleReconnect() {
    if (disposed) return;
    const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
    attempt += 1;
    reconnectTimer = setTimeout(open, delay);
  }

  function open() {
    if (disposed) return;
    reconnectTimer = null;
    try {
      socket = new WebSocket(opts.url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[fatigueTransport] WebSocket construction failed", err);
      scheduleReconnect();
      return;
    }

    socket.addEventListener("open", () => {
      attempt = 0;
    });
    socket.addEventListener("close", () => {
      socket = null;
      scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      // close handler will fire next; nothing to do here.
    });
    socket.addEventListener("message", (ev) => {
      const env = parseEnvelope(ev.data);
      if (!env) return;
      if (env.origin && env.origin === origin) return; // skip self-echo
      // Re-emit on local bus so toast/log/manager listeners pick it up.
      if (env.kind === "workerAlert") {
        fatigueAlertBus.emit("workerAlert", env.payload as WorkerAlertPayload);
      } else if (env.kind === "managerAlert") {
        fatigueAlertBus.emit("managerAlert", env.payload as ManagerAlertPayload);
      }
    });
  }

  open();

  return {
    disconnect() {
      disposed = true;
      offWorker();
      offManager();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.close(1000, "client disconnect");
        } catch {
          /* noop */
        }
      }
      socket = null;
    },
    get socket() {
      return socket;
    },
  };
}

function parseEnvelope(raw: unknown): BusEnvelope | null {
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const kind = (parsed as { kind?: unknown }).kind;
  const payload = (parsed as { payload?: unknown }).payload;
  if (kind !== "workerAlert" && kind !== "managerAlert") return null;
  if (!payload || typeof payload !== "object") return null;
  return parsed as BusEnvelope;
}

// --------------------------------------------------------------------------
// Web Push / Notification API transport
// --------------------------------------------------------------------------

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function getNotificationPermission(): PushPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/**
 * Requests OS-level notification permission. Safe to call multiple times;
 * subsequent calls just return the cached permission.
 */
export async function requestNotificationPermission(): Promise<PushPermission> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export interface PushTransportOptions {
  /** Only fire OS notifications for events at this level or above. */
  minLevel?: "moderate" | "high";
  /** Optional icon URL for the notification. */
  icon?: string;
}

export interface PushTransportHandle {
  disconnect(): void;
}

/**
 * Subscribes the alert bus to the Notification API. Falls back to a no-op
 * handle when notifications are unsupported or denied.
 */
export function subscribePushNotifications(
  opts: PushTransportOptions = {},
): PushTransportHandle {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return { disconnect() { /* noop */ } };
  }

  const minLevel = opts.minLevel ?? "high";
  const icon = opts.icon;

  const fire = (title: string, body: string, tag: string) => {
    try {
      // Ignore the constructed instance — Notification keeps itself alive.
      void new Notification(title, { body, tag, icon });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[fatigueTransport] Notification failed", err);
    }
  };

  const offWorker = fatigueAlertBus.on("workerAlert", (p) => {
    if (minLevel === "high" && p.level !== "high") return;
    fire(
      p.level === "high" ? "High fatigue risk" : "Elevated fatigue risk",
      `${p.workerName ?? p.workerId}: score ${p.score}/100`,
      `worker-${p.workerId}`,
    );
  });

  const offManager = fatigueAlertBus.on("managerAlert", (p) => {
    fire(
      `HIGH RISK — ${p.workerName ?? p.workerId}`,
      `Worker ${p.workerId} reached fatigue score ${p.score}/100`,
      `manager-${p.workerId}`,
    );
  });

  return {
    disconnect() {
      offWorker();
      offManager();
    },
  };
}
