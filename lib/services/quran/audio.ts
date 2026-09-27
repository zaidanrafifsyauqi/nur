/**
 * Stage 2C — public Quran audio service (server-side).
 *
 * Exposes NUR internal types only. The surah page fetches audio metadata
 * once per surah (cached 1 day); the browser reuses those URLs per ayah
 * without further API calls.
 */
import type { QuranAudioAyah } from "@/lib/types";
import { fetchSurahAudio, QuranApiError } from "./audioApi";
import { mapAudioSurahToAyahs } from "./audioMapper";

export type { QuranAudioAyah };
export { QURAN_AUDIO_EDITION, QURAN_AUDIO_RECITER_LABEL } from "./audioApi";

/**
 * Audio URLs for every ayah of a surah, in order.
 * Returns null for out-of-range numbers.
 * Throws QuranApiError for network / malformed responses
 * (caller shows the audio error state; verse text stays visible).
 */
export async function getSurahAudio(n: number): Promise<QuranAudioAyah[] | null> {
  if (!Number.isInteger(n) || n < 1 || n > 114) return null;
  try {
    const surah = await fetchSurahAudio(n);
    return mapAudioSurahToAyahs(surah);
  } catch (error) {
    if (error instanceof QuranApiError) throw error;
    throw new QuranApiError("Quran audio response was malformed.");
  }
}
