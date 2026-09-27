"use client";

/**
 * Stage 2B — data hook: coordinates → live prayer bundles (today+tomorrow).
 * Session-cached in the service layer; no refetch on remount/navigation.
 * Reducer-based so async fetch lifecycle stays lint-clean.
 */
import { useCallback, useEffect, useReducer } from "react";
import {
  getTwoDayPrayer,
  type PrayerCalcInput,
  type PrayerCoords,
  type TwoDayPrayer,
} from "@/lib/services/prayer";

export type PrayerFetchStatus = "idle" | "loading" | "ready" | "error";

export interface PrayerFetchState {
  status: PrayerFetchStatus;
  data: TwoDayPrayer | null;
  isSampleLocation: boolean;
}

type Action =
  | { type: "start" }
  | { type: "ok"; data: TwoDayPrayer; sample: boolean }
  | { type: "fail"; sample: boolean }
  | { type: "reset" };

function reducer(state: PrayerFetchState, action: Action): PrayerFetchState {
  switch (action.type) {
    case "start":
      return { ...state, status: "loading" };
    case "ok":
      return { status: "ready", data: action.data, isSampleLocation: action.sample };
    case "fail":
      return { status: "error", data: null, isSampleLocation: action.sample };
    case "reset":
      return { status: "idle", data: null, isSampleLocation: false };
  }
}

export function usePrayerTimes(
  coords: PrayerCoords | null,
  opts?: { sampleLabel?: string | null; calc?: PrayerCalcInput }
) {
  // Primitive snapshots keep the effect honest without refs.
  const lat = coords?.lat ?? null;
  const lng = coords?.lng ?? null;
  const sampleLabel = opts?.sampleLabel ?? null;
  const methodId = opts?.calc?.methodId ?? null;
  const school = opts?.calc?.school ?? null;

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    status: lat != null ? ("loading" as const) : ("idle" as const),
    data: null,
    isSampleLocation: false,
  }));

  useEffect(() => {
    if (lat == null || lng == null) {
      dispatch({ type: "reset" });
      return;
    }
    let cancelled = false;
    dispatch({ type: "start" });
    // Method/school changes flow through here → existing loading state,
    // shared cache key, single-flight. Time format never reaches this layer.
    getTwoDayPrayer({ lat, lng }, new Date(), { methodId: methodId ?? undefined, school: school ?? undefined })
      .then((data) => {
        if (!cancelled) dispatch({ type: "ok", data, sample: sampleLabel != null });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "fail", sample: sampleLabel != null });
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, sampleLabel, methodId, school]);

  const reloadPrayer = useCallback(() => {
    // Remount-free refetch: bump through start → fetch via key change.
    // Implemented as reset+start so a stale error view clears instantly.
    dispatch({ type: "start" });
    if (lat == null || lng == null) {
      dispatch({ type: "reset" });
      return;
    }
    getTwoDayPrayer({ lat, lng }, new Date(), { methodId: methodId ?? undefined, school: school ?? undefined })
      .then((data) => dispatch({ type: "ok", data, sample: sampleLabel != null }))
      .catch(() => dispatch({ type: "fail", sample: sampleLabel != null }));
  }, [lat, lng, sampleLabel, methodId, school]);

  return { prayer: state, reloadPrayer };
}
