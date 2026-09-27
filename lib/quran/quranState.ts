/**
 * Stage 4B — local Quran user-state model (pure, no DOM).
 *
 * Persisted: minimal identifiers + timestamps ONLY (never Arabic text,
 * translations, or whole surahs). All functions here are framework-free
 * so the tsx verification can exercise them in Node.
 */

export interface QuranBookmark {
  surahNumber: number;
  ayahNumber: number;
  createdAt: string; // ISO timestamp
}

export interface QuranReadingPosition {
  surahNumber: number;
  ayahNumber: number;
  updatedAt: string; // ISO timestamp
}

/** Versioned, namespaced keys — never generic names like "bookmarks". */
export const QURAN_BOOKMARKS_KEY = "nur:quran:bookmarks:v1";
export const QURAN_READING_KEY = "nur:quran:reading:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidSurah(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 114;
}

function isValidAyah(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1;
}

function isValidISO(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

export function isQuranBookmark(value: unknown): value is QuranBookmark {
  return (
    isRecord(value) &&
    isValidSurah(value.surahNumber) &&
    isValidAyah(value.ayahNumber) &&
    isValidISO(value.createdAt)
  );
}

export function isQuranReadingPosition(value: unknown): value is QuranReadingPosition {
  return (
    isRecord(value) &&
    isValidSurah(value.surahNumber) &&
    isValidAyah(value.ayahNumber) &&
    isValidISO(value.updatedAt)
  );
}

/** Parse stored bookmarks JSON → valid list (corrupt entries dropped). */
export function parseBookmarks(raw: string | null): QuranBookmark[] {
  if (raw == null || raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const out: QuranBookmark[] = [];
  for (const item of parsed) {
    if (!isQuranBookmark(item)) continue;
    const key = `${item.surahNumber}:${item.ayahNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      surahNumber: item.surahNumber,
      ayahNumber: item.ayahNumber,
      createdAt: item.createdAt,
    });
  }
  return out;
}

/** Parse stored reading JSON → valid position or null. */
export function parseReadingPosition(raw: string | null): QuranReadingPosition | null {
  if (raw == null || raw.trim() === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isQuranReadingPosition(parsed)) return null;
  return {
    surahNumber: parsed.surahNumber,
    ayahNumber: parsed.ayahNumber,
    updatedAt: parsed.updatedAt,
  };
}

export function serializeBookmarks(list: QuranBookmark[]): string {
  return JSON.stringify(list);
}

export function serializeReadingPosition(pos: QuranReadingPosition): string {
  return JSON.stringify(pos);
}

export function bookmarkKey(surahNumber: number, ayahNumber: number): string {
  return `${surahNumber}:${ayahNumber}`;
}

export function hasBookmark(
  list: QuranBookmark[],
  surahNumber: number,
  ayahNumber: number
): boolean {
  const key = bookmarkKey(surahNumber, ayahNumber);
  return list.some((b) => bookmarkKey(b.surahNumber, b.ayahNumber) === key);
}

/** Toggle (add if missing, remove if present) — always deduped. */
export function toggleBookmark(
  list: QuranBookmark[],
  surahNumber: number,
  ayahNumber: number,
  now: Date = new Date()
): QuranBookmark[] {
  if (!isValidSurah(surahNumber) || !isValidAyah(ayahNumber)) return list;
  if (hasBookmark(list, surahNumber, ayahNumber)) {
    return list.filter(
      (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
    );
  }
  return [
    ...list,
    { surahNumber, ayahNumber, createdAt: now.toISOString() },
  ];
}

export function removeBookmark(
  list: QuranBookmark[],
  surahNumber: number,
  ayahNumber: number
): QuranBookmark[] {
  return list.filter(
    (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
  );
}

/**
 * Progress rule (product-wide): floor(lastAyah / totalAyahs * 100),
 * clamped 0–100. Ayah 1 of 7 → 14% (partial, honest). Final ayah → 100%.
 */
export function readingProgress(lastAyahNumber: number, totalAyahs: number): number {
  if (
    !Number.isInteger(lastAyahNumber) ||
    !Number.isInteger(totalAyahs) ||
    totalAyahs <= 0 ||
    lastAyahNumber <= 0
  ) {
    return 0;
  }
  const pct = Math.floor((Math.min(lastAyahNumber, totalAyahs) / totalAyahs) * 100);
  return Math.min(100, Math.max(0, pct));
}

/** Browser-safe storage accessor — null on server / unavailable / denied. */
export function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}
