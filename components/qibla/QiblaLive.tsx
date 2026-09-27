"use client";

import { useMemo, useState } from "react";
import { Compass, LocateFixed, RotateCcw } from "lucide-react";
import { LocationGate } from "@/components/location/LocationGate";
import { QiblaCompass } from "@/components/qibla/QiblaCompass";
import { Badge, Card } from "@/components/ui/controls";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useDeviceOrientation } from "@/lib/qibla/useDeviceOrientation";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { isAligned, shortestAngularDifference } from "@/lib/services/qibla/angles";
import { calculateQiblaBearing, QiblaBearingError } from "@/lib/services/qibla/bearing";
import { QIBLA_ALIGNMENT_TOLERANCE } from "@/lib/services/qibla/config";

/**
 * Stage 3A — live Qibla experience (client boundary; server shell stays static).
 *
 * Browser GPS → local bearing math → optional device-orientation compass.
 * Coordinates never leave the device (no API, no storage, no logging).
 */
export function QiblaLive() {
  const { geo, requestLocation } = useGeolocation(true);
  const { orientation, enableCompass, retryCompass } = useDeviceOrientation();
  const [compassAsked, setCompassAsked] = useState(false);

  const bearing = useMemo(() => {
    if (!geo.coords) return null;
    try {
      return calculateQiblaBearing({ latitude: geo.coords.lat, longitude: geo.coords.lng });
    } catch (e) {
      return { error: e instanceof QiblaBearingError ? e.message : "Invalid coordinates." } as const;
    }
  }, [geo.coords]);

  const bearingError = bearing != null && "error" in bearing ? bearing.error : null;
  const qibla = bearing != null && !("error" in bearing) ? bearing : null;

  const liveHeading =
    orientation.status === "granted" && orientation.heading != null
      ? orientation.heading
      : null;

  const delta = useMemo(
    () => (liveHeading != null && qibla ? shortestAngularDifference(liveHeading, qibla.bearing) : null),
    [liveHeading, qibla]
  );
  const aligned = delta != null && isAligned(delta, QIBLA_ALIGNMENT_TOLERANCE);

  const instruction = useMemo(() => {
    if (!qibla) return null;
    if (qibla.atKaaba) return "You are at the Kaaba. Face any direction in prayer.";
    if (delta == null) return `Qibla is ${Math.round(qibla.bearing)}° from true north.`;
    if (aligned) return "You are facing the Qibla.";
    const mag = Math.round(Math.abs(delta));
    return delta > 0 ? `Turn right ${mag}°.` : `Turn left ${mag}°.`;
  }, [qibla, delta, aligned]);

  // Deliberate announcements: bucket changes only (aligned / side / 5° steps).
  const announceBucket =
    delta == null ? "manual" : aligned ? "aligned" : `${delta > 0 ? "r" : "l"}-${Math.round(Math.abs(delta) / 5) * 5}`;

  if (geo.status !== "granted" || !geo.coords) {
    return (
      <LocationGate
        geo={
          geo.status === "denied"
            ? {
                ...geo,
                message: "Location access is required to calculate your Qibla direction.",
              }
            : geo
        }
        onRetry={requestLocation}
        onUseSample={() => {}}
        sampleLabel=""
        hideSample
      />
    );
  }

  if (bearingError) {
    return <ErrorState title="Qibla couldn't be calculated" message={bearingError} />;
  }

  if (!qibla) {
    return <LoadingState label="Calculating Qibla bearing…" />;
  }

  if (qibla.atKaaba) {
    return (
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <span aria-hidden className="text-4xl text-nur-gold">
          ◆
        </span>
        <h2 className="text-lg font-bold">You are at the Kaaba</h2>
        <p className="max-w-sm text-sm text-[var(--nur-text-secondary)]">
          No direction is needed — face any direction in prayer.
        </p>
      </Card>
    );
  }

  const manual = liveHeading == null;

  return (
    <div className="flex flex-col gap-4">
      {/* Bearing */}
      <Card className="nur-card-glow border-0 bg-nur-deep text-white dark:bg-[var(--nur-surface)] dark:text-[var(--nur-text)]">
        <p className="text-xs font-medium uppercase tracking-widest opacity-70">
          Using your current location
        </p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums sm:text-5xl">
          {Math.round(qibla.bearing)}°
        </p>
        <p className="mt-1 text-sm opacity-80">from true north</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge className="border-white/20 bg-white/10 text-white dark:border-[var(--nur-border)] dark:bg-[var(--nur-surface-2)] dark:text-[var(--nur-text)]">
            <LocateFixed className="mr-1 h-3.5 w-3.5" aria-hidden />
            {Math.round(qibla.distanceKm).toLocaleString()} km to Makkah
          </Badge>
          {geo.coords.accuracy != null ? (
            <Badge className="border-white/20 bg-white/10 text-white dark:border-[var(--nur-border)] dark:bg-[var(--nur-surface-2)] dark:text-[var(--nur-text)]">
              GPS ±{Math.round(geo.coords.accuracy)} m
            </Badge>
          ) : null}
        </div>
      </Card>

      {/* Compass */}
      <QiblaCompass
        bearing={qibla.bearing}
        heading={liveHeading}
        aligned={aligned}
        manual={manual}
      />

      {/* Instruction (stable text + deliberate announcements) */}
      <Card aria-label="Qibla guidance">
        <p className="text-center text-lg font-bold">{instruction}</p>
        <p aria-live="polite" key={announceBucket} className="sr-only">
          {instruction}
        </p>
        {orientation.quality === "calibrating" && liveHeading != null ? (
          <p className="mt-2 text-center text-xs text-[var(--nur-text-secondary)]">
            Heading is unstable — move your phone in a small figure-eight to
            calibrate the compass. This helps on most devices but isn&apos;t
            guaranteed everywhere.
          </p>
        ) : null}
        {orientation.message ? (
          <p className="mt-2 text-center text-xs text-[var(--nur-text-secondary)]">
            {orientation.message}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {!compassAsked || orientation.status === "idle" ? (
            <button
              type="button"
              onClick={() => {
                setCompassAsked(true);
                void enableCompass();
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-nur-deep px-5 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
            >
              <Compass className="h-4 w-4" aria-hidden />
              Enable Compass
            </button>
          ) : null}
          {orientation.status === "requesting" ? (
            <LoadingState label="Starting compass…" />
          ) : null}
          {(orientation.status === "denied" ||
            orientation.status === "error" ||
            orientation.status === "unsupported" ||
            (orientation.status === "granted" && liveHeading == null)) &&
          compassAsked ? (
            <button
              type="button"
              onClick={retryCompass}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--nur-border)] px-4 text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Retry compass
            </button>
          ) : null}
        </div>
        {manual && compassAsked ? (
          <p className="mt-3 text-center text-xs text-[var(--nur-text-secondary)]">
            {orientation.status === "granted"
              ? "Compass heading unavailable on this device."
              : "Your device compass isn't available."}{" "}
            You can use this bearing with a physical compass.
          </p>
        ) : null}
      </Card>

      {/* Accuracy */}
      <Card className="flex items-center gap-3 text-sm">
        <span
          aria-hidden
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            !manual && orientation.quality === "good"
              ? "bg-nur-deep dark:bg-nur-gold"
              : manual
                ? "bg-[var(--nur-border)]"
                : "bg-nur-gold"
          }`}
        />
        <div>
          <p className="font-semibold">
            {!manual && orientation.quality === "good"
              ? "Compass: good"
              : !manual
                ? "Compass: calibrating"
                : "Compass: manual mode"}
          </p>
          <p className="text-xs text-[var(--nur-text-secondary)]">
            {!manual
              ? `Heading ${Math.round(liveHeading ?? 0)}° · tolerance ±${QIBLA_ALIGNMENT_TOLERANCE}°`
              : "Bearing only — no sensor heading"}
          </p>
        </div>
      </Card>

      <p className="rounded-xl border border-dashed border-[var(--nur-border)] bg-[var(--nur-surface-2)]/60 px-3 py-2 text-xs leading-relaxed text-[var(--nur-text-secondary)]">
        True-north geographic bearing calculated on your device — no magnetic
        correction applied. Phone sensors vary; verify with a physical compass
        when it matters.
      </p>
    </div>
  );
}
