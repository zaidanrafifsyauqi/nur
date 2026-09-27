/**
 * Stage 2C — Al Quran Cloud audio API client (server-side only).
 *
 * Endpoint (no API key required):
 * - GET https://api.alquran.cloud/v1/surah/{surah}/ar.alafasy
 *   → per-ayah recitation audio (Mishary Rashid Alafasy) for /quran/[surah].
 *
 * Kept separate from the verse-text fetch so an audio failure never
 * blocks Arabic + translation. Never import from Client Components.
 */
import { API_BASE, fetchWithRetry, QuranApiError } from "./api";

/** Mishary Rashid Alafasy — reliable, widely cached production choice. */
export const QURAN_AUDIO_EDITION = "ar.alafasy";
export const QURAN_AUDIO_RECITER_LABEL = "Mishary Rashid Alafasy";

/** One ayah inside the audio edition (subset of fields we validate). */
export interface QuranAudioApiAyah {
  number: number;
  audio: string;
  audioSecondary: string[];
  text: string;
  numberInSurah: number;
}

export interface QuranAudioApiSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  ayahs: QuranAudioApiAyah[];
  edition: {
    identifier: string;
    language: string;
    name: string;
    englishName: string;
    format: string;
    type: string;
  };
}

export interface QuranAudioApiResponse {
  code: number;
  status: string;
  data: QuranAudioApiSurah;
}

export { QuranApiError };

function isAudioAyah(value: unknown): value is QuranAudioApiAyah {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.numberInSurah === "number" &&
    typeof v.audio === "string" &&
    Array.isArray(v.audioSecondary)
  );
}

function isAudioSurah(value: unknown): value is QuranAudioApiSurah {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.number === "number" &&
    typeof v.numberOfAyahs === "number" &&
    Array.isArray(v.ayahs) &&
    v.ayahs.length > 0 &&
    v.ayahs.every(isAudioAyah)
  );
}

/** Audio metadata fetch: one request per surah, URLs reused per ayah. */
export async function fetchSurahAudio(
  surahNumber: number
): Promise<QuranAudioApiSurah> {
  const res = await fetchWithRetry(
    `${API_BASE}/surah/${surahNumber}/${QURAN_AUDIO_EDITION}`,
    3
  );
  if (res.status === 404) throw new QuranApiError("Surah audio not found.");
  if (!res.ok) throw new QuranApiError(`Quran audio request failed (${res.status}).`);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new QuranApiError("Quran audio response was not valid JSON.");
  }
  const data = (json as Partial<QuranAudioApiResponse>).data;
  if (!isAudioSurah(data)) {
    throw new QuranApiError("Quran audio response was malformed.");
  }
  return data;
}
