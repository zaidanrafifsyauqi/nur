"use client";

import { Compass, MapPinOff, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/controls";
import { ErrorState, LoadingState } from "@/components/ui/states";
import type { GeoState } from "@/lib/location/useGeolocation";

/**
 * Stage 2B — friendly gate for location states. Granted/idle-with-coords
 * render nothing (caller shows prayer UI); every other state gets an
 * explicit, non-crashing UI with retry + labeled sample fallback.
 */
export function LocationGate({
  geo,
  onRetry,
  onUseSample,
  sampleLabel,
  hideSample = false,
}: {
  geo: GeoState;
  onRetry: () => void;
  onUseSample: () => void;
  sampleLabel: string;
  /** Stage 3A — Qibla must not offer a guessed/sample location. */
  hideSample?: boolean;
}) {
  if (geo.status === "requesting" || geo.status === "idle") {
    return <LoadingState label="Requesting your location…" />;
  }

  if (geo.status === "granted") return null;

  const isDenied = geo.status === "denied";

  return (
    <Card className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nur-surface-2)]">
        {isDenied ? (
          <MapPinOff className="h-6 w-6 text-[var(--nur-text-secondary)]" aria-hidden />
        ) : (
          <Compass className="h-6 w-6 text-[var(--nur-text-secondary)]" aria-hidden />
        )}
      </span>
      <h2 className="text-base font-semibold">
        {isDenied ? "Location access needed" : "Location unavailable"}
      </h2>
      <p className="max-w-sm text-sm text-[var(--nur-text-secondary)]">
        {geo.message ?? "Location access is required to calculate accurate prayer times."}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
        {hideSample ? null : (
          <button
            type="button"
            onClick={onUseSample}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-[var(--nur-border)] px-4 text-sm font-medium"
          >
            Use {sampleLabel}
          </button>
        )}
      </div>
    </Card>
  );
}

export function PrayerApiErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      title="Prayer times couldn't be loaded"
      message="Prayer times couldn't be loaded. Please try again."
      onRetry={onRetry}
    />
  );
}
