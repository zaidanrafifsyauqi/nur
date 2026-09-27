/**
 * Stage 2B — public prayer service (browser-driven).
 *
 * Coordinates come from browser geolocation, so fetching happens on the
 * client. Pages call `getTwoDayPrayer()` / hooks — raw API objects stop
 * at the mapper and never reach UI components.
 */
import type { HijriDate, PrayerName } from "@/lib/types";
import {
  fetchPrayerDay,
  type PrayerApiDayData,
  type PrayerCoords,
} from "./api";
import { cacheDelete, cacheGet, cacheSet, prayerCacheKey } from "./cache";
import { PRAYER_CALC_CONFIG } from "./config";
import {
  ASR_SCHOOL_PARAM,
  methodShortLabel,
  type AsrSchool,
} from "./methods";
import {
  mapGregorianDate,
  mapHijriDate,
  mapTimingsToTimedPrayers,
  type TimedPrayer,
} from "./mapper";
import { toApiDatePath } from "./time";

export type { PrayerCoords };
export type { TimedPrayer };
export type { PrayerApiError } from "./api";
export { PRAYER_CALC_CONFIG };
export type { AsrSchool } from "./methods";

/** Stage 4C — calculation inputs; defaults preserve existing behavior. */
export interface PrayerCalcInput {
  methodId?: number;
  school?: AsrSchool;
}

function resolveCalc(calc?: PrayerCalcInput): { methodId: number; school: AsrSchool } {
  return {
    methodId: calc?.methodId ?? PRAYER_CALC_CONFIG.methodId,
    school: calc?.school ?? PRAYER_CALC_CONFIG.school,
  };
}

export interface PrayerDayBundle {
  dateKey: string;
  prayers: TimedPrayer[];
  hijri: HijriDate;
  gregorianDate: string;
  timezone: string;
  methodLabel: string;
}

function bundleFromApi(
  data: PrayerApiDayData,
  dateKey: string,
  methodId: number
): PrayerDayBundle {
  return {
    dateKey,
    prayers: mapTimingsToTimedPrayers(data.timings, data.date.gregorian),
    hijri: mapHijriDate(data.date.hijri),
    gregorianDate: mapGregorianDate(data.date.gregorian),
    timezone: data.meta.timezone,
    methodLabel: methodShortLabel(methodId),
  };
}

function getCachedDay(
  coords: PrayerCoords,
  apiDatePath: string,
  calc: { methodId: number; school: AsrSchool }
): Promise<PrayerApiDayData> {
  const key = prayerCacheKey(coords, apiDatePath, calc.methodId, ASR_SCHOOL_PARAM[calc.school]);
  const hit = cacheGet(key);
  if (hit) return hit;
  const pending = fetchPrayerDay(
    coords,
    apiDatePath,
    calc.methodId,
    ASR_SCHOOL_PARAM[calc.school]
  );
  cacheSet(key, pending);
  // Drop failures so a later retry refetches instead of reusing rejection.
  pending.catch(() => {
    if (cacheGet(key) === pending) cacheDelete(key);
  });
  return pending;
}

export interface TwoDayPrayer {
  today: PrayerDayBundle;
  tomorrow: PrayerDayBundle;
}

/**
 * Fetch today + tomorrow (parallel, cached). Tomorrow is needed so that
 * after Isha the next prayer correctly becomes tomorrow's Fajr.
 * Stage 4C: optional calc overrides (method/school); time format is
 * presentation-only and never reaches this layer.
 */
export async function getTwoDayPrayer(
  coords: PrayerCoords,
  now: Date = new Date(),
  calc?: PrayerCalcInput
): Promise<TwoDayPrayer> {
  const resolved = resolveCalc(calc);
  const todayPath = toApiDatePath(now);
  const tomorrowDate = new Date(now.getTime() + 24 * 3600 * 1000);
  const tomorrowPath = toApiDatePath(tomorrowDate);

  const [todayApi, tomorrowApi] = await Promise.all([
    getCachedDay(coords, todayPath, resolved),
    getCachedDay(coords, tomorrowPath, resolved),
  ]);

  return {
    today: bundleFromApi(todayApi, todayPath, resolved.methodId),
    tomorrow: bundleFromApi(tomorrowApi, tomorrowPath, resolved.methodId),
  };
}

export const PRAYER_NAMES: PrayerName[] = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
];
