/**
 * Stage 3B — verification (run: `npx tsx lib/services/travel/muslimMap.verify.ts`).
 * Covers §53 (pure unit tests, no network) + §54 (query builder) +
 * §55 (one small live Overpass probe — marked NOT VERIFIED if unreachable).
 */
import {
  buildMosqueQuery,
  buildPlaceQuery,
  type OverpassElement,
} from "./overpassApi";
import { OVERPASS_CONFIG } from "./overpassConfig";
import {
  isMuslimPlaceCategory,
  PLACE_CATEGORIES,
  PLACE_CATEGORY_IDS,
  resolvePlaceCategory,
} from "./placeCategories";
import {
  clearNearbyCache,
  searchNearbyMosques,
  searchNearbyPlaces,
} from "./places";
import {
  extractCoordinates,
  extractName,
  formatOsmAddress,
  hasHalalTag,
  mapOverpassElementToPlace,
  osmObjectUrl,
} from "./overpassMapper";
import { formatDistance, haversineMeters } from "./distance";

let pass = 0;
let fail = 0;
function check(cond: boolean, name: string, extra = ""): void {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

const nodeEl: OverpassElement = {
  type: "node",
  id: 1,
  lat: -6.17,
  lon: 106.83,
  tags: { name: "Masjid A", amenity: "place_of_worship", religion: "muslim" },
};
const wayEl: OverpassElement = {
  type: "way",
  id: 2,
  center: { lat: -6.18, lon: 106.84 },
  tags: { name: "Masjid B" },
};
const relEl: OverpassElement = {
  type: "relation",
  id: 3,
  center: { lat: -6.19, lon: 106.85 },
  tags: { "name:en": "Mosque C" },
};

// --- Coordinate validation ---
check(
  extractCoordinates({ type: "node", id: 9, lat: 91, lon: 0 }) === null,
  "reject invalid latitude"
);
check(
  extractCoordinates({ type: "node", id: 9, lat: 0, lon: 200 }) === null,
  "reject invalid longitude"
);
check(
  extractCoordinates({ type: "node", id: 9, lat: NaN, lon: 0 }) === null,
  "reject NaN"
);
check(
  extractCoordinates({ type: "node", id: 9, lat: 0, lon: Infinity }) === null,
  "reject Infinity"
);
// --- Element shapes ---
const nodePt = extractCoordinates(nodeEl);
check(nodePt?.latitude === -6.17 && nodePt?.longitude === 106.83, "node lat/lon");
const wayPt = extractCoordinates(wayEl);
check(wayPt?.latitude === -6.18, "way center");
const relPt = extractCoordinates(relEl);
check(relPt?.longitude === 106.85, "relation center");
check(
  extractCoordinates({ type: "node", id: 5, tags: {} }) === null,
  "missing coordinate rejected"
);
check(
  extractCoordinates({ type: "node", id: 5, lat: 0, lon: 0 }) !== null,
  "zero coordinate accepted (valid point)"
);
check(
  mapOverpassElementToPlace({ element: { type: "node", id: -1, lat: 0, lon: 0 }, userLatitude: 0, userLongitude: 0 }) === null,
  "missing id rejected"
);
check(
  mapOverpassElementToPlace({
    element: { type: "node", id: 7, lat: 0, lon: 0, tags: { amenity: "x" } },
    userLatitude: 0,
    userLongitude: 0,
  }) === null,
  "unnamed filtered"
);

// --- Name mapping ---
check(extractName({ name: "Masjid A" }) === "Masjid A", "name preferred");
check(extractName({ "name:en": "Mosque C" }) === "Mosque C", "name:en fallback");
check(extractName({ amenity: "x" }) === null, "nameless → null");
check(extractName(undefined) === null, "missing tags → null");

// --- Address ---
check(
  formatOsmAddress({ "addr:street": "Jalan Mawar", "addr:housenumber": "10", "addr:city": "Jakarta", "addr:postcode": "10110" }) ===
    "Jalan Mawar 10, Jakarta, 10110",
  "address full"
);
check(formatOsmAddress({ "addr:city": "Jakarta" }) === "Jakarta", "address city only");
check(formatOsmAddress({}) === "", "address missing → hidden");
check(formatOsmAddress(undefined) === "", "address undefined → hidden");

// --- OSM URL ---
check(osmObjectUrl("way", 155) === "https://www.openstreetmap.org/way/155", "osm url");
check(osmObjectUrl("node", -1) === undefined, "osm url invalid id");

// --- Distance ---
check(haversineMeters(-6.17, 106.83, -6.17, 106.83) === 0, "same coordinate → 0");
const dAB = haversineMeters(-6.17, 106.83, -6.18, 106.84);
const dBA = haversineMeters(-6.18, 106.84, -6.17, 106.83);
check(Math.abs(dAB - dBA) < 1e-9, "distance symmetry");
check(dAB > 1000 && dAB < 2000, `known pair sane (${Math.round(dAB)} m)`);
check(formatDistance(0) === "0 m", "format 0m");
check(formatDistance(450) === "450 m", "format 450m");
check(formatDistance(999) === "999 m", "format 999m");
check(formatDistance(1000) === "1.0 km", "format 1000m");
check(formatDistance(2300) === "2.3 km", "format 2300m");

// --- Sorting + limit ---
const many: OverpassElement[] = Array.from({ length: 60 }, (_, i) => ({
  type: "node" as const,
  id: 100 + i,
  lat: -6.17 + i * 0.001,
  lon: 106.83,
  tags: { name: `M ${i}` },
}));
const mapped = many
  .map((element) =>
    mapOverpassElementToPlace({ element, userLatitude: -6.17, userLongitude: 106.83 })
  )
  .filter((p) => p !== null)
  .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
  .slice(0, OVERPASS_CONFIG.maxResults);
check(mapped.length === 50, "limit 50 enforced");
check(
  (mapped[0].distanceMeters ?? 0) <= (mapped[mapped.length - 1].distanceMeters ?? 0),
  "nearest-first sorting"
);

// --- Query builder ---
const q = buildMosqueQuery({ latitude: -6.1754, longitude: 106.8272, radiusMeters: 3000, timeoutSeconds: 20 });
check(q.includes("[out:json]"), "query out:json");
check(q.includes("[timeout:20]"), "query timeout");
check(q.includes("-6.175400") && q.includes("106.827200"), "query lat/lng");
check(q.includes("around:3000"), "query radius");
check(q.includes('["amenity"="place_of_worship"]["religion"="muslim"]'), "query muslim tags");
check(!q.includes("<script"), "query no injection surface");
let threw = false;
try {
  buildMosqueQuery({ latitude: 91, longitude: 0, radiusMeters: 3000, timeoutSeconds: 20 });
} catch {
  threw = true;
}
check(threw, "query rejects bad coords");
threw = false;
try {
  buildMosqueQuery({ latitude: 0, longitude: 0, radiusMeters: 99999, timeoutSeconds: 20 });
} catch {
  threw = true;
}
check(threw, "query rejects unbounded radius");

async function live(): Promise<void> {
  // --- Real Overpass probe (§55): small radius, known location ---
  clearNearbyCache();
  try {
    const res = await searchNearbyMosques({ latitude: -6.1754, longitude: 106.8272, radiusMeters: 1000, maxResults: 50 });
    check(res.places.length > 0, `live probe places (${res.places.length})`);
    check(
      res.places.every((p) => p.source === "osm" && p.latitude !== undefined && p.name.trim() !== ""),
      "live probe mapper succeeds"
    );
    const again = await searchNearbyMosques({ latitude: -6.1754, longitude: 106.8272, radiusMeters: 1000, maxResults: 50 });
    check(again.cached === true, "live probe cache reuse");
  } catch (e) {
    console.log(`NOT VERIFIED — Overpass unavailable (${(e as Error).message})`);
  }

  // --- Stage 3C additions (§21): categories, queries, mapping, cache ---
  check(isMuslimPlaceCategory("mosques") && isMuslimPlaceCategory("halal-food"), "category valid");
  check(!isMuslimPlaceCategory("mcdonalds") && !isMuslimPlaceCategory(null), "category invalid rejected");
  check(
    PLACE_CATEGORY_IDS.length === 3 &&
      PLACE_CATEGORY_IDS.every((id) => PLACE_CATEGORIES[id].id === id) &&
      PLACE_CATEGORY_IDS.every((id) => PLACE_CATEGORIES[id].label.trim() !== ""),
    "category config consistency"
  );
  check(resolvePlaceCategory("all") === "mosques", "all resolves to mosques");
  check(resolvePlaceCategory("halal-food") === "halal-food", "filter passthrough");

  const inArgs = { latitude: -6.1754, longitude: 106.8272, radiusMeters: 3000, timeoutSeconds: 20 };
  const qCenter = buildPlaceQuery("islamic-centers", inArgs);
  check(
    qCenter.includes('["amenity"="community_centre"]["religion"="muslim"]') &&
      qCenter.includes('["office"="religion"]["religion"="muslim"]'),
    "islamic-center query conservative tags"
  );
  const qHalal = buildPlaceQuery("halal-food", inArgs);
  check(
    qHalal.includes('["amenity"="restaurant"]["diet:halal"="yes"]') &&
      qHalal.includes('["amenity"="cafe"]["diet:halal"="yes"]') &&
      qHalal.includes('["amenity"="fast_food"]["diet:halal"="yes"]'),
    "halal query structured tags"
  );
  check(!qHalal.toLowerCase().includes("name~"), "halal query has no name matching");
  let threwCat = false;
  try {
    buildPlaceQuery("sushi" as "mosques", inArgs);
  } catch {
    threwCat = true;
  }
  check(threwCat, "query rejects invalid category");

  const centerMapped = mapOverpassElementToPlace({
    element: { type: "node", id: 11, lat: -6.17, lon: 106.83, tags: { name: "Islamic Center X" } },
    userLatitude: -6.17,
    userLongitude: 106.83,
    category: "islamic-center",
  });
  check(centerMapped?.category === "islamic-center", "mapper islamic-center");
  const halalMapped = mapOverpassElementToPlace({
    element: {
      type: "node",
      id: 12,
      lat: -6.17,
      lon: 106.83,
      tags: { name: "Warung Barokah", amenity: "restaurant", "diet:halal": "yes" },
    },
    userLatitude: -6.17,
    userLongitude: 106.83,
    category: "halal-food",
  });
  check(halalMapped?.category === "halal-food", "mapper halal-food");
  check(
    halalMapped?.sourceTags?.["diet:halal"] === "yes" && hasHalalTag(halalMapped?.sourceTags),
    "halal source tags retained"
  );
  check(!hasHalalTag(undefined) && !hasHalalTag({ amenity: "restaurant" }), "halal tag absent → false");
  check(
    hasHalalTag({ "diet:halal": "yes" }) && !hasHalalTag({ "diet:halal": "no" }),
    "halal tag strict yes"
  );

  // Cache isolation by category (live, small radius).
  try {
    clearNearbyCache();
    await searchNearbyMosques({ latitude: -6.1754, longitude: 106.8272, radiusMeters: 1000, category: "mosques" });
    const halalFirst = await searchNearbyPlaces({
      latitude: -6.1754,
      longitude: 106.8272,
      radiusMeters: 1000,
      category: "halal-food",
    });
    check(halalFirst.cached === false, "different category does not reuse result");
    const halalAgain = await searchNearbyPlaces({
      latitude: -6.1754,
      longitude: 106.8272,
      radiusMeters: 1000,
      category: "halal-food",
    });
    check(halalAgain.cached === true, "same category reuses cache");
  } catch (e) {
    console.log(`NOT VERIFIED — category cache probe (${(e as Error).message})`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void live();
