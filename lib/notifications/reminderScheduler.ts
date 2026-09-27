"use client";

/**
 * Stage 5B — foreground-only reminder scheduler (in-memory, module-level).
 *
 * - One timer per reminder id; re-scheduling the same id replaces the old
 *   timer (no duplicates, preference changes cleanly swap schedules).
 * - Past timestamps are never scheduled.
 * - setTimeout is a foreground/session mechanism ONLY: it does not survive
 *   closed browsers, suspended tabs, sleep, or background kills. Stage 5C
 *   may introduce Service Worker/PWA architecture for that — nothing here
 *   claims otherwise.
 */

interface ScheduledEntry {
  timeoutId: ReturnType<typeof setTimeout>;
}

const scheduled = new Map<string, ScheduledEntry>();

export function scheduleReminder(id: string, at: Date, onFire: () => void): boolean {
  cancelReminder(id);
  const delay = at.getTime() - Date.now();
  if (!(delay > 0)) return false;
  // setTimeout overflow guard (~24.8 days max); reminders are same/next-day.
  const safeDelay = Math.min(delay, 2147483647);
  const timeoutId = setTimeout(() => {
    scheduled.delete(id);
    onFire();
  }, safeDelay);
  scheduled.set(id, { timeoutId });
  return true;
}

export function cancelReminder(id: string): void {
  const entry = scheduled.get(id);
  if (!entry) return;
  clearTimeout(entry.timeoutId);
  scheduled.delete(id);
}

export function clearScheduledReminders(): void {
  for (const id of scheduled.keys()) cancelReminder(id);
}

/** For tests/diagnostics only. */
export function scheduledReminderIds(): string[] {
  return [...scheduled.keys()];
}
