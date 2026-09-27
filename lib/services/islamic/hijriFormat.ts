/**
 * Stage 2D — shared Hijri formatters (single source of truth).
 *
 * Operates on primitives so both the prayer flow (`HijriDate`) and the
 * calendar flow (`HijriMonthView` / `HijriCalendarDay`) share one
 * implementation — no duplicated format strings in components.
 */

export function formatHijriDate(day: string | number, monthName: string, year: string | number): string {
  return `${day} ${monthName} ${year} AH`;
}

export function formatHijriMonth(monthName: string, year: string | number): string {
  return `${monthName} ${year} AH`;
}

/** "24-09-2026" — the API's DD-MM-YYYY path format for gToH. */
export function toGregorianDatePath(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}
