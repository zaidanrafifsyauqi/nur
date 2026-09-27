"use client";

import { formatPrayerTime } from "@/lib/services/prayer/timeFormat";
import { usePrayerPreferences } from "@/lib/prayer/usePrayerPreferences";
import { cn } from "@/lib/utils";
import type { Prayer } from "@/lib/types";

/**
 * Stage 4C — preference-aware prayer time display.
 * 24h renders the existing 24h `time` field; 12h renders the existing
 * `displayTime` field. Same source data, presentation only — switching
 * formats never refetches, never touches countdown math.
 */
export function PrayerTime({
  prayer,
  className,
}: {
  prayer: Pick<Prayer, "name" | "time" | "displayTime">;
  className?: string;
}) {
  const { prefs } = usePrayerPreferences();
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      <span aria-hidden="true">{formatPrayerTime(prayer.time, prayer.displayTime, prefs.timeFormat)}</span>
      <span className="sr-only">
        {prayer.name} at {formatPrayerTime(prayer.time, prayer.displayTime, prefs.timeFormat)}
      </span>
    </span>
  );
}

/**
 * Same formatting for TimedPrayer (next-prayer) values, which carry a
 * Date + displayTime instead of the 24h string.
 */
export function formatNextPrayerTime(
  next: { date: Date; displayTime: string },
  format: "12h" | "24h"
): string {
  if (format === "12h") return next.displayTime;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(next.date.getHours())}:${pad(next.date.getMinutes())}`;
}
