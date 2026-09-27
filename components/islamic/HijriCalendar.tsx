import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Card } from "@/components/ui/controls";
import { formatHijriMonth } from "@/lib/services/islamic/hijriFormat";
import type { HijriCalendarDay, HijriMonthView } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const WEEKDAY_OFFSET: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

function monthHref(month: number, year: number): string {
  return `/islamic/hijri?month=${month}&year=${year}`;
}

function DayCell({ day }: { day: HijriCalendarDay }) {
  return (
    <td
      aria-current={day.isToday ? "date" : undefined}
      title={
        day.events.length > 0
          ? `${day.hijriDay} ${day.hijriMonthName}: ${day.events.join("; ")}`
          : `${day.hijriDay} ${day.hijriMonthName} · ${day.gregorianDay} ${day.gregorianMonthName}`
      }
      className={cn(
        "rounded-xl border p-1.5 text-center align-top sm:p-2",
        day.isToday
          ? "border-nur-gold bg-nur-sand/70 font-bold dark:bg-[var(--nur-surface-2)]"
          : "border-[var(--nur-border)]"
      )}
    >
      <span className="block text-[15px] leading-tight sm:text-base">
        {day.hijriDay}
      </span>
      <span className="block text-[10px] leading-tight text-[var(--nur-text-secondary)] sm:text-[11px]">
        {day.gregorianDay} {day.gregorianMonthName.slice(0, 3)}
      </span>
      {day.isToday ? (
        <span className="mt-0.5 inline-block rounded-full bg-nur-gold px-1.5 text-[9px] font-bold uppercase tracking-wide text-nur-ink">
          Today
        </span>
      ) : day.events.length > 0 ? (
        <span className="mt-1 flex justify-center gap-0.5" aria-hidden="true">
          <span className="h-1 w-1 rounded-full bg-nur-gold" />
        </span>
      ) : null}
      {day.events.length > 0 && !day.isToday ? (
        <span className="sr-only">Has events: {day.events.join("; ")}</span>
      ) : null}
    </td>
  );
}

/**
 * Stage 2D — monthly Hijri calendar (server-rendered, SPA navigation via
 * Links — no full browser reload, no client state).
 */
export function HijriCalendar({
  view,
  prev,
  next,
}: {
  view: HijriMonthView;
  prev: { month: number; year: number };
  next: { month: number; year: number };
}) {
  const firstOffset = WEEKDAY_OFFSET[view.days[0]?.weekday ?? ""] ?? 0;
  const cells: (HijriCalendarDay | null)[] = [
    ...Array<null>(firstOffset).fill(null),
    ...view.days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (HijriCalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const eventDays = view.days.filter((d) => d.events.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="hijri-month-heading"
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
            >
              <CalendarDays
                className="h-5 w-5 text-nur-deep dark:text-nur-gold"
                aria-hidden
              />
              {formatHijriMonth(view.hijriMonthName, view.hijriYear)}
            </h2>
            <p lang="ar" dir="rtl" className="font-arabic text-right text-sm text-[var(--nur-text-secondary)]">
              {view.hijriMonthNameArabic}
            </p>
          </div>
          <nav aria-label="Hijri month navigation" className="flex items-center gap-2">
            <Link
              href={monthHref(prev.month, prev.year)}
              aria-label="Previous Hijri month"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--nur-border)] px-3 text-sm font-medium"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
            </Link>
            <Link
              href="/islamic/hijri"
              aria-label="Go to today"
              className="flex min-h-[44px] items-center justify-center rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
            >
              Today
            </Link>
            <Link
              href={monthHref(next.month, next.year)}
              aria-label="Next Hijri month"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--nur-border)] px-3 text-sm font-medium"
            >
              <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </nav>
        </div>

        <table className="w-full table-fixed border-separate" style={{ borderSpacing: "6px 6px" }}>
          <caption className="sr-only">
            {formatHijriMonth(view.hijriMonthName, view.hijriYear)} — Hijri day with
            Gregorian date beneath
          </caption>
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--nur-text-secondary)]"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((day, ci) =>
                  day ? (
                    <DayCell key={day.gregorianDate} day={day} />
                  ) : (
                    <td key={`blank-${ri}-${ci}`} aria-hidden="true" />
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--nur-text-secondary)]">
          <Badge>{view.daysInMonth} days</Badge>
          <span>Hijri dates follow the {view.calendarMethod} calendar method via AlAdhan.</span>
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold">Events this month</h3>
        {eventDays.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
            No events reported by the API for this month.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {eventDays.map((d) => (
              <li
                key={d.gregorianDate}
                className="flex items-start gap-3 rounded-xl border border-[var(--nur-border)] px-3 py-2 text-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--nur-surface-2)] text-xs font-bold text-nur-deep dark:text-nur-gold">
                  {d.hijriDay}
                </span>
                <span>
                  <span className="block font-medium">
                    {d.hijriDay} {d.hijriMonthName} · {d.gregorianDay}{" "}
                    {d.gregorianMonthName}
                  </span>
                  <span className="block text-xs text-[var(--nur-text-secondary)]">
                    {d.events.join(" · ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
