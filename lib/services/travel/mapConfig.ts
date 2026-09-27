/**
 * Stage 3B — centralized map configuration.
 *
 * Renderer: MapLibre GL JS. Basemap: OpenFreeMap Liberty style (free,
 * no API key, OSM-derived data). No Google services anywhere.
 */
export const MAP_CONFIG = {
  styleUrl: "https://tiles.openfreemap.org/styles/liberty",
  /**
   * Self-hosted MapLibre worker (public/maplibre/, synced by postinstall).
   * The bundler never emits the worker next to app chunks, so the default
   * relative worker URL 404s ("Worker failed to load"). Set via
   * maplibre.setWorkerUrl() before creating the map.
   */
  workerUrl: "/maplibre/maplibre-gl-worker.mjs",
  /** Neutral default center (NOT the user) when location is unavailable. */
  defaultCenter: { latitude: 0, longitude: 0 },
  defaultZoom: 2,
  focusedZoom: 14,
  /** Touch-friendly marker sizes (px). */
  markerSize: 40,
  markerSelectedSize: 48,
} as const;
