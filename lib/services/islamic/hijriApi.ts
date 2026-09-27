/**
 * Stage 2D — AlAdhan Islamic calendar API client (server-side only).
 *
 * Endpoints used (no API key required):
 * - GET https://api.aladhan.com/v1/hToGCalendar/{hijriMonth}/{hijriYear}
 *   → every day of one Hijri month with Gregorian pairing (1 req / month).
 * - GET https://api.aladhan.com/v1/gToH?date={DD-MM-YYYY}
 *   → single Gregorian → Hijri conversion (for "today").
 *
 * Path-style params are required; query-style (?month=&year=) 404s.
 * No coordinates are sent — conversion needs none.
 * Never import this module from Client Components.
 */

const API_BASE = "https://api.aladhan.com/v1";

export interface HijriApiMonthName {
  number: number;
  en: string;
  ar: string;
}

export interface HijriApiDay {
  hijri: {
    date: string;
    day: string;
    weekday: { en: string; ar: string };
    month: HijriApiMonthName;
    year: string;
    designation: { abbreviated: string; expanded: string };
    holidays: string[];
    /** Calendar calculation method reported by the API (e.g. "HJCoSA"). */
    method?: string;
  };
  gregorian: {
    date: string;
    day: string;
    weekday: { en: string };
    month: { number: number; en: string };
    year: string;
  };
}

export interface HijriApiCalendarResponse {
  code: number;
  status: string;
  data: HijriApiDay[];
}

export interface HijriApiSingleResponse {
  code: number;
  status: string;
  data: HijriApiDay;
}

export class HijriApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HijriApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHijriApiDay(value: unknown): value is HijriApiDay {
  if (!isRecord(value)) return false;
  const { hijri, gregorian } = value;
  if (!isRecord(hijri) || !isRecord(gregorian)) return false;
  const h = hijri as Record<string, unknown>;
  const g = gregorian as Record<string, unknown>;
  if (typeof h.day !== "string" || typeof h.year !== "string") return false;
  if (!isRecord(h.month)) return false;
  const hm = h.month as Record<string, unknown>;
  if (typeof hm.number !== "number" || typeof hm.en !== "string") return false;
  if (
    typeof g.date !== "string" ||
    typeof g.day !== "string" ||
    typeof g.year !== "string"
  ) {
    return false;
  }
  if (!isRecord(g.weekday) || typeof (g.weekday as Record<string, unknown>).en !== "string") {
    return false;
  }
  if (!isRecord(g.month)) return false;
  const gm = g.month as Record<string, unknown>;
  if (typeof gm.number !== "number" || typeof gm.en !== "string") return false;
  if (!Array.isArray(h.holidays) || !h.holidays.every((e) => typeof e === "string")) {
    return false;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let delayMs = 800;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { next: { revalidate: 86400 } });
    } catch {
      if (attempt === attempts - 1) throw new HijriApiError("Hijri API unreachable.");
      await sleep(delayMs);
      delayMs *= 2;
      continue;
    }
    if (res.ok) return res;
    try {
      await res.arrayBuffer();
    } catch {
      // ignore drain errors before retry
    }
    if (attempt === attempts - 1 || (res.status !== 429 && res.status < 500)) {
      throw new HijriApiError(`Hijri request failed (${res.status}).`);
    }
    await sleep(delayMs + Math.floor(Math.random() * 400));
    delayMs *= 2;
  }
  throw new HijriApiError("Hijri API unreachable.");
}

async function parseDayList(res: Response): Promise<HijriApiDay[]> {
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new HijriApiError("Hijri response was not valid JSON.");
  }
  const data = (json as Partial<HijriApiCalendarResponse>).data;
  if (!Array.isArray(data) || data.length === 0 || !data.every(isHijriApiDay)) {
    throw new HijriApiError("Hijri response was malformed.");
  }
  return data;
}

/** Every day of one Hijri month (29 or 30 days — count comes from the API). */
export async function fetchHijriMonth(
  hijriMonth: number,
  hijriYear: number
): Promise<HijriApiDay[]> {
  const res = await fetchWithRetry(`${API_BASE}/hToGCalendar/${hijriMonth}/${hijriYear}`);
  return parseDayList(res);
}

/** Single Gregorian → Hijri conversion (used for "today"). */
export async function fetchHijriForGregorian(datePath: string): Promise<HijriApiDay> {
  const res = await fetchWithRetry(`${API_BASE}/gToH?date=${datePath}`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new HijriApiError("Hijri response was not valid JSON.");
  }
  const data = (json as Partial<HijriApiSingleResponse>).data;
  if (!isHijriApiDay(data)) throw new HijriApiError("Hijri response was malformed.");
  return data;
}
