/**
 * Stage Proxy-1 — server-side Overpass search (no Next imports).
 *
 * The same-origin proxy (`app/api/places/route.ts`) delegates here so the
 * logic stays unit-testable without a Next runtime. The browser never talks
 * to Overpass directly, so Overpass CORS behavior is irrelevant.
 *
 * Guarantees (mirroring the client transport in places.ts):
 * - Input is limited to coordinates + allowlisted category + radius; the
 *   Overpass query is always built server-side — raw client queries are
 *   never accepted or forwarded.
 * - Primary endpoint first; exactly ONE fallback attempt for retryable
 *   failures (timeout, 429/5xx, retryable network). Fatal responses and
 *   external aborts never retry. Total upstream budget ≈22s, inside the
 *   browser client's 25s budget.
 * - Upstream bodies are never surfaced: all failures map to a generic
 *   message. Coordinates and queries are never logged.
 */

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
  isMuslimPlaceCategory,
  resolvePlaceCategory,
  type MuslimPlaceCategoryId,
  type PlaceFilterId,
} from "./placeCategories";

/**
 * Upstream budget per attempt. 10s + 2s wait + 10s keeps the proxy total at
 * ≈22s worst case — inside the browser client's 25s budget (places.ts).
 */
export const PROXY_UPSTREAM_BUDGET_MS = 10_000;
const PROXY_RETRY_WAIT_MS = 2000; // Parity with the client RETRY_WAIT_MS.

const UPSTREAM_UNAVAILABLE = "We couldn't load nearby places right now.";

export interface PlacesProxyParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  category: MuslimPlaceCategoryId;
}

export type PlacesProxyOutcome =
  | { status: 200; elements: OverpassElement[] }
  | { status: 400 | 502 | 504; error: string };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Narrow unknown body to params. Shape + coordinate range + category
 * allowlist are checked here; radius bounds are enforced by the query
 * builders (they throw). Anything unexpected → throw → mapped to 400.
 */
function validateProxyParams(body: unknown): PlacesProxyParams {
  if (typeof body !== "object" || body === null) {
    throw new Error("Invalid request body.");
  }
  const v = body as Record<string, unknown>;
  const { latitude, longitude } = v;
  if (
    !isFiniteNumber(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !isFiniteNumber(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Invalid search coordinates.");
  }
  const radiusMeters =
    v.radiusMeters === undefined
      ? OVERPASS_CONFIG.radiusMeters
      : (v.radiusMeters as number);
  const rawCategory: unknown = v.category === undefined ? "mosques" : v.category;
  if (rawCategory !== "all" && !isMuslimPlaceCategory(rawCategory)) {
    throw new Error("Invalid place category.");
  }
  const category = resolvePlaceCategory(rawCategory as PlaceFilterId);
  return { latitude, longitude, radiusMeters, category };
}

/** Server-side query construction — the client never sends a raw query. */
function buildServerQuery(params: PlacesProxyParams): string {
  const { latitude, longitude, radiusMeters, category } = params;
  return category === "mosques"
    ? buildMosqueQuery({
        latitude,
        longitude,
        radiusMeters,
        timeoutSeconds: OVERPASS_CONFIG.timeoutSeconds,
      })
    : buildPlaceQuery(category, {
        latitude,
        longitude,
        radiusMeters,
        timeoutSeconds: OVERPASS_CONFIG.timeoutSeconds,
      });
}

async function postUpstream(
  query: string,
  endpoint: string,
  signal: AbortSignal
): Promise<OverpassElement[]> {
  const body = new URLSearchParams({ data: query });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      // Server runtimes must identify explicitly (the instance filters
      // unknown agents with HTTP 406); browsers send their own UA.
      "User-Agent": OVERPASS_CONFIG.userAgent,
    },
    body: body.toString(),
    signal,
  });
  if (!res.ok) throw new OverpassStatusError(res.status);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Upstream response was not valid JSON.");
  }
  return assertOverpassElements(json);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function upstreamOutcome(error: unknown): PlacesProxyOutcome {
  // Generic message only — raw upstream bodies/statuses never leak.
  if (error instanceof OverpassTimeoutError) {
    return { status: 504, error: UPSTREAM_UNAVAILABLE };
  }
  return { status: 502, error: UPSTREAM_UNAVAILABLE };
}

/**
 * Run the validated search against Overpass. Rejects (rather than
 * responding) when the caller aborted — the client is gone, so no response
 * would be delivered anyway.
 */
export async function serveNearbySearch(
  body: unknown,
  opts: { signal?: AbortSignal | null; budgetMs?: number } = {}
): Promise<PlacesProxyOutcome> {
  const externalSignal = opts.signal ?? null;
  const budgetMs = opts.budgetMs ?? PROXY_UPSTREAM_BUDGET_MS;

  let query: string;
  try {
    query = buildServerQuery(validateProxyParams(body));
  } catch {
    return { status: 400, error: "Invalid search request." };
  }

  async function runUpstreamAttempt(endpoint: string): Promise<OverpassElement[]> {
    const attempt = new AbortController();
    const onExternalAbort = (): void => {
      attempt.abort(externalSignal?.reason);
    };
    if (externalSignal?.aborted) {
      attempt.abort(externalSignal.reason);
    } else if (externalSignal) {
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
    const timeoutId = setTimeout(() => {
      attempt.abort(new OverpassTimeoutError());
    }, budgetMs);
    try {
      return await postUpstream(query, endpoint, attempt.signal);
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }

  try {
    // Primary endpoint first — always.
    const elements = await runUpstreamAttempt(OVERPASS_CONFIG.endpoint);
    return { status: 200, elements };
  } catch (error) {
    // Caller went away — propagate instead of responding.
    if (externalSignal?.aborted) throw error;
    const retryable =
      error instanceof OverpassTimeoutError ||
      normalizeOverpassError(error).kind === "retryable";
    // Fatal (400/404/406/malformed) — no fallback.
    if (!retryable) return upstreamOutcome(error);
    await sleep(PROXY_RETRY_WAIT_MS);
    if (externalSignal?.aborted) throw error;
    // Single fallback attempt — final, never retried again.
    try {
      const elements = await runUpstreamAttempt(OVERPASS_CONFIG.fallbackEndpoint);
      return { status: 200, elements };
    } catch (fallbackError) {
      if (externalSignal?.aborted) throw fallbackError;
      return upstreamOutcome(fallbackError);
    }
  }
}
