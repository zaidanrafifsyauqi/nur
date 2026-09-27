/**
 * Stage NUR AI — Quran tool. Uses existing Quran services (cached).
 * Never fabricates verses; falls back to general guidance label.
 */

import { listSurahs, getSurahDetail } from "@/lib/services/quran";

export async function getQuranContext(query: string): Promise<string | null> {
  const q = query.toLowerCase();
  const needsQuran = /quran|surah|ayah|al-fatihah|al-baqarah|ayat|verse|translation/i.test(q);
  if (!needsQuran) return null;

  try {
    // Cheap: list surahs metadata
    const surahs = await listSurahs();
    // Try to detect specific surah number or name
    const lower = q.toLowerCase();
    // Try numeric reference like "/2" or "surah 2"
    let matchedSurah: number | null = null;
    const numMatch = lower.match(/surah\s+(\d{1,3})/);
    if (numMatch) {
      const n = parseInt(numMatch[1], 10);
      if (n >= 1 && n <= 114) matchedSurah = n;
    }
    // Try name match
    if (!matchedSurah) {
      for (const s of surahs) {
        if (
          lower.includes(s.transliteratedName.toLowerCase()) ||
          lower.includes(s.englishName.toLowerCase())
        ) {
          matchedSurah = s.number;
          break;
        }
      }
    }
    // Default to Al-Fatihah for general quran questions
    if (!matchedSurah && /al-fatihah|meaning|explain/i.test(lower)) {
      matchedSurah = 1;
    }

    if (matchedSurah) {
      const detail = await getSurahDetail(matchedSurah);
      if (detail) {
        const verses = detail.verses.slice(0, 3);
        const preview = verses
          .map((v) => `Ayat ${v.verseNumber}: ${v.arabic} — ${v.translation}`)
          .join("\n");
        return `[Quran Context — verified from Al Quran Cloud]
Surah ${detail.transliteratedName} (${detail.englishName}), ${detail.versesCount} verses, ${detail.revelation}
Arabic name: ${detail.arabicName}
Preview (first 3 verses):
${preview}
Full surah available at /quran/${detail.number}`;
      }
    }

    // Fallback: surah catalog summary
    return `[Quran Context — 114 surahs available via NUR]
Example: Al-Fatihah (7 verses, Makki), Al-Baqarah (286 verses, Madani).
Full list at /quran. Specific surah details are verified, not generated.`;
  } catch {
    return null;
  }
}
