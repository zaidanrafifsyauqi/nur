"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/services/prayer/time";

/**
 * Stage 2B — live countdown. Ticks every second WITHOUT refetching:
 * it only diffs `Date.now()` against the fixed target timestamp.
 * Interval is cleaned up on unmount / target change. When the target
 * passes, `onElapsed` fires once so the parent can transition.
 *
 * Screen-reader note: the ticking digits are `aria-hidden`; assistive
 * tech gets a static summary instead (no per-second announcements).
 */
export function CountdownTimer({
  targetISO,
  prayerName,
  displayTime,
  onElapsed,
  className,
}: {
  targetISO: string;
  prayerName: string;
  displayTime: string;
  onElapsed?: () => void;
  className?: string;
}) {
  const targetMs = new Date(targetISO).getTime();
  // Initialized once per mount; parents pass key={targetISO} so a new
  // target remounts instead of needing a synchronous effect reset.
  const [remaining, setRemaining] = useState(() => Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const left = targetMs - Date.now();
      if (left <= 0) {
        setRemaining(0);
        clearInterval(id);
        onElapsed?.();
      } else {
        setRemaining(left);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [targetMs, onElapsed]);

  return (
    <span className={className}>
      <span aria-hidden="true" className="font-mono font-semibold tabular-nums">
        {formatCountdown(remaining)}
      </span>
      <span className="sr-only">
        Next prayer {prayerName} at {displayTime}
      </span>
    </span>
  );
}
