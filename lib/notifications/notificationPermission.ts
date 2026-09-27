"use client";

/**
 * Stage 5B — browser Notification permission abstraction (client only).
 *
 * Preference-enabled and permission-granted are deliberately separate
 * concepts; UI must handle all four states. Nothing here requests
 * permission by itself — requests happen only from explicit user actions.
 * All functions are SSR-safe (false/"unsupported" outside the browser).
 */

export type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied";

export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

/** Current permission without prompting. Never triggers a browser dialog. */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  const permission = window.Notification.permission;
  if (permission === "granted" || permission === "denied" || permission === "default") {
    return permission;
  }
  return "default";
}

/**
 * MUST be called from a user gesture (button click). Resolves to the
 * resulting permission, or "denied" when the API throws/refuses.
 * Never called on page load, mount, hydration, or geolocation events.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const result = await window.Notification.requestPermission();
    if (result === "granted" || result === "denied" || result === "default") {
      return result;
    }
    return getNotificationPermission();
  } catch {
    return getNotificationPermission();
  }
}
