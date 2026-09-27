/**
 * Stage 3C — centralized Muslim-place category model (single source of truth).
 *
 * Tag strategies below come from LIVE Overpass probes (central Jakarta),
 * not assumptions:
 * - mosques: amenity=place_of_worship + religion=muslim → rich (18 hits r=1000).
 * - islamic-centers: community_centre/office + religion=muslim → ZERO hits
 *   here (bare community_centre = civic halls, NOT Islamic — excluded).
 *   Conservative union kept for regions where mappers tag them properly.
 * - halal-food: restaurant/cafe/fast_food + diet:halal=yes → valid (HTTP 200)
 *   but ZERO hits r≤3000; large radii time out on public Overpass, so the
 *   standard 3 km bound stands and empty results are honest.
 *
 * No name-based classification anywhere: a name containing "halal/islam/
 * muslim" without supporting structured tags is never enough.
 */

export type MuslimPlaceCategoryId = "mosques" | "islamic-centers" | "halal-food";

/** "all" is a UI-level pseudo-category backed by the mosque dataset. */
export type PlaceFilterId = "all" | MuslimPlaceCategoryId;

export interface PlaceCategoryConfig {
  id: MuslimPlaceCategoryId;
  /** Display label (UI only — never used as internal enum). */
  label: string;
  /** Internal Place.category value produced by the mapper. */
  placeCategory: "mosque" | "islamic-center" | "halal-food";
  emptyTitle: string;
  searchingLabel: string;
  errorMessage: string;
  searchAreaLabel: string;
}

export const PLACE_CATEGORIES: Record<MuslimPlaceCategoryId, PlaceCategoryConfig> = {
  mosques: {
    id: "mosques",
    label: "Mosques",
    placeCategory: "mosque",
    emptyTitle: "No mosques found in this area.",
    searchingLabel: "Searching nearby mosques…",
    errorMessage: "We couldn't load nearby mosques right now.",
    searchAreaLabel: "Search mosques in this area",
  },
  "islamic-centers": {
    id: "islamic-centers",
    label: "Islamic Centers",
    placeCategory: "islamic-center",
    emptyTitle: "No Islamic centers found in this area.",
    searchingLabel: "Searching nearby Islamic centers…",
    errorMessage: "We couldn't load nearby Islamic centers right now.",
    searchAreaLabel: "Search Islamic centers in this area",
  },
  "halal-food": {
    id: "halal-food",
    label: "Halal Food",
    placeCategory: "halal-food",
    emptyTitle: "No halal food places found in this area.",
    searchingLabel: "Searching nearby halal food…",
    errorMessage: "We couldn't load nearby halal food right now.",
    searchAreaLabel: "Search halal food in this area",
  },
};

export const PLACE_CATEGORY_IDS = Object.keys(PLACE_CATEGORIES) as MuslimPlaceCategoryId[];

export function isMuslimPlaceCategory(value: unknown): value is MuslimPlaceCategoryId {
  return (
    typeof value === "string" &&
    (value === "mosques" || value === "islamic-centers" || value === "halal-food")
  );
}

/** Resolve a UI filter to the backing category ("all" → mosques dataset). */
export function resolvePlaceCategory(filter: PlaceFilterId): MuslimPlaceCategoryId {
  return filter === "all" ? "mosques" : filter;
}
