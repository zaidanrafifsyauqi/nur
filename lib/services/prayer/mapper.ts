/**
 * Stage 2B — maps AlAdhan responses to NUR internal types (lib/types.ts).
 * Raw API objects never reach React components.
 */
import type { HijriDate, Prayer, PrayerName } from "@/lib/types";
import type {
  PrayerApiGregorianDate,
  PrayerApiHijriDate,
  PrayerApiTimings,
} from "./api";
import { buildPrayerDate, parseApiTime, toDisplayTime } from "./time";

export const PRAYER_ORDER: PrayerName[] = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];

/** A prayer bound to an absolute timestamp (for next/countdown math). */
export interface TimedPrayer {
  name: PrayerName;
  date: Date;
  displayTime: string;
}

export function mapTimingsToTimedPrayers(
  timings: PrayerApiTimings,
  gregorian: PrayerApiGregorianDate
): TimedPrayer[] {
  const g = {
    day: gregorian.day,
    monthNumber: gregorian.month.number,
    year: gregorian.year,
  };
  return PRAYER_ORDER.map((name) => {
    const parsed = parseApiTime(timings[name]);
    return {
      name,
      date: buildPrayerDate(g, parsed),
      displayTime: toDisplayTime(parsed),
    };
  });
}

/** TimedPrayer → presentational Prayer (flags filled by next-prayer logic). */
export function toPrayerCard(p: TimedPrayer, passed: boolean, isNext: boolean): Prayer {
  const hh = String(p.date.getHours()).padStart(2, "0");
  const mm = String(p.date.getMinutes()).padStart(2, "0");
  return {
    name: p.name,
    time: `${hh}:${mm}`,
    displayTime: p.displayTime,
    passed,
    isNext,
    dateTime: p.date.toISOString(),
  };
}

export function mapHijriDate(h: PrayerApiHijriDate): HijriDate {
  const formatted = `${h.day} ${h.month.en} ${h.year} ${h.designation.abbreviated}`;
  return { day: h.day, month: h.month.en, year: h.year, formatted };
}

export function mapGregorianDate(g: PrayerApiGregorianDate): string {
  return `${g.weekday.en}, ${g.month.en} ${Number(g.day)}, ${g.year}`;
}
