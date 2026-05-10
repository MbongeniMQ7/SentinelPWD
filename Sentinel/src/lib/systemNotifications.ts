import { toast } from "sonner";
import type { PaymentStatus } from "@/lib/database.types";
import {
  getNotificationPermission,
  requestNotificationPermission,
  type PushPermission,
} from "@/lib/fatigue/transport";

export interface OwnerNotificationSettings {
  reg: boolean;
  sys: boolean;
  pay: boolean;
}

export interface AuditSignal {
  action_type?: string | null;
  description?: string | null;
}

export interface NotificationEvent {
  title: string;
  description: string;
  tag: string;
}

export const OWNER_NOTIFICATION_SETTINGS_KEY = "sentinel.owner.notification-settings";

export const DEFAULT_OWNER_NOTIFICATION_SETTINGS: OwnerNotificationSettings = {
  reg: true,
  sys: true,
  pay: false,
};

export function loadOwnerNotificationSettings(): OwnerNotificationSettings {
  if (typeof window === "undefined") return DEFAULT_OWNER_NOTIFICATION_SETTINGS;

  try {
    const raw = window.localStorage.getItem(OWNER_NOTIFICATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_OWNER_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<OwnerNotificationSettings>;
    return {
      reg: parsed.reg ?? DEFAULT_OWNER_NOTIFICATION_SETTINGS.reg,
      sys: parsed.sys ?? DEFAULT_OWNER_NOTIFICATION_SETTINGS.sys,
      pay: parsed.pay ?? DEFAULT_OWNER_NOTIFICATION_SETTINGS.pay,
    };
  } catch {
    return DEFAULT_OWNER_NOTIFICATION_SETTINGS;
  }
}

export function saveOwnerNotificationSettings(settings: OwnerNotificationSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OWNER_NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
}

export async function enableDesktopNotificationsIfNeeded(
  settings: OwnerNotificationSettings,
): Promise<PushPermission> {
  if (!settings.reg && !settings.sys && !settings.pay) {
    return getNotificationPermission();
  }

  const permission = getNotificationPermission();
  if (permission !== "default") return permission;
  return requestNotificationPermission();
}

export function emitOwnerNotification(event: NotificationEvent): void {
  toast(event.title, {
    description: event.description,
    duration: 8000,
  });

  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  try {
    void new Notification(event.title, {
      body: event.description,
      tag: event.tag,
    });
  } catch {
    // Ignore browser notification failures and keep the toast path alive.
  }
}

export function isServerPerformanceSignal(signal: AuditSignal): boolean {
  const actionType = (signal.action_type ?? "").toUpperCase();
  const description = (signal.description ?? "").toLowerCase();

  if (
    actionType === "SYSTEM_WARNING" ||
    actionType === "SERVER_PERFORMANCE_DROP" ||
    actionType === "LATENCY_ALERT"
  ) {
    return true;
  }

  return ["server", "performance", "latency", "degraded", "response time"].some((term) =>
    description.includes(term),
  );
}

export function isMonthlyBillingRetry(paymentDate: string, status: PaymentStatus): boolean {
  if (status !== "FAILED" && status !== "PENDING") return false;

  const payment = new Date(paymentDate);
  const now = new Date();
  return (
    payment.getFullYear() === now.getFullYear() &&
    payment.getMonth() === now.getMonth()
  );
}

export function sameNotificationSettings(
  left: OwnerNotificationSettings,
  right: OwnerNotificationSettings,
): boolean {
  return left.reg === right.reg && left.sys === right.sys && left.pay === right.pay;
}