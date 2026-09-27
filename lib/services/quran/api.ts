/**
 * Stage 2A — Al Quran Cloud API client (server-side only).
 *
 * Endpoints used (no API key required):
 * - GET https://api.alquran.cloud/v1/surah
 *   → surah metadata for the /quran listing (no verse content).
 * - GET https://api.alquran.cloud/v1/surah/{surah}/editions/quran-uthmani,id.indonesian
 *   → Arabic (Uthmani) + Indonesian translation for /quran/[surah].
 *
 * Never import this module from Client Components.
 */

const API_BASE = "https://api.alquran.cloud/v1";

export { API_BASE };

export const QURAN_ARABIC_EDITION = "quran-uthmani";
export const QURAN_INDONESIAN_EDITION = "id.indonesian";

/** Surah metadata item from GET /surah */
export interface QuranApiSurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
}

export interface QuranApiListResponse {
  code: number;
  status: string;
  data: QuranApiSurahMeta[];
}

export interface QuranApiAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
}

export interface QuranApiEditionInfo {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: string;
  type: string;
  direction: string;
}

export interface QuranApiSurahEdition {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: "Meccan" | "Medinan";
  numberOfAyahs: number;
  ayahs: QuranApiAyah[];
  edition: QuranApiEditionInfo;
}

export interface QuranApiSurahEditionsResponse {
  code: number;
  status: string;
  data: QuranApiSurahEdition[];
}

export class QuranApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuranApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The public API rate-limits bursts (HTTP 429) — e.g. when prerendering all
 * 114 surahs. Retry 429/5xx with exponential backoff (+jitter), honoring
 * Retry-After when present. 404s are returned immediately (invalid surah).
 * Audio fetching (Stage 2C) reuses this with its own attempts budget.
 */
export async function fetchWithRetry(url: string, attempts = 5): Promise<Response> {
  let delayMs = 1000;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { next: { revalidate: 86400 } });
    } catch {
      if (attempt === attempts - 1) throw new QuranApiError("Quran API unreachable.");
      await sleep(delayMs);
      delayMs *= 2;
      continue;
    }
    if (res.status === 404 || (res.ok && res.status < 500)) return res;
    // Drain body before retrying so sockets are released.
    try {
      await res.arrayBuffer();
    } catch {
      // ignore drain errors
    }
    if (attempt === attempts - 1) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : delayMs + Math.floor(Math.random() * 500);
    await sleep(waitMs);
    delayMs *= 2;
  }
  throw new QuranApiError("Quran API unreachable.");
}

function isSurahMeta(value: unknown): value is QuranApiSurahMeta {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.number === "number" &&
    typeof v.name === "string" &&
    typeof v.englishName === "string" &&
    typeof v.englishNameTranslation === "string" &&
    typeof v.numberOfAyahs === "number" &&
    (v.revelationType === "Meccan" || v.revelationType === "Medinan")
  );
}

function isSurahEdition(value: unknown): value is QuranApiSurahEdition {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.number === "number" &&
    typeof v.name === "string" &&
    typeof v.englishName === "string" &&
    typeof v.englishNameTranslation === "string" &&
    (v.revelationType === "Meccan" || v.revelationType === "Medinan") &&
    typeof v.numberOfAyahs === "number" &&
    Array.isArray(v.ayahs) &&
    v.ayahs.every(
      (a) =>
        typeof a === "object" &&
        a !== null &&
        typeof (a as Record<string, unknown>).text === "string" &&
        typeof (a as Record<string, unknown>).numberInSurah === "number"
    )
  );
}

/** Metadata-only fetch for the listing page. Never pulls verse content. */
export async function fetchSurahList(): Promise<QuranApiSurahMeta[]> {
  const res = await fetchWithRetry(`${API_BASE}/surah`, 3);
  if (!res.ok) throw new QuranApiError(`Quran list request failed (${res.status}).`);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new QuranApiError("Quran list response was not valid JSON.");
  }
  const data = (json as Partial<QuranApiListResponse>).data;
  if (!Array.isArray(data) || data.length === 0 || !data.every(isSurahMeta)) {
    throw new QuranApiError("Quran list response was malformed.");
  }
  return data;
}

/**
 * Verse-content fetch for the detail page.
 * Returns [arabicEdition, indonesianEdition].
 */
export async function fetchSurahEditions(
  surahNumber: number
): Promise<[QuranApiSurahEdition, QuranApiSurahEdition]> {
  const res = await fetchWithRetry(
    `${API_BASE}/surah/${surahNumber}/editions/${QURAN_ARABIC_EDITION},${QURAN_INDONESIAN_EDITION}`
  );
  if (res.status === 404) {
    throw new QuranApiError("Surah not found.");
  }
  if (!res.ok) throw new QuranApiError(`Quran surah request failed (${res.status}).`);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new QuranApiError("Quran surah response was not valid JSON.");
  }
  const data = (json as Partial<QuranApiSurahEditionsResponse>).data;
  if (!Array.isArray(data) || data.length < 2) {
    throw new QuranApiError("Quran surah response was malformed.");
  }
  const [arabic, translation] = data;
  if (!isSurahEdition(arabic) || !isSurahEdition(translation)) {
    throw new QuranApiError("Quran surah response was malformed.");
  }
  if (arabic.ayahs.length === 0 || arabic.ayahs.length !== translation.ayahs.length) {
    throw new QuranApiError("Quran surah ayahs were mismatched.");
  }
  return [arabic, translation];
}

/**
 * Stage 4B — shared parsing for the bookmarks client island.
 *
 * Same endpoint + same validators as the server fetch above, minus the
 * Next fetch-cache options (client fetch ignores them). Lets bookmarked
 * surahs load their verses without a new backend endpoint and without
 * duplicating validation logic.
 */
export function surahEditionsUrl(surahNumber: number): string {
  return `${API_BASE}/surah/${surahNumber}/editions/${QURAN_ARABIC_EDITION},${QURAN_INDONESIAN_EDITION}`;
}

export function parseSurahEditionsResponse(
  json: unknown
): [QuranApiSurahEdition, QuranApiSurahEdition] {
  const data = (json as Partial<QuranApiSurahEditionsResponse>).data;
  if (!Array.isArray(data) || data.length < 2) {
    throw new QuranApiError("Quran surah response was malformed.");
  }
  const [arabic, translation] = data;
  if (!isSurahEdition(arabic) || !isSurahEdition(translation)) {
    throw new QuranApiError("Quran surah response was malformed.");
  }
  if (arabic.ayahs.length === 0 || arabic.ayahs.length !== translation.ayahs.length) {
    throw new QuranApiError("Quran surah ayahs were mismatched.");
  }
  return [arabic, translation];
}
