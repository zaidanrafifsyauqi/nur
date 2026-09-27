/**
 * Stage 2B — session-only in-memory cache for prayer API responses.
 *
 * Keyed by rounded coords + API date + method, so a session/location/date
 * never triggers repeat network calls (e.g. navigating Home ↔ Prayer).
 * Deliberately NOT persisted (privacy: no coordinates in localStorage).
 */
import type { PrayerApiDayData, PrayerCoords } from "./api";

const store = new Map<string, Promise<PrayerApiDayData>>();

export function prayerCacheKey(
  coords: PrayerCoords,
  datePath: string,
  methodId: number,
  school: 0 | 1
): string {
  return `${coords.lat.toFixed(3)}|${coords.lng.toFixed(3)}|${datePath}|${methodId}|${school}`;
}

export function cacheGet(key: string): Promise<PrayerApiDayData> | undefined {
  return store.get(key);
}

export function cacheSet(key: string, pending: Promise<PrayerApiDayData>): void {
  store.set(key, pending);
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

/** For tests only. */
export function cacheClear(): void {
  store.clear();
}
