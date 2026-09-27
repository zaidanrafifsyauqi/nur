/**
 * Stage 3A — great-circle Qibla bearing (pure, unit-tested).
 *
 * Initial bearing from the user's coordinates to the Kaaba, computed
 * LOCALLY — no API, no network. Uses the standard initial-bearing
 * formula with inputs in radians and output normalized to [0, 360).
 */
import { KAABA_COORDINATES, EARTH_RADIUS_KM } from "./config";
import { normalize360 } from "./angles";

export class QiblaBearingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QiblaBearingError";
  }
}

export interface QiblaCoords {
  latitude: number;
  longitude: number;
}

/** Explicit rejection — never silently clamp. */
export function assertValidQiblaCoords(coords: QiblaCoords): void {
  const { latitude, longitude } = coords;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new QiblaBearingError("Invalid coordinates for Qibla calculation.");
  }
}

export interface QiblaBearing {
  /** Degrees clockwise from true north, [0, 360). Unrounded internally. */
  bearing: number;
  /**
   * True when the user is effectively AT the Kaaba (sub-meter distance),
   * where bearing is mathematically undefined. Callers must show a
   * dedicated "you are at the Kaaba" state instead of a direction.
   */
  atKaaba: boolean;
  /** Great-circle distance in km (display only). */
  distanceKm: number;
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Zero-distance threshold: bearing undefined within ~1 m of the Kaaba. */
const AT_KAABA_KM = 0.001;

export function calculateQiblaBearing(coords: QiblaCoords): QiblaBearing {
  assertValidQiblaCoords(coords);

  const phi1 = toRad(coords.latitude);
  const phi2 = toRad(KAABA_COORDINATES.latitude);
  const deltaLambda = toRad(KAABA_COORDINATES.longitude - coords.longitude);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const distanceKm = haversineKm(coords);
  if (distanceKm < AT_KAABA_KM) {
    // Deliberate zero-distance state — never NaN in the UI.
    return { bearing: 0, atKaaba: true, distanceKm };
  }

  const theta = Math.atan2(y, x);
  return {
    bearing: normalize360((theta * 180) / Math.PI),
    atKaaba: false,
    distanceKm,
  };
}

/** Haversine distance user → Kaaba (display only, same validated input). */
export function haversineKm(coords: QiblaCoords): number {
  assertValidQiblaCoords(coords);
  const phi1 = toRad(coords.latitude);
  const phi2 = toRad(KAABA_COORDINATES.latitude);
  const dPhi = toRad(KAABA_COORDINATES.latitude - coords.latitude);
  const dLambda = toRad(KAABA_COORDINATES.longitude - coords.longitude);
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}
