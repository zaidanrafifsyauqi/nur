"use client";

import { useEffect } from "react";
import { notifyPrayerReminder } from "@/lib/notifications/notificationAdapter";
import { getNotificationPermission } from "@/lib/notifications/notificationPermission";
import {
  formatReminderBody,
  getReminderTime,
  isFutureReminder,
  reminderId,
} from "@/lib/notifications/reminder";
import {
  isReminderPrayerName,
} from "@/lib/notifications/notificationPreferences";
import {
  cancelReminder,
  scheduleReminder,
} from "@/lib/notifications/reminderScheduler";
import { useNotificationPreferences } from "@/lib/notifications/useNotificationPreferences";
import type { PrayerTimeFormat } from "@/lib/services/prayer/timeFormat";
import type { TimedPrayer } from "@/lib/services/prayer";
import { toLocalDateKey } from "@/lib/services/prayer/time";

/**
 * Stage 5B — foreground reminder sync (renders nothing).
 *
 * Derives ONE reminder from the currently loaded next prayer + the user's
 * notification preferences + prayer time-format preference, then keeps a
 * single module-level timer in sync: config changes replace the timer,
 * past reminders are never scheduled, unmount cancels. No API calls —
 * prayer data comes from the host's existing flow.
 */
export function PrayerReminderSync({
  next,
  timeFormat,
}: {
  /** Currently loaded next prayer (null while prayer data loads). */
  next: TimedPrayer | null;
  timeFormat: PrayerTimeFormat;
}) {
  const { prefs } = useNotificationPreferences();

  useEffect(() => {
    if (!next || !prefs.enabled) return;
    if (getNotificationPermission() !== "granted") return;
    if (!isReminderPrayerName(next.name) || !prefs.prayers[next.name]) return;

    const at = getReminderTime(next.date, prefs.offsetMinutes);
    if (!isFutureReminder(at)) return;
    const id = reminderId(toLocalDateKey(next.date), next.name, prefs.offsetMinutes);
    const body = formatReminderBody(next.name, next.date, next.displayTime, prefs.offsetMinutes, timeFormat);
    scheduleReminder(id, at, () => {
      notifyPrayerReminder({ title: "Prayer reminder", body });
    });
    return () => {
      cancelReminder(id);
    };
  }, [next, prefs, timeFormat]);

  return null;
}
