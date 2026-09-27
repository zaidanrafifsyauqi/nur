"use client";

/**
 * Stage 2B — turns fetched bundles into a live prayer state.
 * Recomputes flags/progress when the countdown elapses; triggers a
 * refetch when the local date rolls over past the fetched day.
 */
import { useCallback, useMemo, useState } from "react";
import type { TwoDayPrayer } from "@/lib/services/prayer";
import { computePrayerState } from "@/lib/services/prayer/next";
import { toLocalDateKey } from "@/lib/services/prayer/time";

export function usePrayerClock(data: TwoDayPrayer | null, reload: () => void) {
  const [epoch, setEpoch] = useState(0);

  const onElapsed = useCallback(() => {
    if (data && toLocalDateKey(new Date()) !== data.today.dateKey) {
      reload();
    } else {
      setEpoch((e) => e + 1);
    }
  }, [data, reload]);

  const clock = useMemo(() => {
    void epoch; // recompute flags/progress when the countdown transitions
    return data
      ? computePrayerState(data.today.prayers, data.tomorrow.prayers, new Date())
      : null;
  }, [data, epoch]);

  return { clock, onElapsed };
}
