import {
  mockHalalFood,
  mockNearbyMosques,
  mockQibla,
  mockTravelLocation,
} from "@/lib/mock/travel";

/** Stage 1 placeholders — no network, no geolocation (travel landing still mock). */
export async function getTravelLocation() {
  return mockTravelLocation;
}
export async function getNearbyMosques() {
  return mockNearbyMosques;
}
export async function getHalalFood() {
  return mockHalalFood;
}
export async function getQiblaPlaceholder() {
  return mockQibla;
}

/** Stage 3B — live OSM mosque search (client-driven, see places.ts). */
export { searchNearbyMosques, abortNearbySearch } from "./places";
/** Stage 3C — generalized alias (same transport, category-driven). */
export { searchNearbyPlaces } from "./places";
