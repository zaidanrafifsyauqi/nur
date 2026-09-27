/**
 * Stage 4C — centralized prayer time presentation formatter.
 *
 * Input is existing prayer data (24h "05:01" + 12h "5:01 AM" pair);
 * output is display-only. Internal Date/timestamp representation and
 * countdown math are never touched. No locale APIs, no timezone
 * conversion — deterministic strings only.
 */

export type PrayerTimeFormat = "12h" | "24h";

export function isPrayerTimeFormat(value: unknown): value is PrayerTimeFormat {
  return value === "12h" || value === "24h";
}

/** Pick the presentation string; 24h and 12h share the same source data. */
export function formatPrayerTime(time24: string, time12: string, format: PrayerTimeFormat): string {
  return format === "24h" ? time24 : time12;
}

/** {hours: 5, minutes: 1} → "05:01". Pure helper for TimedPrayer dates. */
export function formatClock24(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
