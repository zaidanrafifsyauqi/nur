/**
 * Stage 3B — centralized Overpass configuration.
 *
 * Public Overpass instances are shared infrastructure for small projects:
 * bounded radius, result cap, single-flight requests, one retry max.
 * For heavier traffic NUR would self-host or use a paid provider.
 */
export const OVERPASS_CONFIG = {
  endpoint: "https://overpass-api.de/api/interpreter",
  /**
   * Identifying UA for non-browser runtimes (shared by the direct browser
   * transport, which skips it, and the server proxy, which always sends it).
   * Browsers send their own UA automatically (setting it is forbidden).
   */
  userAgent: "NUR-MuslimMap/3B (https://github.com/anomalyco/opencode)",
  /**
   * Single backup instance, tried only after the primary fails retryably.
   * z.overpass-api.de is a documented public server of the same FOSSGIS
   * fleet (OpenStreetMap wiki: the round-robin address redirects to the z
   * and lz4 backends), same /api/interpreter contract, no key required.
   * Verified live (DNS + /api/status 200 with free slots). Same-fleet
   * pinning survives single-server/frontend sickness, not a fleet-wide
   * outage — a documented limitation, not a second infrastructure.
   */
  fallbackEndpoint: "https://z.overpass-api.de/api/interpreter",
  /**
   * Total fetch attempts per search, explicit and bounded: 1 primary +
   * 1 fallback. Attempts are strictly sequential (never parallel), and a
   * failed fallback is final — no layered or unbounded retries.
   */
  maxAttempts: 2,
  timeoutSeconds: 20,
  radiusMeters: 3000,
  maxResults: 50,
  /** POST the query as form data (reliable across instances). */
  usePost: true,
} as const;

/** OSM tag filter for Muslim worship places (Stage 3B scope). */
export const MOSQUE_TAG_FILTER =
  '["amenity"="place_of_worship"]["religion"="muslim"]' as const;
