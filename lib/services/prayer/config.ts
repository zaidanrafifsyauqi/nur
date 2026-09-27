/**
 * Stage 2B — prayer calculation configuration.
 *
 * methodId 20 = "Kementerian Agama Republik Indonesia" (Kemenag RI),
 * the reasonable default for Indonesia. Structured as a single config
 * object so Settings can later swap method/school without touching
 * call sites.
 */
export interface PrayerCalcConfig {
  methodId: number;
  methodLabel: string;
  /** Asr juristic method recognised by AlAdhan (STANDARD | HANAFI). */
  school: "STANDARD" | "HANAFI";
}

export const PRAYER_CALC_CONFIG: PrayerCalcConfig = {
  methodId: 20,
  methodLabel: "Kementerian Agama RI",
  school: "STANDARD",
};

/** Sample fallback location (explicitly labeled in UI, never guessed). */
export const SAMPLE_LOCATION = {
  lat: -6.2,
  lng: 106.85,
  label: "Jakarta, Indonesia (sample)",
} as const;
