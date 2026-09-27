/**
 * Stage 3B — nearby-mosque search orchestration (client-side, UI-agnostic).
 *
 * Guarantees:
 * - Session in-memory cache keyed by category + rounded coords + radius.
 * - Single-flight request guard: a new search aborts the previous one
 *   (latest wins, no unbounded queue).
 * - AbortController honored; unmount aborts via abortNearbySearch().
 * - At most ONE retry for transient failures (429/5xx/network/timeout),
 *   with a pause before retrying. No retry for fatal responses.
 * - Results sorted nearest-first and capped at maxResults.
 *
 * Coordinates travel only to the configured Overpass endpoint, only on
 * explicit search. Nothing is persisted.
 */
import type { Place } from "@/lib/types";
import {
  buildMosqueQuery,
  buildPlaceQuery,
  type OverpassElement,
  type OverpassResponse,
} from "./overpassApi";
import { OVERPASS_CONFIG } from "./overpassConfig";
import {
  normalizeOverpassError,
  OverpassStatusError,
} from "./overpassError";
import {
  PLACE_CATEGORIES,
  resolvePlaceCategory,
  type MuslimPlaceCategoryId,
  type PlaceFilterId,
} from "./placeCategories";
import { mapOverpassElementToPlace } from "./overpassMapper";

export interface NearbySearchParams {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  maxResults?: number;
  /** Stage 3C — active category (single fetch; never all at once). */
  category?: MuslimPlaceCategoryId | PlaceFilterId;
}

export interface NearbySearchResult {
  places: Place[];
  cached: boolean;
  searchCenter: { latitude: number; longitude: number };
  category: MuslimPlaceCategoryId;
}

interface CacheEntry {
  at: number;
  places: Place[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const RETRY_WAIT_MS = 2000;

const cache = new Map<string, CacheEntry>();
let activeController: AbortController | null = null;

function cacheKey(
  category: MuslimPlaceCategoryId,
  latitude: number,
  longitude: number,
  radius: number
): string {
  return `${category}|${latitude.toFixed(3)}|${longitude.toFixed(3)}|${radius}`;
}

/** For tests only. */
export function clearNearbyCache(): void {
  cache.clear();
}

export function abortNearbySearch(): void {
  activeController?.abort();
  activeController = null;
}

function isValidElement(value: unknown): value is OverpassElement {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.type === "node" || v.type === "way" || v.type === "relation") &&
    typeof v.id === "number"
  );
}

async function postQuery(
  query: string,
  signal: AbortSignal
): Promise<OverpassElement[]> {
  const body = new URLSearchParams({ data: query });
  // Browsers send their own UA automatically (setting User-Agent is
  // forbidden there). Non-browser runtimes (tests/SSR) identify explicitly
  // because the instance filters unknown agents (HTTP 406).
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
  };
  if (typeof window === "undefined") {
    headers["User-Agent"] = "NUR-MuslimMap/3B (https://github.com/anomalyco/opencode)";
  }
  const res = await fetch(OVERPASS_CONFIG.endpoint, {
    method: "POST",
    headers,
    body: body.toString(),
    signal,
  });
  if (!res.ok) throw new OverpassStatusError(res.status);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Overpass response was not valid JSON.");
  }
  if (
    typeof json !== "object" ||
    json === null ||
    !Array.isArray((json as Partial<OverpassResponse>).elements)
  ) {
    throw new Error("Overpass response was malformed.");
  }
  const elements = (json as OverpassResponse).elements;
  if (!elements.every(isValidElement)) {
    throw new Error("Overpass response was malformed.");
  }
  return elements;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchNearbyMosques(
  params: NearbySearchParams
): Promise<NearbySearchResult> {
  const { latitude, longitude } = params;
  const radius = params.radiusMeters ?? OVERPASS_CONFIG.radiusMeters;
  const maxResults = params.maxResults ?? OVERPASS_CONFIG.maxResults;
  const category = resolvePlaceCategory(params.category ?? "mosques");
  const placeCategory = PLACE_CATEGORIES[category].placeCategory;

  const query =
    category === "mosques"
      ? buildMosqueQuery({
          latitude,
          longitude,
          radiusMeters: radius,
          timeoutSeconds: OVERPASS_CONFIG.timeoutSeconds,
        })
      : buildPlaceQuery(category, {
          latitude,
          longitude,
          radiusMeters: radius,
          timeoutSeconds: OVERPASS_CONFIG.timeoutSeconds,
        });

  const key = cacheKey(category, latitude, longitude, radius);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return {
      places: hit.places,
      cached: true,
      searchCenter: { latitude, longitude },
      category,
    };
  }

  // Single-flight: supersede any in-flight search.
  abortNearbySearch();
  const controller = new AbortController();
  activeController = controller;

  // Client-side timeout races the request (Overpass has its own server timeout too).
  const timeoutId = setTimeout(
    () => controller.abort(new Error("Overpass request timed out.")),
    OVERPASS_CONFIG.timeoutSeconds * 1000 + 5000
  );

  try {
    let elements: OverpassElement[];
    try {
      elements = await postQuery(query, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) throw error;
      const normalized = normalizeOverpassError(error);
      if (normalized.kind !== "retryable") throw error;
      await sleep(RETRY_WAIT_MS);
      if (controller.signal.aborted) throw error;
      elements = await postQuery(query, controller.signal);
    }

    const places = elements
      .map((element) =>
        mapOverpassElementToPlace({
          element,
          userLatitude: latitude,
          userLongitude: longitude,
          category: placeCategory,
        })
      )
      .filter((p): p is Place => p !== null)
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
      .slice(0, maxResults);

    cache.set(key, { at: Date.now(), places });
    return { places, cached: false, searchCenter: { latitude, longitude }, category };
  } finally {
    clearTimeout(timeoutId);
    if (activeController === controller) activeController = null;
  }
}

/** Stage 3C alias — same single transport, category-driven. */
export const searchNearbyPlaces = searchNearbyMosques;
