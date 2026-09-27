/**
 * Stage 3B — Overpass API client types + query builder (no UI imports).
 *
 * Shape verified live against overpass-api.de (node lat/lon, way/relation
 * center via `out center`, tags map; extra top-level keys tolerated).
 * NOTE: the instance filters unknown User-Agents (HTTP 406), so requests
 * carry an identifying UA. Browsers send their own UA automatically.
 */

export interface OverpassCenter {
  lat: number;
  lon: number;
}

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: OverpassCenter;
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

export interface MosqueSearchInput {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  timeoutSeconds: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Query builder — radius/lat/lng interpolated only after validation. */
export function buildMosqueQuery(input: MosqueSearchInput): string {
  return buildPlaceQuery("mosques", input);
}

function validatedSearchParams(input: MosqueSearchInput): {
  lat: string;
  lng: string;
  radius: number;
  timeout: number;
} {
  const { latitude, longitude, radiusMeters, timeoutSeconds } = input;
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
  const radius = Math.floor(radiusMeters);
  const timeout = Math.floor(timeoutSeconds);
  if (!Number.isFinite(radius) || radius < 100 || radius > 20000) {
    throw new Error("Invalid search radius.");
  }
  if (!Number.isFinite(timeout) || timeout < 5 || timeout > 60) {
    throw new Error("Invalid timeout.");
  }
  return { lat: latitude.toFixed(6), lng: longitude.toFixed(6), radius, timeout };
}

type ElementKind = "node" | "way" | "relation";
const ELEMENT_KINDS: ElementKind[] = ["node", "way", "relation"];

function tagBlock(kind: ElementKind, tags: string, around: string): string {
  return `${kind}${tags}${around};`;
}

/**
 * Stage 3C — category-aware query builder on the single transport shape.
 * Tag sets are probe-verified (see placeCategories.ts); unknown categories
 * throw rather than producing an open-ended query.
 */
export function buildPlaceQuery(
  category: "mosques" | "islamic-centers" | "halal-food",
  input: MosqueSearchInput
): string {
  const { lat, lng, radius, timeout } = validatedSearchParams(input);
  const around = `(around:${radius},${lat},${lng})`;
  const blocks: string[] = [];
  const pushKinds = (tags: string) => {
    for (const kind of ELEMENT_KINDS) blocks.push(tagBlock(kind, tags, around));
  };
  switch (category) {
    case "mosques":
      pushKinds('["amenity"="place_of_worship"]["religion"="muslim"]');
      break;
    case "islamic-centers":
      // Conservative union — bare community_centre means civic halls.
      pushKinds('["amenity"="community_centre"]["religion"="muslim"]');
      pushKinds('["office"="religion"]["religion"="muslim"]');
      break;
    case "halal-food": {
      // Structured halal evidence only — never name matching.
      const amenities = ["restaurant", "cafe", "fast_food"];
      for (const amenity of amenities) {
        pushKinds(`["amenity"="${amenity}"]["diet:halal"="yes"]`);
      }
      break;
    }
    default:
      throw new Error("Invalid place category.");
  }
  return `[out:json][timeout:${timeout}];(${blocks.join("")});out center tags;`;
}
