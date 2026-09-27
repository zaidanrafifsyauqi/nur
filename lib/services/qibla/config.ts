/**
 * Stage 3A — Qibla configuration (single source of truth).
 *
 * Kaaba coordinates are established geographic constants — never fetched,
 * never scattered across components.
 */
export const KAABA_COORDINATES = {
  latitude: 21.422487,
  longitude: 39.826206,
} as const;

/** Alignment tolerance in degrees — tunable in one place. */
export const QIBLA_ALIGNMENT_TOLERANCE = 5;

/** Mean Earth radius for the (display-only) distance readout. */
export const EARTH_RADIUS_KM = 6371;
