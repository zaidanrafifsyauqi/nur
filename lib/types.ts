export type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";

export interface Prayer {
  name: PrayerName;
  time: string; // "05:12" 24h display string (mock)
  displayTime: string; // "5:12 AM"
  passed: boolean;
  isNext: boolean;
  /** ISO timestamp of the prayer (Stage 2B live data). Absent on legacy mocks. */
  dateTime?: string;
}

export interface NextPrayerInfo {
  name: PrayerName;
  time: string;
  displayTime: string;
  /** Placeholder countdown, e.g. "02:14:33". Real countdown lands in Stage 2. */
  countdownPlaceholder: string;
  /** 0..1 progress to next prayer */
  progress: number;
  /** Absolute ISO target for the live countdown (Stage 2B). */
  targetISO?: string;
}

export interface DayPrayerTimes {
  location: string;
  locationDetail: string;
  gregorianDate: string;
  hijriDate: HijriDate;
  prayers: Prayer[];
  next: NextPrayerInfo;
}

export interface Surah {
  number: number;
  arabicName: string;
  transliteratedName: string;
  englishName: string;
  versesCount: number;
  revelation: "Makki" | "Madani";
  /** Juz numbers this surah spans. Empty when the listing source has no juz data. */
  juz?: number[];
}

export interface QuranVerse {
  surahNumber: number;
  verseNumber: number;
  arabic: string;
  translation: string;
  transliteration?: string;
}

export interface SurahDetail extends Surah {
  verses: QuranVerse[];
}

/** Stage 2C — internal audio contract: one playable URL per ayah. */
export interface QuranAudioAyah {
  ayahNumber: number;
  audioUrl: string;
}

export interface Dua {
  id: string;
  title: string;
  arabic: string;
  transliteration?: string;
  translation: string;
  category: string;
  source?: string;
  /** Stage 2E — source/reference notes from the Doa API (exact text). */
  reference?: string;
  /** Stage 2E — normalized tags (never undefined after mapping). */
  tags: string[];
}

/**
 * Stage 2F — internal Hadith model (Fawaz Ahmed hadith-api via jsDelivr).
 * Only fields the source supplies exist: there is no separate narrator
 * field in the source (narrators live inline in the text), so none is
 * fabricated here. Arabic is optional — some records (e.g. Muslim's
 * opening entries) genuinely carry no Arabic text in the source.
 */
export interface Hadith {
  /** Stable id: `${collectionId}:${hadithNumber}`. */
  id: string;
  collectionId: string;
  collectionName: string;
  bookName?: string;
  bookNumber?: number;
  hadithNumber: string;
  arabic?: string;
  translation: string;
  /** Assembled from exact source parts (collection · book · number). */
  reference?: string;
  /** Only when the source grades the record — never invented. */
  grading?: string;
}

export interface Dhikr {
  id: string;
  arabic: string;
  translation: string;
  repeat: number;
}

export interface HijriDate {
  day: string;
  month: string;
  year: string;
  formatted: string; // e.g. "12 Rabi' al-Awwal 1447"
  weekday?: string;
}

export interface HijriMonthDay {
  gregorianDay: number;
  hijriDay: number | null;
  isToday?: boolean;
  isHoly?: boolean;
  label?: string;
}

/**
 * Stage 2D — one day inside a real Hijri month view.
 * Gregorian ↔ Hijri pairing comes from the API; nothing is computed manually.
 */
export interface HijriCalendarDay {
  hijriDay: number;
  hijriMonth: number;
  hijriMonthName: string;
  hijriMonthNameArabic: string;
  hijriYear: number;
  gregorianDate: string; // "DD-MM-YYYY"
  gregorianDay: number;
  gregorianMonth: number;
  gregorianMonthName: string;
  gregorianYear: number;
  weekday: string; // Gregorian weekday, e.g. "Saturday"
  isToday: boolean;
  events: string[];
}

/** Stage 2D — a full Hijri month for the calendar view. */
export interface HijriMonthView {
  hijriMonth: number;
  hijriMonthName: string;
  hijriMonthNameArabic: string;
  hijriYear: number;
  daysInMonth: number;
  calendarMethod: string;
  days: HijriCalendarDay[];
}

export interface Place {
  id: string;
  name: string;
  category: "mosque" | "islamic-center" | "halal-food" | "hotel" | "landmark";
  distance: string;
  rating?: number;
  address: string;
  openNow?: boolean;
  tags: string[];
  // ── Stage 3B OSM-backed fields (additive; legacy mocks keep compiling) ──
  /** Data provenance. Present only on real OSM places. */
  source?: "osm";
  sourceType?: "node" | "way" | "relation";
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  osmUrl?: string;
  /** Stage 3C — raw source tags retained for debugging (not all rendered). */
  sourceTags?: Record<string, string>;
}

export interface TravelLocation {
  city: string;
  country: string;
  displayName: string;
  latitudePlaceholder: number;
  longitudePlaceholder: number;
}

export interface QiblaData {
  /** Degrees from North. Placeholder only in Stage 1. */
  directionDegreesPlaceholder: number;
  city: string;
  country: string;
  distanceKmPlaceholder: number;
  permissionState: "granted" | "prompt" | "denied" | "unavailable";
}

export type DataState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "empty" }
  | { status: "error"; message: string };
