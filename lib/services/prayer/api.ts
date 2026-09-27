/**
 * Stage 2B — AlAdhan API client (coordinate-based timings).
 *
 * Endpoint: GET https://api.aladhan.com/v1/timings/{DD-MM-YYYY}
 *   ?latitude={lat}&longitude={lng}&method={id}[&school=..]
 * No API key required. CORS is open (`access-control-allow-origin: *`),
 * so the browser may call it directly — coordinates are sent nowhere else.
 *
 * Types below mirror the observed response shape exactly.
 */

const API_BASE = "https://api.aladhan.com/v1";

export interface PrayerApiTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
}

export interface PrayerApiHijriDate {
  date: string;
  day: string;
  weekday: { en: string; ar: string };
  month: { number: number; en: string; ar: string };
  year: string;
  designation: { abbreviated: string; expanded: string };
}

export interface PrayerApiGregorianDate {
  date: string;
  day: string;
  weekday: { en: string };
  month: { number: number; en: string };
  year: string;
  designation: { abbreviated: string; expanded: string };
}

export interface PrayerApiDate {
  readable: string;
  timestamp: string;
  hijri: PrayerApiHijriDate;
  gregorian: PrayerApiGregorianDate;
}

export interface PrayerApiMeta {
  latitude: number;
  longitude: number;
  timezone: string;
  method: { id: number; name: string };
}

export interface PrayerApiDayData {
  timings: PrayerApiTimings;
  date: PrayerApiDate;
  meta: PrayerApiMeta;
}

export interface PrayerApiResponse {
  code: number;
  status: string;
  data: PrayerApiDayData;
}

export class PrayerApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrayerApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPrayerApiDayData(value: unknown): value is PrayerApiDayData {
  if (!isRecord(value)) return false;
  const { timings, date, meta } = value;
  if (!isRecord(timings)) return false;
  for (const key of ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
    if (typeof timings[key] !== "string") return false;
  }
  if (!isRecord(date) || !isRecord(date.hijri) || !isRecord(date.gregorian)) return false;
  const hijri = date.hijri as Record<string, unknown>;
  const gregorian = date.gregorian as Record<string, unknown>;
  if (
    typeof hijri.day !== "string" ||
    typeof hijri.year !== "string" ||
    !isRecord(hijri.month) ||
    typeof (hijri.month as Record<string, unknown>).en !== "string"
  ) {
    return false;
  }
  if (
    typeof gregorian.day !== "string" ||
    typeof gregorian.year !== "string" ||
    !isRecord(gregorian.weekday) ||
    typeof (gregorian.weekday as Record<string, unknown>).en !== "string" ||
    !isRecord(gregorian.month) ||
    typeof (gregorian.month as Record<string, unknown>).en !== "string"
  ) {
    return false;
  }
  if (!isRecord(meta) || typeof meta.timezone !== "string") return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PrayerCoords {
  lat: number;
  lng: number;
}

export function assertValidCoords(coords: PrayerCoords): void {
  const { lat, lng } = coords;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new PrayerApiError("Invalid coordinates.");
  }
}

/**
 * Fetch one day of timings. Retries 429/5xx + network errors with backoff.
 * Runs in the browser (client component) — never from Server Components,
 * since coordinates originate from browser geolocation.
 *
 * Stage 4C: optional Asr `school` (0 = Shafi/STANDARD default, 1 = Hanafi)
 * appended only when explicitly passed — existing callers produce the
 * exact same URL as before.
 */
export async function fetchPrayerDay(
  coords: PrayerCoords,
  datePath: string,
  methodId: number,
  school?: 0 | 1,
  attempts = 3
): Promise<PrayerApiDayData> {
  assertValidCoords(coords);
  const url =
    `${API_BASE}/timings/${datePath}` +
    `?latitude=${coords.lat}&longitude=${coords.lng}&method=${methodId}` +
    (school === undefined ? "" : `&school=${school}`);

  let delayMs = 800;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch {
      clearTimeout(timeout);
      if (attempt === attempts - 1) throw new PrayerApiError("Prayer API unreachable.");
      await sleep(delayMs);
      delayMs *= 2;
      continue;
    } finally {
      clearTimeout(timeout);
    }
    if (res.ok) {
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new PrayerApiError("Prayer response was not valid JSON.");
      }
      const data = (json as Partial<PrayerApiResponse>).data;
      if (!isPrayerApiDayData(data)) {
        throw new PrayerApiError("Prayer response was malformed.");
      }
      return data;
    }
    try {
      await res.arrayBuffer();
    } catch {
      // ignore drain errors before retry
    }
    if (attempt === attempts - 1 || (res.status !== 429 && res.status < 500)) {
      throw new PrayerApiError(`Prayer request failed (${res.status}).`);
    }
    await sleep(delayMs + Math.floor(Math.random() * 400));
    delayMs *= 2;
  }
  throw new PrayerApiError("Prayer API unreachable.");
}
