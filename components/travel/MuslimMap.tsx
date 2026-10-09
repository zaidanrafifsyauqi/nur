"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker as MLMarker } from "maplibre-gl";
import type { Root } from "react-dom/client";
import { Landmark, LayoutGrid, LocateFixed, MoonStar, Search, UtensilsCrossed } from "lucide-react";
import { LocationGate } from "@/components/location/LocationGate";
import { PlaceCard } from "@/components/travel/PlaceCard";
import { Card } from "@/components/ui/controls";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { abortNearbySearch, searchNearbyViaProxy } from "@/lib/services/travel";
import { OVERPASS_CONFIG } from "@/lib/services/travel/overpassConfig";
import { haversineMeters } from "@/lib/services/travel/distance";
import { MAP_CONFIG } from "@/lib/services/travel/mapConfig";
import {
  PLACE_CATEGORIES,
  PLACE_CATEGORY_IDS,
  resolvePlaceCategory,
  type PlaceFilterId,
} from "@/lib/services/travel/placeCategories";
import { cn } from "@/lib/utils";
import type { Place } from "@/lib/types";

type MapStatus = "loading" | "ready" | "error";
type SearchStatus = "idle" | "loading" | "error";

const ATTRIBUTION_HTML =
  '© <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a>' +
  ' © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

const FILTER_META: Record<PlaceFilterId, { label: string; Icon: typeof LayoutGrid }> = {
  all: { label: "All", Icon: LayoutGrid },
  mosques: { label: "Mosques", Icon: MoonStar },
  "islamic-centers": { label: "Islamic Centers", Icon: Landmark },
  "halal-food": { label: "Halal Food", Icon: UtensilsCrossed },
};

const FILTER_ORDER: PlaceFilterId[] = ["all", ...PLACE_CATEGORY_IDS];

/** Small marker glyph per place category (rendered into marker DOM roots). */
function MarkerGlyph({ category }: { category: Place["category"] }) {
  const Icon =
    category === "halal-food"
      ? UtensilsCrossed
      : category === "islamic-center"
        ? Landmark
        : MoonStar;
  return <Icon className="h-4 w-4" aria-hidden />;
}

const MARKER_BASE_CLASSES =
  "flex items-center justify-center rounded-full shadow-md transition-transform";
const MARKER_SELECTED_CLASSES = "h-12 w-12 bg-nur-gold text-nur-ink scale-110";
const MARKER_DEFAULT_CLASSES = "h-10 w-10 bg-nur-deep text-white hover:scale-105";

function markerClasses(selected: boolean): string {
  return `${MARKER_BASE_CLASSES} ${selected ? MARKER_SELECTED_CLASSES : MARKER_DEFAULT_CLASSES}`;
}

/**
 * Stage 3C — interactive Muslim map (client boundary).
 *
 * 3B foundation preserved: MapLibre + OpenFreeMap, single-flight Overpass
 * transport, cache, abort, retry, no auto-query on pan. 3C adds the
 * category dimension (mosques / Islamic centers / halal food) with
 * category-aware cache keys, queries, markers, and copy.
 */
