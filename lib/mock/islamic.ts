import type { Dhikr, Dua, HijriMonthDay } from "@/lib/types";

export const mockDuaOfDay: Dua = {
  id: "rabbana-atina",
  title: "Rabbana Atina",
  arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
  transliteration: "Rabbana atina fid-dunya hasanah...",
  translation:
    "Our Lord, give us good in this world and good in the Hereafter, and shield us from the punishment of the Fire.",
  category: "Daily",
  source: "Quran 2:201 · mock excerpt",
  tags: [],
};

export const mockDuas: Dua[] = [
  mockDuaOfDay,
  {
    id: "morning",
    title: "Morning Remembrance",
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ",
    translation: "We have reached the morning, and all sovereignty belongs to Allah.",
    category: "Morning",
    source: "Mock source placeholder",
    tags: [],
  },
  {
    id: "travel-dua",
    title: "Dua for Travel",
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا",
    translation: "Glory to Him who has subjected this to us.",
    category: "Travel",
    source: "Quran 43:13 · mock excerpt",
    tags: [],
  },
  {
    id: "anxiety",
    title: "For Anxiety & Sorrow",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ",
    translation: "O Allah, I seek refuge in You from anxiety and sorrow.",
    category: "Heart",
    source: "Mock source placeholder",
    tags: [],
  },
];

export const mockDhikr: Dhikr[] = [
  { id: "d1", arabic: "سُبْحَانَ اللَّهِ", translation: "Glory be to Allah", repeat: 33 },
  { id: "d2", arabic: "الْحَمْدُ لِلَّهِ", translation: "All praise belongs to Allah", repeat: 33 },
  { id: "d3", arabic: "اللَّهُ أَكْبَرُ", translation: "Allah is Greatest", repeat: 34 },
];

export const mockHijriMonth: HijriMonthDay[] = Array.from({ length: 30 }, (_, i) => ({
  gregorianDay: i + 1,
  hijriDay: i + 1,
  isToday: i + 1 === 12,
  isHoly: i + 1 === 1 || i + 1 === 27,
  label: i + 1 === 27 ? "Laylat al-Qadr (observed)" : undefined,
}));
