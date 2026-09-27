/**
 * Stage 2B — time parsing / formatting utilities for prayer times.
 *
 * All parsing lives here — never scattered across components.
 * AlAdhan may return "04:32" or "04:32 (WIB)"; both are accepted.
 *
 * Timezone note: API times are expressed in the location's local time
 * (see `meta.timezone`). We interpret HH:mm on the API's gregorian date
 * in the *browser's* local zone, which is correct whenever the user is
 * at (or in the same zone as) the coordinates — the normal case for a
 * GPS-driven prayer app. Display strings are derived from the parsed
 * HH:mm directly, so they stay correct regardless of zone.
 */

export interface ParsedClockTime {
  hours: number;
  minutes: number;
}

const TIME_RE = /^(\d{1,2}):(\d{2})/;

/** "04:32 (WIB)" → { hours: 4, minutes: 32 }. Throws on garbage. */
export function parseApiTime(raw: string): ParsedClockTime {
  const trimmed = raw.trim();
  const match = TIME_RE.exec(trimmed);
  if (!match) throw new Error(`Unparseable prayer time: ${raw}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Unparseable prayer time: ${raw}`);
  return { hours, minutes };
}

/** {4,32} → "4:32 AM". Pure display helper, no Date involved. */
export function toDisplayTime(t: ParsedClockTime): string {
  const suffix = t.hours >= 12 ? "PM" : "AM";
  const h12 = t.hours % 12 === 0 ? 12 : t.hours % 12;
  return `${h12}:${String(t.minutes).padStart(2, "0")} ${suffix}`;
}

/** API gregorian parts → browser-local Date at given clock time. */
export function buildPrayerDate(
  gregorian: { day: string; monthNumber: number; year: string },
  t: ParsedClockTime
): Date {
  return new Date(
    Number(gregorian.year),
    gregorian.monthNumber - 1,
    Number(gregorian.day),
    t.hours,
    t.minutes,
    0,
    0
  );
}

/** ms → "02:14:37" (clamped at zero, hours may exceed 24). */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Date → "DD-MM-YYYY" path for the AlAdhan dated endpoint. */
export function toApiDatePath(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** Local "YYYY-MM-DD" key for date-change detection. */
export function toLocalDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
