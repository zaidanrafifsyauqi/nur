"use client";

import { LocateFixed, MapPinOff, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/controls";
import { LoadingState } from "@/components/ui/states";
import { useGeolocation } from "@/lib/location/useGeolocation";

/**
 * Stage 3D — compact Travel Hub location status (client island).
 *
 * Reuses the shared geolocation hook (same auto-request behavior as
 * Prayer/Qibla/Map). No city guessing, no reverse geocoding — only a
 * generic presence/absence status. No map, no fetch, no compass here.
 */
export function TravelLocationStatus() {
  const { geo, requestLocation } = useGeolocation(true);

  if (geo.status === "idle" || geo.status === "requesting") {
    return <LoadingState label="Checking your location…" />;
  }

  if (geo.status === "granted") {
    return (
      <Card className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nur-deep/10 text-nur-deep dark:bg-nur-gold/15 dark:text-nur-gold">
          <LocateFixed className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
            Location
          </p>
          <p className="text-[15px] font-semibold">
            Exploring places near your current location
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nur-surface-2)] text-[var(--nur-text-secondary)]">
        <MapPinOff className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
          Location
        </p>
        <p className="text-[15px] font-semibold">Location access is required</p>
        <p className="text-xs text-[var(--nur-text-secondary)]">
          Explore nearby places by moving the map manually.
        </p>
      </div>
      <button
        type="button"
        onClick={requestLocation}
        className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-[var(--nur-border)] px-3.5 text-sm font-medium"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Try again
      </button>
    </Card>
  );
}
