"use client";

/**
 * Stage 2B — reusable browser geolocation hook (Client Component only).
 *
 * Single position request (no watch). Coordinates are returned to the
 * caller for the prayer-time request only — never stored, never logged.
 */
import { useCallback, useEffect, useState } from "react";
import type { PrayerCoords } from "@/lib/services/prayer/api";

export type GeoStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "error";

/**
 * Stage 3A — coordinates now carry GPS accuracy (metres, null when the
 * browser omits it). Structural superset of PrayerCoords, so Stage 2B
 * call sites keep compiling unchanged.
 */
export interface GeoCoords extends PrayerCoords {
  accuracy: number | null;
}

export interface GeoState {
  status: GeoStatus;
  coords: GeoCoords | null;
  /** User-facing (non-technical) message for denied/error states. */
  message: string | null;
}

const IDLE: GeoState = { status: "idle", coords: null, message: null };
const REQUESTING: GeoState = { status: "requesting", coords: null, message: null };

function supported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

function toGeoState(error: GeolocationPositionError): GeoState {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        status: "denied",
        coords: null,
        message: "Location access is required to calculate accurate prayer times.",
      };
    case error.POSITION_UNAVAILABLE:
      return {
        status: "unavailable",
        coords: null,
        message: "Your location couldn't be determined on this device.",
      };
    case error.TIMEOUT:
      return {
        status: "error",
        coords: null,
        message: "The location request timed out. Please try again.",
      };
    default:
      return {
        status: "error",
        coords: null,
        message: "Something went wrong while getting your location.",
      };
  }
}

/** Module-level subscription helper — calls no setState itself. */
function queryPosition(
  onOk: (coords: GeoCoords) => void,
  onErr: (error: GeolocationPositionError) => void
): void {
  navigator.geolocation.getCurrentPosition(
    (pos) =>
      onOk({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy:
          typeof pos.coords.accuracy === "number" && Number.isFinite(pos.coords.accuracy)
            ? pos.coords.accuracy
            : null,
      }),
    onErr,
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

export function useGeolocation(autoRequest = true) {
  // Idle and requesting render the same loading UI, so seeding
  // "requesting" keeps server/client output identical (no hydration flip).
  const [state, setState] = useState<GeoState>(() =>
    autoRequest && supported() ? REQUESTING : IDLE
  );

  // Auto-request: subscribes only; results settle asynchronously.
  useEffect(() => {
    if (!autoRequest) return;
    let cancelled = false;
    if (!supported()) {
      const id = setTimeout(() => {
        if (!cancelled) {
          setState({
            status: "unavailable",
            coords: null,
            message: "Geolocation isn't supported by this browser.",
          });
        }
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(id);
      };
    }
    queryPosition(
      (coords) => {
        if (!cancelled) setState({ status: "granted", coords, message: null });
      },
      (err) => {
        if (!cancelled) setState(toGeoState(err));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [autoRequest]);

  const requestLocation = useCallback(() => {
    if (!supported()) {
      setState({
        status: "unavailable",
        coords: null,
        message: "Geolocation isn't supported by this browser.",
      });
      return;
    }
    setState(REQUESTING);
    queryPosition(
      (coords) => setState({ status: "granted", coords, message: null }),
      (err) => setState(toGeoState(err))
    );
  }, []);

  return { geo: state, requestLocation };
}
