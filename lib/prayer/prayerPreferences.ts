/**
 * Stage 4C — prayer preferences model (pure, no DOM).
 *
 * Local-only personalization: calculation method, Asr school, time
 * format. Follows the Stage 4B local-state pattern (versioned key,
 * strict validator, safe parser, fail-safe fallbacks).
 *
 * NOTE on the default time format: the existing NUR UI renders 12-hour
 * strings ("4:32 AM" via toDisplayTime), so the default is "12h" to keep
 * current rendering byte-identical. "24h" is the opt-in alternative.
 */
import {
  DEFAULT_METHOD_ID,
  isAsrSchool,
  isSupportedMethodId,
  type AsrSchool,
} from "@/lib/services/prayer/methods";
import { isPrayerTimeFormat, type PrayerTimeFormat } from "@/lib/services/prayer/timeFormat";

export const PRAYER_PREFS_KEY = "nur:prayer:preferences:v1";

export interface PrayerPreferences {
  calculationMethod: number;
  school: AsrSchool;
  timeFormat: PrayerTimeFormat;
}

export const DEFAULT_PRAYER_PREFERENCES: PrayerPreferences = {
  calculationMethod: DEFAULT_METHOD_ID,
  school: "STANDARD",
  timeFormat: "12h",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Strict validator — anything off-spec falls back to defaults. */
export function isPrayerPreferences(value: unknown): value is PrayerPreferences {
  return (
    isRecord(value) &&
    isSupportedMethodId(value.calculationMethod) &&
    isAsrSchool(value.school) &&
    isPrayerTimeFormat(value.timeFormat)
  );
}

/** Safe parser: valid → as-is; anything else → defaults (never throws). */
export function parsePrayerPreferences(raw: string | null): PrayerPreferences {
  if (raw == null || raw.trim() === "") return { ...DEFAULT_PRAYER_PREFERENCES };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_PRAYER_PREFERENCES };
  }
  if (!isPrayerPreferences(parsed)) return { ...DEFAULT_PRAYER_PREFERENCES };
  return {
    calculationMethod: parsed.calculationMethod,
    school: parsed.school,
    timeFormat: parsed.timeFormat,
  };
}

export function serializePrayerPreferences(prefs: PrayerPreferences): string {
  return JSON.stringify(prefs);
}

export function prayerPreferencesEqual(a: PrayerPreferences, b: PrayerPreferences): boolean {
  return (
    a.calculationMethod === b.calculationMethod &&
    a.school === b.school &&
    a.timeFormat === b.timeFormat
  );
}

/** Browser-safe storage accessor — null on server / unavailable / denied. */
export function getPrefsStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}
