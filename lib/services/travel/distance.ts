/**
 * Stage 3B — local distance utilities (pure, unit-tested). No API calls.
 */

const EARTH_RADIUS_METERS = 6371000;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in metres between two WGS84 points. */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

/** <1000 m → integer metres; ≥1000 m → one-decimal km. */
export function formatDistance(distanceMeters: number): string {
  const m = Math.max(0, Math.round(distanceMeters));
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
