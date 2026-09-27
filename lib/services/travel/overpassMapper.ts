/**
 * Stage 3B — Overpass → NUR Place mapper (pure, unit-tested).
 *
 * Only source-provided values are used. Never invents ratings, hours,
 * phones, websites, or certifications. Unnamed places are filtered for a
 * cleaner UX (documented UI fallback exists but filtering is preferred).
 */
import type { Place } from "@/lib/types";
import type { OverpassElement } from "./overpassApi";
import { formatDistance, haversineMeters } from "./distance";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export interface MappedPoint {
  latitude: number;
  longitude: number;
}

/** Extract usable coordinates: node lat/lon, else way/relation center. */
export function extractCoordinates(element: OverpassElement): MappedPoint | null {
  if (element.type === "node") {
    if (
      isFiniteNumber(element.lat) &&
      isFiniteNumber(element.lon) &&
      element.lat >= -90 &&
      element.lat <= 90 &&
      element.lon >= -180 &&
      element.lon <= 180
    ) {
      return { latitude: element.lat, longitude: element.lon };
    }
    return null;
  }
  if (element.type === "way" || element.type === "relation") {
    const center = element.center;
    if (
      center &&
      isFiniteNumber(center.lat) &&
      isFiniteNumber(center.lon) &&
      center.lat >= -90 &&
      center.lat <= 90 &&
      center.lon >= -180 &&
      center.lon <= 180
    ) {
      return { latitude: center.lat, longitude: center.lon };
    }
    return null;
  }
  return null;
}

/** Prefer `name`, then explicit `name:en` fallback; null when nameless. */
export function extractName(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null;
  const name = tags.name?.trim();
  if (name) return name;
  const nameEn = tags["name:en"]?.trim();
  if (nameEn) return nameEn;
  return null;
}

/** Combine only addr:* fields that actually exist; "" when none. */
export function formatOsmAddress(tags: Record<string, string> | undefined): string {
  if (!tags) return "";
  const parts: string[] = [];
  const street = tags["addr:street"]?.trim();
  const house = tags["addr:housenumber"]?.trim();
  if (street) parts.push(house ? `${street} ${house}` : street);
  else if (house) parts.push(house);
  const full = tags["addr:full"]?.trim();
  if (full && parts.length === 0) parts.push(full);
  const city = tags["addr:city"]?.trim() ?? tags["addr:suburb"]?.trim() ?? "";
  if (city) parts.push(city);
  const postcode = tags["addr:postcode"]?.trim();
  if (postcode) parts.push(postcode);
  return parts.join(", ");
}

export function osmObjectUrl(
  type: OverpassElement["type"],
  id: number
): string | undefined {
  if (!Number.isInteger(id) || id <= 0) return undefined;
  if (type !== "node" && type !== "way" && type !== "relation") return undefined;
  return `https://www.openstreetmap.org/${type}/${id}`;
}

/**
 * Stage 3C — true only when source tags carry diet:halal=yes.
 * UI shows "OSM tagged halal" from this — never "certified".
 */
export function hasHalalTag(tags: Record<string, string> | undefined): boolean {
  return tags?.["diet:halal"] === "yes";
}

export interface MapPlaceInput {
  element: OverpassElement;
  userLatitude: number;
  userLongitude: number;
  /**
   * Stage 3C — category context from the query/service (never UI labels).
   * Defaults to "mosque" so Stage 3B callers keep working unchanged.
   */
  category?: "mosque" | "islamic-center" | "halal-food";
}

/** Validate → coordinates → normalize → NUR Place. Null = reject. */
export function mapOverpassElementToPlace(input: MapPlaceInput): Place | null {
  const { element, userLatitude, userLongitude, category = "mosque" } = input;
  if (!Number.isInteger(element.id) || element.id <= 0) return null;
  const point = extractCoordinates(element);
  if (!point) return null;
  const name = extractName(element.tags);
  if (!name) return null;
  const distanceMeters = Math.round(
    haversineMeters(userLatitude, userLongitude, point.latitude, point.longitude)
  );
  const address = formatOsmAddress(element.tags);
  const baseTags =
    category === "mosque"
      ? ["mosque", "place-of-worship"]
      : category === "islamic-center"
        ? ["islamic-center", "community"]
        : ["halal-food", "food"];
  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    category,
    distance: formatDistance(distanceMeters),
    address,
    tags: baseTags,
    source: "osm",
    sourceType: element.type,
    latitude: point.latitude,
    longitude: point.longitude,
    distanceMeters,
    osmUrl: osmObjectUrl(element.type, element.id),
    sourceTags: element.tags ? { ...element.tags } : undefined,
  };
}
