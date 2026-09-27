/**
 * Stage 5B — pure reminder calculation (no DOM, no timers).
 *
 * Source prayer Date objects are never mutated; formatting is deferred
 * to UI presentation (Stage 4C formatter).
 */
import type { ReminderPrayerName } from "./notificationPreferences";
import { formatClock24, type PrayerTimeFormat } from "@/lib/services/prayer/timeFormat";

/**
 * Reminder timestamp = prayer time minus offset. Pure arithmetic on the
 * existing prayer Date — the input is never altered.
 */
export function getReminderTime(prayerDate: Date, offsetMinutes: number): Date {
  return new Date(prayerDate.getTime() - offsetMinutes * 60 * 1000);
}

/** Only future reminders may be scheduled — stale ones are dropped. */
export function isFutureReminder(reminderTime: Date, now: Date = new Date()): boolean {
  return reminderTime.getTime() > now.getTime();
}

/**
 * Stable schedule id: date + prayer + offset. Same id ⇒ same reminder,
 * so re-syncs replace instead of duplicating. (Location/calculation
 * context changes produce a new prayer Date, hence naturally new ids —
 * stale timers are cancelled on resync.)
 */
export function reminderId(dateKey: string, prayer: ReminderPrayerName, offsetMinutes: number): string {
  return `nur-reminder:${dateKey}:${prayer}:${offsetMinutes}`;
}

export interface ReminderContent {
  title: string;
  body: string;
}

/**
 * Minimal body from trusted internal prayer data (no HTML, no user input).
 * Offset 0 → "at <time>"; otherwise → "in <N> minutes", both honoring the
 * user's 12h/24h presentation preference.
 */
export function formatReminderBody(
  prayerName: ReminderPrayerName,
  prayerDate: Date,
  displayTime12h: string,
  offsetMinutes: number,
  timeFormat: PrayerTimeFormat
): string {
  if (offsetMinutes <= 0) {
    const at =
      timeFormat === "24h"
        ? formatClock24(prayerDate.getHours(), prayerDate.getMinutes())
        : displayTime12h;
    return `${prayerName} is at ${at}.`;
  }
  return `${prayerName} is in ${offsetMinutes} minutes.`;
}
