/**
 * Stage 2C — maps Al Quran Cloud audio responses to NUR internal types.
 *
 * Data flow: API → audio API type → mapper → QuranAudioAyah → UI.
 * Raw API objects must never reach React components.
 */
import type { QuranAudioAyah } from "@/lib/types";
import type { QuranAudioApiSurah } from "./audioApi";

/** Only accept https mp3 URLs from the verified CDN host. */
function isValidAudioUrl(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "cdn.islamic.network" &&
      parsed.pathname.toLowerCase().endsWith(".mp3")
    );
  } catch {
    return false;
  }
}

export function mapAudioSurahToAyahs(surah: QuranAudioApiSurah): QuranAudioAyah[] {
  const ayahs = surah.ayahs.map((ayah) => ({
    ayahNumber: ayah.numberInSurah,
    audioUrl: ayah.audio,
  }));
  const invalid = ayahs.find((a) => !isValidAudioUrl(a.audioUrl));
  if (invalid) {
    throw new Error(`Invalid audio URL for ayah ${invalid.ayahNumber}.`);
  }
  return ayahs;
}
