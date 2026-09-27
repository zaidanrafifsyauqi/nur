/**
 * Stage 2F — Hadith API client (server-side only).
 *
 * PROVENANCE (§1 + §3):
 * - House Muslim API (api.housemuslim.org) was the first candidate but its
 *   API subdomain is unreachable (TCP connect timeout on http + https,
 *   3 attempts; main site + docs respond fine). REJECTED: cannot serve
 *   production traffic → documented here, not silently swapped.
 * - Sunnah.com official API requires an API key → rejected (no anonymous
 *   access; no scraping, no unofficial proxy).
 * - api.hadith.gading.dev unreachable from here → rejected.
 * - SELECTED: Fawaz Ahmed hadith-api via jsDelivr CDN (anonymous, pinned
 *   @1, CORS-open static JSON). Indonesian (ind-*) + Arabic (ara-*)
 *   editions exist for: bukhari, muslim, abudawud, tirmidhi, nasai,
 *   ibnmajah, malik. Ahmad/Darimi have no editions here at all.
 *
 * Layout (verified live):
 * - GET .../editions.json → collection catalog (names + edition/lang list).
 * - GET .../editions/{ind|ara}-{collection}/{hadithNumber}.json
 *   → single hadith + its book/section name. One small file per hadith,
 *   so pagination fetches only the visible window (never whole books).
 *
 * Never import this module from Client Components.
 */

const CDN_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

export interface HadithApiGrade {
  name: string;
  grade: string;
}

export interface HadithApiReference {
  book: number;
  hadith: number;
}

/** One hadith record inside a per-hadith file (ara- or ind- edition). */
export interface HadithApiRecord {
  hadithnumber: number;
  arabicnumber?: number;
  text: string;
  grades: HadithApiGrade[];
  reference: HadithApiReference;
}

export interface HadithApiFile {
  metadata: {
    name: string;
    /** Single-entry map for this file's book: { "<bookNo>": "<bookName>" }. */
    section: Record<string, string>;
  };
  hadiths: HadithApiRecord[];
}

export interface HadithApiCatalogEdition {
  name: string;
  language: string;
}

export interface HadithApiCatalog {
  [collectionId: string]: {
    name: string;
    collection: HadithApiCatalogEdition[];
  };
}

export class HadithApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HadithApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGrade(value: unknown): value is HadithApiGrade {
  return (
    isRecord(value) && typeof value.name === "string" && typeof value.grade === "string"
  );
}

function isReference(value: unknown): value is HadithApiReference {
  return (
    isRecord(value) && typeof value.book === "number" && typeof value.hadith === "number"
  );
}

/**
 * Record validator. `requireText` distinguishes editions: Indonesian text
 * is always required; Arabic is optional because the source genuinely
 * lacks it for some records (e.g. Muslim's opening entries carry empty
 * Arabic). A present-but-non-Arabic `ar` text is rejected.
 */
export function isHadithApiRecord(
  value: unknown,
  opts: { requireText: boolean }
): value is HadithApiRecord {
  if (!isRecord(value)) return false;
  if (
    typeof value.hadithnumber !== "number" ||
    !Number.isInteger(value.hadithnumber) ||
    value.hadithnumber < 1
  ) {
    return false;
  }
  if (typeof value.text !== "string") return false;
  if (opts.requireText && value.text.trim() === "") return false;
  if (value.text.trim() !== "" && opts.requireText === false) {
    // Arabic edition: non-empty text must contain Arabic script.
    if (!/[\u0600-\u06FF]/.test(value.text)) return false;
  }
  if (!Array.isArray(value.grades) || !value.grades.every(isGrade)) return false;
  if (!isReference(value.reference)) return false;
  return true;
}

export function isHadithApiFile(value: unknown): value is HadithApiFile {
  if (!isRecord(value)) return false;
  const { metadata, hadiths } = value;
  if (!isRecord(metadata)) return false;
  const section = (metadata as Record<string, unknown>).section;
  if (!isRecord(section)) return false;
  if (
    !Object.entries(section).every(
      ([k, v]) => k.trim() !== "" && typeof v === "string" && v.trim() !== ""
    )
  ) {
    return false;
  }
  if (!Array.isArray(hadiths) || hadiths.length === 0) return false;
  return hadiths.every((h) => isRecord(h));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string, attempts = 3): Promise<Response> {
  let delayMs = 800;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { next: { revalidate: 86400 } });
    } catch {
      if (attempt === attempts - 1) throw new HadithApiError("Hadith API unreachable.");
      await sleep(delayMs);
      delayMs *= 2;
      continue;
    }
    if (res.ok) return res;
    // 404 on a hadith file means "past the end" — caller handles null.
    if (res.status === 404) return res;
    try {
      await res.arrayBuffer();
    } catch {
      // ignore drain errors before retry
    }
    if (attempt === attempts - 1 || (res.status !== 429 && res.status < 500)) {
      throw new HadithApiError(`Hadith request failed (${res.status}).`);
    }
    await sleep(delayMs + Math.floor(Math.random() * 400));
    delayMs *= 2;
  }
  throw new HadithApiError("Hadith API unreachable.");
}

/** Collection catalog (names + available editions). Small, cached 24h. */
export async function fetchHadithCatalog(): Promise<HadithApiCatalog> {
  const catalogRes = await fetchJson(
    "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json",
    3
  );
  let json: unknown;
  try {
    json = await catalogRes.json();
  } catch {
    throw new HadithApiError("Hadith catalog response was not valid JSON.");
  }
  if (!isRecord(json) || Object.keys(json).length === 0) {
    throw new HadithApiError("Hadith catalog response was malformed.");
  }
  for (const [key, entry] of Object.entries(json)) {
    if (!isRecord(entry) || typeof entry.name !== "string") {
      throw new HadithApiError(`Hadith catalog entry malformed: ${key}.`);
    }
    const editions: unknown = entry.collection;
    if (
      !Array.isArray(editions) ||
      !editions.every(
        (e: unknown) =>
          isRecord(e) && typeof e.name === "string" && typeof e.language === "string"
      )
    ) {
      throw new HadithApiError(`Hadith catalog entry malformed: ${key}.`);
    }
  }
  return json as HadithApiCatalog;
}

/**
 * Single hadith file. Returns null on 404 (past collection end) so
 * pagination can detect the boundary without an error page.
 */
export async function fetchHadithFile(
  edition: string,
  collection: string,
  hadithNumber: number
): Promise<HadithApiFile | null> {
  const res = await fetchJson(`${CDN_BASE}/${edition}-${collection}/${hadithNumber}.json`, 3);
  if (res.status === 404) return null;
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new HadithApiError("Hadith response was not valid JSON.");
  }
  if (!isHadithApiFile(json)) throw new HadithApiError("Hadith response was malformed.");
  return json;
}
