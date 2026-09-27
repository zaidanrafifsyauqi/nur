/**
 * Stage 2D — maps AlAdhan calendar responses to NUR internal types.
 *
 * Data flow: API → API type → mapper → NUR type (lib/types.ts) → UI.
 * Raw API objects must never reach React components.
 */
import type { HijriCalendarDay, HijriDate, HijriMonthView } from "@/lib/types";
import { HIJRI_CALENDAR_METHOD_FALLBACK } from "./hijriConfig";
import type { HijriApiDay } from "./hijriApi";

function toTodayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function mapApiDayToCalendarDay(
  day: HijriApiDay,
  todayKey: string
): HijriCalendarDay {
  return {
    hijriDay: Number(day.hijri.day),
    hijriMonth: day.hijri.month.number,
    hijriMonthName: day.hijri.month.en,
    hijriMonthNameArabic: day.hijri.month.ar ?? "",
    hijriYear: Number(day.hijri.year),
    gregorianDate: day.gregorian.date,
    gregorianDay: Number(day.gregorian.day),
    gregorianMonth: day.gregorian.month.number,
    gregorianMonthName: day.gregorian.month.en,
    gregorianYear: Number(day.gregorian.year),
    weekday: day.gregorian.weekday.en,
    isToday: day.gregorian.date === todayKey,
    events: [...day.hijri.holidays],
  };
}

export function mapApiMonthToView(
  days: HijriApiDay[],
  hijriMonth: number,
  hijriYear: number,
  today: Date = new Date()
): HijriMonthView {
  const todayKey = toTodayKey(today);
  const mapped = days.map((d) => mapApiDayToCalendarDay(d, todayKey));
  const first = days[0];
  const method = first.hijri.method ?? HIJRI_CALENDAR_METHOD_FALLBACK;
  return {
    hijriMonth,
    hijriMonthName: first.hijri.month.en,
    hijriMonthNameArabic: first.hijri.month.ar ?? "",
    hijriYear,
    daysInMonth: mapped.length,
    calendarMethod: method,
    days: mapped,
  };
}

/** Today's Hijri date in the shared internal shape (Home-compatible). */
export function mapApiDayToHijriDate(day: HijriApiDay): HijriDate {
  const formatted = `${day.hijri.day} ${day.hijri.month.en} ${day.hijri.year} ${day.hijri.designation.abbreviated}`;
  return {
    day: day.hijri.day,
    month: day.hijri.month.en,
    year: day.hijri.year,
    formatted,
    weekday: day.gregorian.weekday.en,
  };
}
