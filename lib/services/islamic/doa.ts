/**
 * Stage 2E — public Doa service (server-side).
 *
 * Exposes NUR internal types only. One cached fetch returns the whole
 * collection; categories are derived from the data (the API offers no
 * dedicated category endpoint).
 */
import type { Dua } from "@/lib/types";
import { DoaApiError, fetchDoas } from "./doaApi";
import { mapDoaItemToDua } from "./doaMapper";

export type { DoaApiError };

/** All doas, mapped to the internal model. */
export async function getDoas(): Promise<Dua[]> {
  const items = await fetchDoas();
  return items.map(mapDoaItemToDua);
}

/** Sorted unique categories derived from the collection. */
export async function getDoaCategories(): Promise<string[]> {
  const duas = await getDoas();
  const seen = new Set<string>();
  for (const d of duas) {
    if (d.category.trim() !== "") seen.add(d.category);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, "id"));
}

/**
 * Stage 4A — deterministic daily index: day-of-year modulo collection
 * size, so a calendar day always shows the same doa (no random per render).
 */
export function selectDailyDoaIndex(total: number, date: Date = new Date()): number {
  if (!Number.isInteger(total) || total <= 0) {
    throw new DoaApiError("Cannot select a daily doa from an empty collection.");
  }
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return ((dayOfYear % total) + total) % total;
}

/** One deterministic doa for the given date (uses the cached collection). */
export async function getDailyDoa(date: Date = new Date()): Promise<Dua> {
  const duas = await getDoas();
  return duas[selectDailyDoaIndex(duas.length, date)];
}
