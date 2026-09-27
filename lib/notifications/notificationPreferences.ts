/**
 * Stage 5B — notification preferences model (pure, no DOM).
 *
 * Local-only reminder configuration. Prayer names reuse the existing
 * PrayerName type minus Sunrise (not a reminder target). Conservative
 * defaults: everything OFF until the user explicitly enables it.
 */
import type { PrayerName } from "@/lib/types";

export type ReminderPrayerName = Exclude<PrayerName, "Sunrise">;

export const REMINDER_PRAYERS: ReminderPrayerName[] = [
  "Fajr",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

/** Minutes before prayer. Fixed options only — no arbitrary input. */
export const REMINDER_OFFSETS = [0, 5, 10, 15] as const;
export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];

export const REMINDER_OFFSET_LABELS: Record<ReminderOffset, string> = {
  0: "At prayer time",
  5: "5 minutes before",
  10: "10 minutes before",
  15: "15 minutes before",
};

export interface NotificationPreferences {
  enabled: boolean;
  prayers: Record<ReminderPrayerName, boolean>;
  offsetMinutes: ReminderOffset;
}

export const NOTIF_PREFS_KEY = "nur:notifications:preferences:v1";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  prayers: { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false },
  offsetMinutes: 10,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Exported for the reminder sync island (prayer-name guard). */
export function isReminderPrayerName(value: unknown): value is ReminderPrayerName {
  return (
    value === "Fajr" ||
    value === "Dhuhr" ||
    value === "Asr" ||
    value === "Maghrib" ||
    value === "Isha"
  );
}

/** Strict validator — anything off-spec falls back to defaults. */
export function isNotificationPreferences(value: unknown): value is NotificationPreferences {
  if (!isRecord(value)) return false;
  if (typeof value.enabled !== "boolean") return false;
  if (!isRecord(value.prayers)) return false;
  for (const name of REMINDER_PRAYERS) {
    if (typeof value.prayers[name] !== "boolean") return false;
  }
  // Reject unknown prayer keys rather than silently keeping them.
  for (const key of Object.keys(value.prayers)) {
    if (!isReminderPrayerName(key)) return false;
  }
  if (
    typeof value.offsetMinutes !== "number" ||
    !(REMINDER_OFFSETS as readonly number[]).includes(value.offsetMinutes)
  ) {
    return false;
  }
  return true;
}

/** Safe parser: valid → as-is (normalized); anything else → defaults. */
export function parseNotificationPreferences(raw: string | null): NotificationPreferences {
  if (raw == null || raw.trim() === "") return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  if (!isNotificationPreferences(parsed)) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return {
    enabled: parsed.enabled,
    prayers: { ...parsed.prayers },
    offsetMinutes: parsed.offsetMinutes,
  };
}

export function serializeNotificationPreferences(prefs: NotificationPreferences): string {
  return JSON.stringify(prefs);
}

/** Browser-safe storage accessor — null on server / unavailable. */
export function getNotifStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}
