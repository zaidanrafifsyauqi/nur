/**
 * Stage 4C — curated calculation-method catalog.
 *
 * IDs + official names verified live against AlAdhan on 2026-09-24
 * (the API echoes meta.method.name per id; all seven below matched).
 * Source: https://aladhan.com/prayer-times-api — only methods relevant
 * to NUR's audience are listed, not the full AlAdhan table.
 * Default stays 20 so existing behavior is byte-identical.
 */

export interface PrayerMethodInfo {
  id: number;
  /** Official AlAdhan name (shown in Settings). */
  name: string;
  /** Short label used inside NUR surfaces (existing string for 20 kept). */
  shortLabel: string;
}

export const PRAYER_METHODS: PrayerMethodInfo[] = [
  { id: 20, name: "Kementerian Agama Republik Indonesia", shortLabel: "Kementerian Agama RI" },
  { id: 3, name: "Muslim World League", shortLabel: "Muslim World League" },
  { id: 2, name: "Islamic Society of North America (ISNA)", shortLabel: "ISNA" },
  { id: 4, name: "Umm Al-Qura University, Makkah", shortLabel: "Umm Al-Qura" },
  { id: 5, name: "Egyptian General Authority of Survey", shortLabel: "Egypt" },
  { id: 1, name: "University of Islamic Sciences, Karachi", shortLabel: "Karachi" },
  { id: 17, name: "Jabatan Kemajuan Islam Malaysia (JAKIM)", shortLabel: "JAKIM" },
];

export const DEFAULT_METHOD_ID = 20;

export function isSupportedMethodId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    PRAYER_METHODS.some((m) => m.id === value)
  );
}

export function methodShortLabel(methodId: number): string {
  return PRAYER_METHODS.find((m) => m.id === methodId)?.shortLabel ?? `Method ${methodId}`;
}

/**
 * Asr schools recognised by the AlAdhan timings endpoint
 * (?school=0 Shafi default, ?school=1 Hanafi). Verified live 2026-09-24:
 * school=1 shifts Asr ~1h later, all other times identical.
 */
export type AsrSchool = "STANDARD" | "HANAFI";

export const ASR_SCHOOL_PARAM: Record<AsrSchool, 0 | 1> = {
  STANDARD: 0,
  HANAFI: 1,
};

export function isAsrSchool(value: unknown): value is AsrSchool {
  return value === "STANDARD" || value === "HANAFI";
}
