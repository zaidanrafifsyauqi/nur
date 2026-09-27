/**
 * Stage 2D — public Hijri service (server-side).
 *
 * Exposes NUR internal types only. No coordinates involved: conversion is
 * deterministic per date + API calendar method. Prayer geolocation stays
 * fully separate.
 */
import type { HijriDate, HijriMonthView } from "@/lib/types";
import { fetchHijriForGregorian, fetchHijriMonth, HijriApiError } from "./hijriApi";
import { HIJRI_YEAR_MAX, HIJRI_YEAR_MIN } from "./hijriConfig";
import { toGregorianDatePath } from "./hijriFormat";
import { mapApiDayToHijriDate, mapApiMonthToView } from "./hijriMapper";

export type { HijriApiError };
export type { HijriCalendarDay, HijriMonthView } from "@/lib/types";

/** Today's Hijri date (single conversion, cached 1 day). */
export async function getTodayHijri(now: Date = new Date()): Promise<HijriDate> {
  const day = await fetchHijriForGregorian(toGregorianDatePath(now));
  return mapApiDayToHijriDate(day);
}

/**
 * Today's reference for calendar navigation: display date plus the
 * numeric month/year the month view falls back to on invalid params.
 * Same cached request as getTodayHijri — no extra network call.
 */
export async function getTodayReference(now: Date = new Date()): Promise<{
  hijri: HijriDate;
  month: number;
  year: number;
}> {
  const day = await fetchHijriForGregorian(toGregorianDatePath(now));
  return {
    hijri: mapApiDayToHijriDate(day),
    month: day.hijri.month.number,
    year: Number(day.hijri.year),
  };
}

/** Full Hijri month view (29/30 days — count from the API, never assumed). */
export async function getHijriMonthView(
  hijriMonth: number,
  hijriYear: number,
  now: Date = new Date()
): Promise<HijriMonthView> {
  const days = await fetchHijriMonth(hijriMonth, hijriYear);
  return mapApiMonthToView(days, hijriMonth, hijriYear, now);
}

export function isValidHijriMonth(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
}

export function isValidHijriYear(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= HIJRI_YEAR_MIN &&
    value <= HIJRI_YEAR_MAX
  );
}

/** Prev/next Hijri month with year rollover (navigation only, no date math). */
export function shiftHijriMonth(
  month: number,
  year: number,
  delta: -1 | 1
): { month: number; year: number } {
  const total = year * 12 + (month - 1) + delta;
  return { month: (total % 12) + 1, year: Math.floor(total / 12) };
}
