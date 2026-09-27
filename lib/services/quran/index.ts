/**
 * Stage 2A — public Quran service (server-side).
 *
 * Exposes NUR internal types only. Pages call these; the Al Quran Cloud
 * details stay behind api.ts + mapper.ts.
 */
import type { Surah, SurahDetail } from "@/lib/types";
import { fetchSurahEditions, fetchSurahList } from "./api";
import { mapApiSurahMetaToSurah, mapEditionsToSurahDetail } from "./mapper";

export type { QuranApiError } from "./api";
export { getSurahAudio } from "./audio";
export type { QuranAudioAyah } from "@/lib/types";

/** All 114 surahs, metadata only (no verse content). */
export async function listSurahs(): Promise<Surah[]> {
  const metas = await fetchSurahList();
  return metas.map(mapApiSurahMetaToSurah);
}

/**
 * Full surah with Arabic + Indonesian translation.
 * Returns null for out-of-range numbers (→ 404 page).
 * Throws QuranApiError for network / malformed responses (→ ErrorState).
 */
export async function getSurahDetail(n: number): Promise<SurahDetail | null> {
  if (!Number.isInteger(n) || n < 1 || n > 114) return null;
  const [arabic, translation] = await fetchSurahEditions(n);
  return mapEditionsToSurahDetail(arabic, translation);
}
