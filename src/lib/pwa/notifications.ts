import { hasNotifications } from "./capabilities";

// Notification permission adapter — U13 D1a. This module only resolves and
// requests permission after its caller decides a user gesture occurred; it never
// creates an OS notification or observes session completion.

type NotificationPermissionResult = "default" | "denied" | "granted";

interface NotificationApiLike {
  permission: unknown;
  requestPermission: () => Promise<unknown>;
}

function normalizePermission(value: unknown): NotificationPermissionResult {
  return value === "granted" || value === "denied" ? value : "default";
}

function getNotificationApi(): NotificationApiLike | null {
  try {
    if (!hasNotifications()) {
      return null;
    }
    const api = window.Notification;
    return typeof api?.requestPermission === "function" ? api : null;
  } catch {
    return null;
  }
}

/** True only when the browser exposes a usable permission-request API. */
export function canRequestNotificationPermission(): boolean {
  return getNotificationApi() !== null;
}

/**
 * Best-effort permission request. Call this only from an explicit user gesture.
 * Unsupported, denied, synchronous, and rejected paths resolve to a safe value.
 */
export function requestNotificationPermission(): Promise<NotificationPermissionResult> {
  const api = getNotificationApi();
  if (api === null) return Promise.resolve("default");

  try {
    const currentPermission = normalizePermission(api.permission);
    if (currentPermission !== "default") {
      return Promise.resolve(currentPermission);
    }
    return Promise.resolve(api.requestPermission()).then(
      normalizePermission,
      () => "default",
    );
  } catch {
    return Promise.resolve("default");
  }
}