export function MuslimMap() {
  const { geo, requestLocation } = useGeolocation(true);
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [mapKey, setMapKey] = useState(0);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState<{ status: SearchStatus }>({ status: "idle" });
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [filter, setFilter] = useState<PlaceFilterId>("all");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef(new Map<string, MLMarker>());
  const markerRootsRef = useRef(new Map<string, Root>());
  const userMarkerRef = useRef<MLMarker | null>(null);
  const flyingRef = useRef(false);
  const searchedKeyRef = useRef<string | null>(null);
  const searchCenterRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const cardRefs = useRef(new Map<string, HTMLLIElement | null>());
  const requestIdRef = useRef(0);
  const selectedIdRef = useRef<string | null>(null);

  const activeCategory = resolvePlaceCategory(filter);
  const copy = PLACE_CATEGORIES[activeCategory];
  const copyNoun = copy.label.toLowerCase();

  /**
   * Tears down all place markers. MapLibre markers can be removed
   * synchronously, but React roots MUST NOT be unmounted synchronously
   * during render/commit (React 19 race warning) — snapshot + defer past
   * the current task instead.
   */
  const teardownMarkers = useCallback(() => {
    for (const m of markersRef.current.values()) m.remove();
    markersRef.current.clear();
    const roots = [...markerRootsRef.current.values()];
    markerRootsRef.current.clear();
    if (roots.length > 0) {
      queueMicrotask(() => {
        for (const root of roots) {
          try {
            root.unmount();
          } catch {
            // Already unmounted — teardown is idempotent by design.
          }
        }
      });
    }
  }, []);

  // --- Map lifecycle (dynamic import: never touches window during SSR) ---
  useEffect(() => {
    let cancelled = false;
    let map: MLMap | null = null;
    void (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      maplibre.setWorkerUrl(MAP_CONFIG.workerUrl);
      const created = new maplibre.Map({
        container: containerRef.current,
        style: MAP_CONFIG.styleUrl,
        center: [MAP_CONFIG.defaultCenter.longitude, MAP_CONFIG.defaultCenter.latitude],
        zoom: MAP_CONFIG.defaultZoom,
        attributionControl: false,
      });
      map = created;
      created.addControl(
        new maplibre.AttributionControl({ compact: true, customAttribution: ATTRIBUTION_HTML }),
        "bottom-right"
      );
      created.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      created.on("load", () => {
        if (!cancelled) setMapStatus("ready");
      });
      created.on("error", () => {
        if (!cancelled) setMapStatus("error");
      });
      created.on("moveend", () => {
        if (flyingRef.current) {
          flyingRef.current = false;
          return;
        }
        const c = created.getCenter();
        const anchor = searchCenterRef.current;
        if (!anchor) {
          setShowSearchArea(true);
          return;
        }
        const moved = haversineMeters(anchor.latitude, anchor.longitude, c.lat, c.lng);
        setShowSearchArea(moved > OVERPASS_CONFIG.radiusMeters * 0.4);
      });
      mapRef.current = created;
    })();
    return () => {
      cancelled = true;
      abortNearbySearch();
      teardownMarkers();
      userMarkerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [mapKey, teardownMarkers]);

  // --- Explicit search (single entry point; service single-flights) ---
  const runSearch = useCallback(
    async (latitude: number, longitude: number, forFilter: PlaceFilterId) => {
      const id = ++requestIdRef.current;
      const cat = resolvePlaceCategory(forFilter);
      const labels = PLACE_CATEGORIES[cat];
      setSearch({ status: "loading" });
      setShowSearchArea(false);
      try {
        const res = await searchNearbyViaProxy({ latitude, longitude, category: cat });
        if (requestIdRef.current !== id) return; // superseded
        setPlaces(res.places);
        searchCenterRef.current = res.searchCenter;
        setSelectedId((prev) => (res.places.some((p) => p.id === prev) ? prev : null));
        setSearch({ status: "idle" });
        setStatusMsg(
          res.places.length === 0
            ? labels.emptyTitle
            : `Found ${res.places.length} nearby ${labels.label.toLowerCase()}.`
        );
      } catch (error) {
        if (requestIdRef.current !== id) return;
        if (error instanceof Error && /abort/i.test(error.message)) return;
        setSearch({ status: "error" });
        setStatusMsg(labels.errorMessage);
      }
    },
    []
  );

  // --- Location granted → center + user marker + initial discovery ---
  const coordsKey = geo.coords ? `${geo.coords.lat.toFixed(4)},${geo.coords.lng.toFixed(4)}` : null;
  const searchKey = coordsKey ? `${coordsKey}|${filter}` : null;
  useEffect(() => {
    if (!geo.coords || mapStatus !== "ready" || !searchKey) return;
    if (searchedKeyRef.current === searchKey) return;
    const [coordsPart] = searchKey.split("|");
    const relocate = searchedKeyRef.current?.split("|")[0] !== coordsPart;
    searchedKeyRef.current = searchKey;
    const map = mapRef.current;
    const { lat, lng } = geo.coords;
    const activeFilter = filter;
    void (async () => {
      const maplibre = await import("maplibre-gl");
      if (!mapRef.current) return;
      if (relocate || !userMarkerRef.current) {
        userMarkerRef.current?.remove();
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", "Your location");
        el.className =
          "flex h-11 w-11 items-center justify-center rounded-full bg-nur-deep text-white shadow-lg ring-4 ring-nur-deep/20";
        const dot = document.createElement("span");
        dot.className = "h-3 w-3 rounded-full bg-white";
        dot.setAttribute("aria-hidden", "true");
        el.appendChild(dot);
        el.addEventListener("click", () => {
          map?.flyTo({ center: [lng, lat], zoom: MAP_CONFIG.focusedZoom });
        });
        const marker = new maplibre.Marker({ element: el }).setLngLat([lng, lat]);
        marker.addTo(mapRef.current);
        userMarkerRef.current = marker;
        flyingRef.current = true;
        map?.flyTo({ center: [lng, lat], zoom: MAP_CONFIG.focusedZoom });
      }
      void runSearch(lat, lng, activeFilter);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, mapStatus]);

  // --- Markers synced from places (no re-fetch, ever) ---
  const selectPlace = useCallback((id: string) => {
    setSelectedId(id);
    const map = mapRef.current;
    const marker = markersRef.current.get(id);
    if (map && marker) {
      flyingRef.current = true;
      map.panTo(marker.getLngLat());
    }
    const card = cardRefs.current.get(id);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current) return;
    let cancelled = false;
    teardownMarkers();
    void (async () => {
      const [{ default: ReactDOMClient }, maplibre] = await Promise.all([
        import("react-dom/client"),
        import("maplibre-gl"),
      ]);
      if (cancelled) return;
      const map = mapRef.current;
      if (!map) return;
      for (const place of places) {
        if (cancelled) return;
        if (place.latitude === undefined || place.longitude === undefined) continue;
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", `Show ${place.name} on map`);
        el.className = markerClasses(place.id === selectedIdRef.current);
        const host = document.createElement("span");
        host.className = "flex items-center justify-center";
        host.setAttribute("aria-hidden", "true");
        el.appendChild(host);
        const root = ReactDOMClient.createRoot(host);
        root.render(<MarkerGlyph category={place.category} />);
        markerRootsRef.current.set(place.id, root);
        el.addEventListener("click", () => selectPlace(place.id));
        const marker = new maplibre.Marker({ element: el }).setLngLat([
          place.longitude,
          place.latitude,
        ]);
        marker.addTo(map);
        markersRef.current.set(place.id, marker);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [places, mapStatus, selectPlace, teardownMarkers]);

  // Selection restyles existing marker elements directly — no rebuild,
  // no React root churn on the hot tap path.
  useEffect(() => {
    selectedIdRef.current = selectedId;
    for (const [id, marker] of markersRef.current) {
      marker.getElement().className = markerClasses(id === selectedId);
    }
  }, [selectedId]);

  const searchThisArea = useCallback(() => {
    const c = mapRef.current?.getCenter();
    if (!c) return;
    void runSearch(c.lat, c.lng, filter);
  }, [runSearch, filter]);

  const retrySearch = useCallback(() => {
    const c = mapRef.current?.getCenter();
    if (c) void runSearch(c.lat, c.lng, filter);
    else if (geo.coords) void runSearch(geo.coords.lat, geo.coords.lng, filter);
  }, [runSearch, filter, geo.coords]);

  const useMyLocation = useCallback(() => {
    if (geo.coords && mapRef.current) {
      flyingRef.current = true;
      mapRef.current.flyTo({
        center: [geo.coords.lng, geo.coords.lat],
        zoom: MAP_CONFIG.focusedZoom,
      });
    }
    requestLocation();
  }, [geo.coords, requestLocation]);

  const locationBlocked =
    geo.status === "denied" || geo.status === "unavailable" || geo.status === "error";

  return (
    <div className="flex flex-col gap-4">
      {/* Category filter — horizontal scroll on mobile, no overflow */}
      <div
        className="no-scrollbar -mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label="Place category"
      >
        {FILTER_ORDER.map((f) => {
          const meta = FILTER_META[f];
          const Icon = meta.Icon;
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium",
                active
                  ? "border-nur-deep bg-nur-deep text-white dark:border-nur-gold dark:bg-nur-gold dark:text-nur-ink"
                  : "border-[var(--nur-border)] bg-[var(--nur-surface)]"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Place list */}
        <section aria-label={`Nearby ${copyNoun}`} className="order-2 lg:order-1">
          {geo.status !== "granted" && (
            <div className="mb-3">
              <LocationGate
                geo={geo}
                onRetry={requestLocation}
                onUseSample={() => {}}
                sampleLabel=""
                hideSample
              />
            </div>
          )}
          {locationBlocked && (
            <Card className="mb-3 text-sm">
              <p className="font-semibold">Location access is unavailable.</p>
              <p className="mt-1 text-[var(--nur-text-secondary)]">
                Move the map manually to explore nearby {copyNoun}.
              </p>
            </Card>
          )}
          <p aria-live="polite" role="status" className="sr-only">
            {statusMsg}
          </p>
          {search.status === "loading" && places.length === 0 ? (
            <LoadingState label={copy.searchingLabel} />
          ) : search.status === "error" && places.length === 0 ? (
            <Card className="flex flex-col items-start gap-2">
              <p role="alert" className="text-sm font-semibold">
                {copy.errorMessage}
              </p>
              <button
                type="button"
                onClick={retrySearch}
                className="inline-flex min-h-[44px] items-center rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
              >
                Try again
              </button>
            </Card>
          ) : places.length === 0 ? (
            <EmptyState
              title={copy.emptyTitle}
              description="Pan the map, then use Search this area. Results only cover the searched radius."
              action={
                <button
                  type="button"
                  onClick={searchThisArea}
                  className="mt-2 inline-flex min-h-[44px] items-center rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
                >
                  Search this area
                </button>
              }
            />
          ) : (
            <>
              <p className="mb-2 text-sm font-semibold">
                {places.length} nearby {copyNoun}
                {search.status === "loading" ? " · updating…" : ""}
              </p>
              <ul className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pb-1 pr-0.5 lg:max-h-[560px]">
                {places.map((p) => (
                  <PlaceCard
                    key={p.id}
                    place={p}
                    selected={p.id === selectedId}
                    onSelect={() => selectPlace(p.id)}
                    cardRef={(el) => {
                      if (el) cardRefs.current.set(p.id, el);
                      else cardRefs.current.delete(p.id);
                    }}
                  />
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Map */}
        <section aria-label="Muslim map" className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--nur-border)]">
            <div
              ref={containerRef}
              role="application"
              aria-label={`Interactive map of nearby ${copyNoun}`}
              className="h-[52vh] min-h-[320px] w-full lg:h-[calc(100vh-14rem)] lg:min-h-[480px]"
            />
            {mapStatus === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--nur-surface-2)]">
                <p className="text-sm text-[var(--nur-text-secondary)]">Loading map…</p>
              </div>
            )}
            {mapStatus === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--nur-surface-2)] p-6 text-center">
                <p role="alert" className="text-sm font-semibold">
                  Map couldn&apos;t be loaded.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMapStatus("loading");
                    setMapKey((k) => k + 1);
                  }}
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
                >
                  Try again
                </button>
              </div>
            )}
            {mapStatus === "ready" && (
              <div className="absolute inset-x-0 top-3 flex flex-wrap justify-center gap-2 px-3">
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--nur-border)] bg-[var(--nur-surface)]/95 px-4 text-sm font-medium shadow backdrop-blur"
                >
                  <LocateFixed className="h-4 w-4" aria-hidden />
                  Use my location
                </button>
                {showSearchArea && (
                  <button
                    type="button"
                    onClick={searchThisArea}
                    aria-label={copy.searchAreaLabel}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-nur-deep px-4 text-sm font-semibold text-white shadow dark:bg-nur-gold dark:text-nur-ink"
                  >
                    <Search className="h-4 w-4" aria-hidden />
                    Search this area
                  </button>
                )}
              </div>
            )}
            {search.status === "loading" && mapStatus === "ready" && (
              <p
                role="status"
                className="absolute inset-x-0 bottom-8 mx-auto w-fit rounded-full bg-nur-ink/80 px-4 py-2 text-xs font-medium text-white"
              >
                {copy.searchingLabel}
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--nur-text-secondary)]">
            Map © OpenFreeMap · © OpenStreetMap contributors. Places from OpenStreetMap via
            Overpass — community data, coverage varies.
          </p>
        </section>
      </div>
    </div>
  );
}
