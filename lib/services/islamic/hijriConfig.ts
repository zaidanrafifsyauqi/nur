/**
 * Stage 2D — Hijri calendar configuration.
 *
 * AlAdhan computes Hijri dates with a fixed calendar method (observed:
 * "HJCoSA"). Stored here so the UI can label it neutrally and a future
 * Settings screen can switch methods where the API supports it.
 * No manual day offsets are applied anywhere.
 */
export const HIJRI_CALENDAR_METHOD_FALLBACK = "HJCoSA";

export const HIJRI_YEAR_MIN = 1300;
export const HIJRI_YEAR_MAX = 1600;
