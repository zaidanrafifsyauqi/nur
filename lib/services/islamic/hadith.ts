/**
 * Stage 2F — public Hadith service (server-side).
 *
 * Pagination is number-window based: page p (size N) covers hadith
 * numbers [p*N+1 .. p*N+N]. Per-hadith files (ara- + ind- editions) for
 * that window are fetched in parallel — the visible page only, never
 * whole collections. All fetches are Next-cached for 24h.
 */
import type { Hadith } from "@/lib/types";
import {
  fetchHadithCatalog,
  fetchHadithFile,
  HadithApiError,
  isHadithApiRecord,
} from "./hadithApi";
import { bookNameFromFile, mapHadithPair } from "./hadithMapper";

export type { HadithApiError };
export type { Hadith } from "@/lib/types";

export const HADITH_PAGE_SIZE = 10;

/** jsDelivr throttles wide bursts — batch file fetches (no new deps). */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface HadithCollection {
  id: string;
  name: string;
}

/**
 * Collections offering BOTH Indonesian and Arabic editions, derived from
 * the live catalog (never hardcoded — availability may change).
 */
export async function getHadithCollections(): Promise<HadithCollection[]> {
  const catalog = await fetchHadithCatalog();
  const out: HadithCollection[] = [];
  for (const [id, entry] of Object.entries(catalog)) {
    const names = entry.collection.map((e) => e.name);
    const hasInd = names.some((n) => n === `ind-${id}`);
    const hasAra = names.some((n) => n === `ara-${id}`);
    if (hasInd && hasAra) out.push({ id, name: entry.name });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return out;
}

export interface HadithPage {
  collection: HadithCollection;
  page: number;
  pageSize: number;
  hadiths: Hadith[];
  /** False when this page is short — the collection end was reached. */
  hasMore: boolean;
}

/**
 * One page of hadiths with Arabic + translation paired by hadith number.
 * Out-of-range numbers (404) end the page gracefully; translation-less
 * records are skipped; an empty page yields [] (→ EmptyState upstream).
 */
export async function getHadithPage(
  collectionId: string,
  collectionName: string,
  page: number,
  pageSize: number = HADITH_PAGE_SIZE
): Promise<HadithPage> {
  const numbers = Array.from({ length: pageSize }, (_, i) => page * pageSize + i + 1);
  const pairs = await mapLimit(numbers, 5, async (n) => {
      const [indFile, araFile] = await Promise.all([
        fetchHadithFile("ind", collectionId, n),
        fetchHadithFile("ara", collectionId, n),
      ]);
      const ind = indFile?.hadiths.find((h) => h.hadithnumber === n) ?? null;
      if (!ind || !isHadithApiRecord(ind, { requireText: true })) return null;
      const ara = araFile?.hadiths.find((h) => h.hadithnumber === n) ?? null;
      const araValid =
        ara && isHadithApiRecord(ara, { requireText: false }) ? ara : null;
      const book = indFile ? bookNameFromFile(indFile) : null;
      return mapHadithPair({
        collectionId,
        collectionName,
        ind,
        ara: araValid,
        bookName: book?.bookName,
        bookNumber: book?.bookNumber,
      });
    }
  );
  const hadiths = pairs.filter((h): h is Hadith => h !== null);
  // Source gaps (skipped records) can span dozens of numbers (e.g. an
  // untranslated intro section), so a short page alone can't prove the
  // end — scan ahead in bounded chunks with early exit. Cached files make
  // repeats cheap; the scan stops at the first chunk with a valid record.
  let hasMore = hadiths.length === pageSize;
  if (!hasMore) {
    const scanStart = page * pageSize + pageSize + 1;
    for (let chunk = 0; chunk < 10 && !hasMore; chunk++) {
      const batch = await mapLimit(
        Array.from({ length: 10 }, (_, i) => scanStart + chunk * 10 + i),
        5,
        async (n) => {
          try {
            const file = await fetchHadithFile("ind", collectionId, n);
            const rec = file?.hadiths.find((h) => h.hadithnumber === n);
            return !!rec && isHadithApiRecord(rec, { requireText: true });
          } catch {
            return false;
          }
        }
      );
      hasMore = batch.some(Boolean);
    }
  }
  return {
    collection: { id: collectionId, name: collectionName },
    page,
    pageSize,
    hadiths,
    hasMore,
  };
}

/** Single hadith (used by integrity checks + future deep links). */
export async function getHadith(
  collectionId: string,
  collectionName: string,
  hadithNumber: number
): Promise<Hadith | null> {
  const [indFile, araFile] = await Promise.all([
    fetchHadithFile("ind", collectionId, hadithNumber),
    fetchHadithFile("ara", collectionId, hadithNumber),
  ]);
  const ind = indFile?.hadiths.find((h) => h.hadithnumber === hadithNumber) ?? null;
  if (!ind || !isHadithApiRecord(ind, { requireText: true })) return null;
  const ara =
    araFile?.hadiths.find((h) => h.hadithnumber === hadithNumber) ?? null;
  const araValid = ara && isHadithApiRecord(ara, { requireText: false }) ? ara : null;
  const book = indFile ? bookNameFromFile(indFile) : null;
  return mapHadithPair({
    collectionId,
    collectionName,
    ind,
    ara: araValid,
    bookName: book?.bookName,
    bookNumber: book?.bookNumber,
  });
}
