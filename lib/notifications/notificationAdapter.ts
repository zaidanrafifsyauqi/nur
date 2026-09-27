"use client";

import {
  getNotificationPermission,
  isNotificationSupported,
} from "./notificationPermission";
import type { ReminderContent } from "./reminder";

/**
 * Stage 5B — delivery adapter. Uses the browser Notification API ONLY when
 * supported AND permission is granted at call time. Constructor failures
 * are caught and reported as false — never thrown, never crashing.
 */
export function notifyPrayerReminder(content: ReminderContent): boolean {
  if (!isNotificationSupported()) return false;
  if (getNotificationPermission() !== "granted") return false;
  try {
    const notification = new window.Notification(content.title, {
      body: content.body,
      tag: "nur-prayer-reminder",
    });
    // Some browsers require explicit show() handling; close accessors kept minimal.
    void notification;
    return true;
  } catch {
    return false;
  }
}
