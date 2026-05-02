/**
 * Manager-side global alert listener.
 *
 * Mounted once at the app root. Responsibilities:
 *
 *   1. Surface `managerAlert` events as sonner toasts so any admin/owner
 *      using the system gets a notification when a worker enters High risk —
 *      even if they aren't currently on the alerts page.
 *   2. Initialise the in-process alert log so events that fire while no
 *      admin page is mounted are still captured.
 *   3. Bridge the alert bus to optional WebSocket / Push transports when
 *      the environment is configured for them. Both transports degrade
 *      gracefully when unavailable.
 *
 * The WebSocket URL is read from `VITE_FATIGUE_WS_URL` at build time. Push
 * notifications are opt-in: we lazily request permission the first time a
 * managerAlert is observed so we don't spam the user on first load.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { fatigueAlertBus } from "@/lib/fatigue/alertBus";
import { useAlertLog } from "@/lib/fatigue/alertLog";
import {
  connectFatigueWebSocket,
  getNotificationPermission,
  requestNotificationPermission,
  subscribePushNotifications,
  type PushTransportHandle,
  type WebSocketTransportHandle,
} from "@/lib/fatigue/transport";

export function ManagerAlertListener() {
  // Calling the hook (even unused) wires the alert log to the bus so events
  // are captured app-wide.
  useAlertLog();

  const pushHandleRef = useRef<PushTransportHandle | null>(null);
  const wsHandleRef = useRef<WebSocketTransportHandle | null>(null);

  // Toast on managerAlert.
  useEffect(() => {
    const off = fatigueAlertBus.on("managerAlert", (p) => {
      toast.error(`HIGH RISK — ${p.workerName ?? p.workerId}`, {
        description: `Fatigue score ${p.score}/100. Worker ID: ${p.workerId}`,
        duration: 10_000,
      });
    });
    return off;
  }, []);

  // Connect the optional WebSocket transport once. Re-emits remote alerts on
  // the local bus so the toast + log + manager UI all see them transparently.
  useEffect(() => {
    const url = (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
      .env?.VITE_FATIGUE_WS_URL;
    if (!url) return;
    wsHandleRef.current = connectFatigueWebSocket({ url });
    return () => {
      wsHandleRef.current?.disconnect();
      wsHandleRef.current = null;
    };
  }, []);

  // Lazily request OS notification permission the first time we see a
  // managerAlert, then wire push notifications.
  useEffect(() => {
    let cancelled = false;
    const off = fatigueAlertBus.on("managerAlert", () => {
      if (pushHandleRef.current) return;
      const perm = getNotificationPermission();
      if (perm === "unsupported" || perm === "denied") return;
      if (perm === "granted") {
        pushHandleRef.current = subscribePushNotifications({ minLevel: "high" });
        return;
      }
      void requestNotificationPermission().then((p) => {
        if (cancelled || p !== "granted" || pushHandleRef.current) return;
        pushHandleRef.current = subscribePushNotifications({ minLevel: "high" });
      });
    });
    return () => {
      cancelled = true;
      off();
      pushHandleRef.current?.disconnect();
      pushHandleRef.current = null;
    };
  }, []);

  return null;
}
