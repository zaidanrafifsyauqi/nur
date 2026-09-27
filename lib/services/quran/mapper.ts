/**
 * Stage 2A — maps raw Al Quran Cloud responses to NUR internal types.
 *
 * Data flow: API → API response type → mapper → NUR type (lib/types.ts) → UI.
 * Raw API objects must never reach React components.
 */
import type { Surah, SurahDetail } from "@/lib/types";
import type { QuranApiSurahEdition, QuranApiSurahMeta } from "./api";

export function mapRevelationType(
  value: QuranApiSurahMeta["revelationType"]
): Surah["revelation"] {
  return value === "Meccan" ? "Makki" : "Madani";
}

export function mapApiSurahMetaToSurah(meta: QuranApiSurahMeta): Surah {
  return {
    number: meta.number,
    arabicName: meta.name,
    transliteratedName: meta.englishName,
    englishName: meta.englishNameTranslation,
    versesCount: meta.numberOfAyahs,
    revelation: mapRevelationType(meta.revelationType),
    // Listing endpoint carries no juz data; verse fetch fills this per-surah.
    juz: [],
  };
}

export function mapEditionsToSurahDetail(
  arabic: QuranApiSurahEdition,
  translation: QuranApiSurahEdition
): SurahDetail {
  const juzSet = new Set<number>();
  for (const ayah of arabic.ayahs) {
    if (typeof ayah.juz === "number") juzSet.add(ayah.juz);
  }

  return {
    number: arabic.number,
    arabicName: arabic.name,
    transliteratedName: arabic.englishName,
    englishName: arabic.englishNameTranslation,
    versesCount: arabic.numberOfAyahs,
    revelation: mapRevelationType(arabic.revelationType),
    juz: [...juzSet].sort((a, b) => a - b),
    verses: arabic.ayahs.map((ayah, index) => ({
      surahNumber: arabic.number,
      verseNumber: ayah.numberInSurah,
      arabic: ayah.text,
      translation: translation.ayahs[index]?.text ?? "",
    })),
  };
}
