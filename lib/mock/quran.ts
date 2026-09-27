import type { QuranVerse, Surah, SurahDetail } from "@/lib/types";

/**
 * Stage 1: intentionally limited set (8 surahs).
 * Full 114-surah catalog lands with the real Quran service in Stage 2.
 */
export const mockSurahs: Surah[] = [
  {
    number: 1,
    arabicName: "الفاتحة",
    transliteratedName: "Al-Fatihah",
    englishName: "The Opener",
    versesCount: 7,
    revelation: "Makki",
    juz: [1],
  },
  {
    number: 2,
    arabicName: "البقرة",
    transliteratedName: "Al-Baqarah",
    englishName: "The Cow",
    versesCount: 286,
    revelation: "Madani",
    juz: [1, 2, 3],
  },
  {
    number: 18,
    arabicName: "الكهف",
    transliteratedName: "Al-Kahf",
    englishName: "The Cave",
    versesCount: 110,
    revelation: "Makki",
    juz: [15, 16],
  },
  {
    number: 36,
    arabicName: "يس",
    transliteratedName: "Ya-Sin",
    englishName: "Ya Sin",
    versesCount: 83,
    revelation: "Makki",
    juz: [22, 23],
  },
  {
    number: 55,
    arabicName: "الرحمن",
    transliteratedName: "Ar-Rahman",
    englishName: "The Most Merciful",
    versesCount: 78,
    revelation: "Madani",
    juz: [27],
  },
  {
    number: 67,
    arabicName: "الملك",
    transliteratedName: "Al-Mulk",
    englishName: "The Sovereignty",
    versesCount: 30,
    revelation: "Makki",
    juz: [29],
  },
  {
    number: 112,
    arabicName: "الإخلاص",
    transliteratedName: "Al-Ikhlas",
    englishName: "The Sincerity",
    versesCount: 4,
    revelation: "Makki",
    juz: [30],
  },
  {
    number: 114,
    arabicName: "الناس",
    transliteratedName: "An-Nas",
    englishName: "Mankind",
    versesCount: 6,
    revelation: "Makki",
    juz: [30],
  },
];

export const mockContinueReading = {
  surahNumber: 18,
  surahName: "Al-Kahf",
  verse: 32,
  totalVerses: 110,
  progress: 0.29,
  updatedLabel: "Yesterday evening · mock progress",
};

export const mockAyahOfDay: QuranVerse & { surahName: string } = {
  surahNumber: 94,
  verseNumber: 6,
  arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
  translation: "Indeed, with hardship comes ease.",
  transliteration: "Inna ma'a al-'usri yusra",
  surahName: "Ash-Sharh · 94:6",
};

const alFatihahVerses: QuranVerse[] = [
  {
    surahNumber: 1,
    verseNumber: 1,
    arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    translation: "In the name of Allah, the Most Gracious, the Most Merciful.",
    transliteration: "Bismillahir-rahmanir-rahim",
  },
  {
    surahNumber: 1,
    verseNumber: 2,
    arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    translation: "All praise is due to Allah, Lord of the worlds.",
    transliteration: "Alhamdu lillahi rabbil-'alamin",
  },
  {
    surahNumber: 1,
    verseNumber: 3,
    arabic: "الرَّحْمَٰنِ الرَّحِيمِ",
    translation: "The Most Gracious, the Most Merciful.",
    transliteration: "Ar-rahmanir-rahim",
  },
  {
    surahNumber: 1,
    verseNumber: 4,
    arabic: "مَالِكِ يَوْمِ الدِّينِ",
    translation: "Master of the Day of Judgment.",
    transliteration: "Maliki yawmid-din",
  },
  {
    surahNumber: 1,
    verseNumber: 5,
    arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    translation: "You alone we worship, and You alone we ask for help.",
    transliteration: "Iyyaka na'budu wa iyyaka nasta'in",
  },
  {
    surahNumber: 1,
    verseNumber: 6,
    arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
    translation: "Guide us along the Straight Path.",
    transliteration: "Ihdinas-siratal-mustaqim",
  },
  {
    surahNumber: 1,
    verseNumber: 7,
    arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
    translation:
      "The path of those You have blessed — not of those who earned anger, nor of those who went astray.",
    transliteration: "Siratal-ladhina an'amta 'alayhim...",
  },
];

const genericVerses = (surahNumber: number, count: number): QuranVerse[] =>
  Array.from({ length: Math.min(count, 7) }, (_, i) => ({
    surahNumber,
    verseNumber: i + 1,
    arabic: "﴿ نَصٌّ تَجْرِيبِي لِلْقِرَاءَةِ وَالتَّصْمِيم ﴾",
    translation:
      "Mock translation placeholder for typography and layout. Real text arrives with the Quran service in Stage 2.",
  }));

export function getMockSurahDetail(n: number): SurahDetail | null {
  const meta = mockSurahs.find((s) => s.number === n);
  if (!meta) return null;
  if (n === 1) return { ...meta, verses: alFatihahVerses };
  return { ...meta, verses: genericVerses(n, meta.versesCount) };
}
