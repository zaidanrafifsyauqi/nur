/**
 * Stage NUR AI — Travel/Muslim Map context.
 */

export function getTravelContext(query: string): string | null {
  const q = query.toLowerCase();
  if (
    !/travel|trip|mosque|masjid|halal|restaurant|muslim.*map|nearby|near me|japan|preparation|umrah|hajj/i.test(
      q
    )
  ) {
    return null;
  }

  const isNearby =
    /near me|nearby|around me|masjid.*near|mosque.*near|halal.*near/i.test(q);
  if (isNearby) {
    return `[Travel Context — Muslim Map via OSM/Overpass]
Nearby mosques/halal places are discovered via OpenStreetMap tagged data (amenity=place_of_worship religion=muslim; diet:halal=yes) in a 3km radius around the user's GPS location at /travel/map.
Results are OSM-tagged, not certified. Coverage varies by community mapping.
If location is unavailable, explain that "Allow location or pan the map and use Search this area" at /travel/map.
Do NOT invent specific place names, addresses, or ratings.]`;
  }

  return `[Travel Context — NUR Muslim Travel]
NUR helps find mosques, halal food (OSM-tagged), Qibla, and prayer times while traveling.
General preparation advice (what to pack, how to find prayer facilities, halal considerations) can be given generally.
For live nearby places, direct to /travel/map and explain the location flow.
Do NOT claim live inventory without OSM data.]`;
}
