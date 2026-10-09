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
  assertOverpassElements,
  buildMosqueQuery,
  buildPlaceQuery,
  type OverpassElement,
} from "./overpassApi";
import { OVERPASS_CONFIG } from "./overpassConfig";
import {
  normalizeOverpassError,
  OverpassStatusError,
  OverpassTimeoutError,
} from "./overpassError";
import {
  PLACE_CATEGORIES,
  resolvePlaceCategory,
  type MuslimPlaceCategoryId,
  type PlaceFilterId,
} from "./placeCategories";
import { mapOverpassElementToPlace, type MapPlaceInput } from "./overpassMapper";

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
let timeoutBudgetOverrideMs: number | null = null;

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

/**
 * For tests only — shrinks the client-side timeout budget so timeout
 * behavior is deterministic without waiting out the production budget.
 * Pass null to restore the production budget.
 */
export function setSearchTimeoutBudgetForTests(ms: number | null): void {
  timeoutBudgetOverrideMs = ms;
}

export function abortNearbySearch(): void {
  activeController?.abort();
  activeController = null;
}

async function postQuery(
  query: string,
  signal: AbortSignal,
  endpoint: string
): Promise<OverpassElement[]> {
  const body = new URLSearchParams({ data: query });
  // Browsers send their own UA automatically (setting User-Agent is
  // forbidden there). Non-browser runtimes (tests/SSR) identify explicitly
  // because the instance filters unknown agents (HTTP 406).
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
  };
  if (typeof window === "undefined") {
    headers["User-Agent"] = OVERPASS_CONFIG.userAgent;
  }
  const res = await fetch(endpoint, {
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
  return assertOverpassElements(json);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One fetch attempt with its own AbortController, so an internal timeout
 * never poisons a later attempt's signal. External aborts (unmount,
 * superseding search) propagate through the operation controller: they
 * reject with the operation's abort reason (never OverpassTimeoutError)
 * and stay silent. Attempts are strictly sequential — never parallel.
 */
async function runAttempt(
  operation: AbortController,
  budgetMs: number,
  doFetch: (signal: AbortSignal) => Promise<OverpassElement[]>
): Promise<OverpassElement[]> {
  const attempt = new AbortController();
  const onExternalAbort = (): void => {
    attempt.abort(operation.signal.reason);
  };
  if (operation.signal.aborted) {
    attempt.abort(operation.signal.reason);
  } else {
    operation.signal.addEventListener("abort", onExternalAbort, { once: true });
  }
  const timeoutId = setTimeout(() => {
    attempt.abort(new OverpassTimeoutError());
  }, budgetMs);
  try {
    return await doFetch(attempt.signal);
  } finally {
    clearTimeout(timeoutId);
    operation.signal.removeEventListener("abort", onExternalAbort);
  }
}

interface FinalizeSearchInput {
  elements: OverpassElement[];
  latitude: number;
  longitude: number;
  placeCategory: MapPlaceInput["category"];
  category: MuslimPlaceCategoryId;
  cacheKeyValue: string;
  maxResults: number;
}

/** Shared tail: map → filter → sort → cap → cache → result. */
function finalizeSearch(input: FinalizeSearchInput): NearbySearchResult {
  const {
    elements,
    latitude,
    longitude,
    placeCategory,
    category,
    cacheKeyValue,
    maxResults,
  } = input;
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

  cache.set(cacheKeyValue, { at: Date.now(), places });
  return { places, cached: false, searchCenter: { latitude, longitude }, category };
}

/** Same-origin proxy path (the server builds the Overpass query). */
const PROXY_PATH = "/api/places";

/**
 * Proxy transport: exactly one POST per call, no client-side retry.
 * The proxy returns the raw `{ elements }` shape so mapping stays shared
 * with direct mode.
 */
async function postProxy(
  input: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    category: MuslimPlaceCategoryId;
  },
  signal: AbortSignal
): Promise<OverpassElement[]> {
  const res = await fetch(PROXY_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok) throw new Error(`Nearby search proxy failed (${res.status}).`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Nearby search proxy returned invalid JSON.");
  }
  return assertOverpassElements(json);
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
  const operation = new AbortController();
  activeController = operation;

  // Client-side timeout races each attempt (Overpass has its own server timeout too).
  const budgetMs =
    timeoutBudgetOverrideMs ?? OVERPASS_CONFIG.timeoutSeconds * 1000 + 5000;

  try {
    let elements: OverpassElement[];
    try {
      // Primary endpoint first — always.
      elements = await runAttempt(operation, budgetMs, (signal) =>
        postQuery(query, signal, OVERPASS_CONFIG.endpoint)
      );
    } catch (error) {
      // External abort or superseded by a newer search — never retry.
      if (operation.signal.aborted || activeController !== operation) throw error;
      const retryable =
        error instanceof OverpassTimeoutError ||
        normalizeOverpassError(error).kind === "retryable";
      // Fatal (400/404/406/malformed) or empty-shaped success — no fallback.
      // (Empty results never throw, so they never reach this branch.)
      if (!retryable) throw error;
      await sleep(RETRY_WAIT_MS);
      // A newer search started (or unmount aborted us) while waiting — yield.
      if (operation.signal.aborted || activeController !== operation) throw error;
      // Single fallback attempt (total budget OVERPASS_CONFIG.maxAttempts):
      // its outcome (success or failure) is final — never retried again.
      elements = await runAttempt(operation, budgetMs, (signal) =>
        postQuery(query, signal, OVERPASS_CONFIG.fallbackEndpoint)
      );
    }

    return finalizeSearch({
      elements,
      latitude,
      longitude,
      placeCategory,
      category,
      cacheKeyValue: key,
      maxResults,
    });
  } finally {
    if (activeController === operation) activeController = null;
  }
}

/**
 * Stage Proxy-1 — same search contract via the same-origin proxy.
 *
 * Exactly ONE proxy call per browser search: upstream retry lives
 * server-side, so the browser never multiplies upstream attempts. Client
 * cache, single-flight, timeout budget, mapping, sorting, caps, and the UI
 * contract are shared with direct mode.
 */
export async function searchNearbyViaProxy(
  params: NearbySearchParams
): Promise<NearbySearchResult> {
  const { latitude, longitude } = params;
  const radius = params.radiusMeters ?? OVERPASS_CONFIG.radiusMeters;
  const maxResults = params.maxResults ?? OVERPASS_CONFIG.maxResults;
  const category = resolvePlaceCategory(params.category ?? "mosques");
  const placeCategory = PLACE_CATEGORIES[category].placeCategory;

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

  // Single-flight: supersede any in-flight search (shared with direct mode).
  abortNearbySearch();
  const operation = new AbortController();
  activeController = operation;

  // Same client budget races the single proxy call; the proxy's own
  // upstream budget (≈22s worst case) is designed to fit inside it.
  const budgetMs =
    timeoutBudgetOverrideMs ?? OVERPASS_CONFIG.timeoutSeconds * 1000 + 5000;

  try {
    // No client-side retry by design: any non-abort failure surfaces once,
    // and the proxy owns the single upstream retry.
    const elements = await runAttempt(operation, budgetMs, (signal) =>
      postProxy({ latitude, longitude, radiusMeters: radius, category }, signal)
    );
    return finalizeSearch({
      elements,
      latitude,
      longitude,
      placeCategory,
      category,
      cacheKeyValue: key,
      maxResults,
    });
  } finally {
    if (activeController === operation) activeController = null;
  }
}

/** Stage 3C alias — same single transport, category-driven. */
export const searchNearbyPlaces = searchNearbyMosques;
