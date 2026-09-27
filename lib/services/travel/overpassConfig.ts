/**
 * Stage 3B — centralized Overpass configuration.
 *
 * Public Overpass instances are shared infrastructure for small projects:
 * bounded radius, result cap, single-flight requests, one retry max.
 * For heavier traffic NUR would self-host or use a paid provider.
 */
export const OVERPASS_CONFIG = {
  endpoint: "https://overpass-api.de/api/interpreter",
  timeoutSeconds: 20,
  radiusMeters: 3000,
  maxResults: 50,
  /** POST the query as form data (reliable across instances). */
  usePost: true,
} as const;

/** OSM tag filter for Muslim worship places (Stage 3B scope). */
export const MOSQUE_TAG_FILTER =
  '["amenity"="place_of_worship"]["religion"="muslim"]' as const;
