/**
 * Stage 2B — next-prayer resolution (pure, unit-testable).
 *
 * Rules:
 * - Uses absolute timestamps, never array position alone.
 * - If every prayer today has passed, next = tomorrow's Fajr.
 * - Also returns the previous prayer so callers can render a live
 *   progress fraction (elapsed prev → next).
 */
import type { TimedPrayer } from "./mapper";
import { toPrayerCard } from "./mapper";
import type { NextPrayerInfo, Prayer } from "@/lib/types";

export interface PrayerState {
  /** Today's prayers annotated for display. */
  prayers: Prayer[];
  /** Previous prayer (start of the progress window). */
  prev: TimedPrayer;
  /** Next upcoming prayer (or tomorrow's Fajr). */
  next: TimedPrayer;
  /** True when next belongs to tomorrow. */
  nextIsTomorrow: boolean;
  /** 0..1 progress from prev → next. */
  progress: number;
  nextInfo: NextPrayerInfo;
}

export function computePrayerState(
  today: TimedPrayer[],
  tomorrow: TimedPrayer[],
  now: Date
): PrayerState {
  const nowMs = now.getTime();
  const upcomingToday = today.filter((p) => p.date.getTime() > nowMs);

  let prev: TimedPrayer;
  let next: TimedPrayer;
  let nextIsTomorrow = false;

  if (upcomingToday.length > 0) {
    next = upcomingToday[0];
    const idx = today.indexOf(next);
    // Before Fajr (idx 0) the anchor is today's Isha — shifted back a day
    // in the progress math below to approximate yesterday's Isha.
    prev = idx > 0 ? today[idx - 1] : today[today.length - 1];
  } else {
    const fajr = tomorrow[0];
    if (!fajr) throw new Error("Tomorrow's prayers are required.");
    next = fajr;
    nextIsTomorrow = true;
    prev = today[today.length - 1];
  }

  // Anchor the progress window: when the anchor lies in the future
  // (overnight before Fajr, anchored on today's Isha), shift it back one
  // day — clock times repeat daily, so this approximates yesterday's prayer.
  let anchorMs = prev.date.getTime();
  if (anchorMs > nowMs) anchorMs -= 24 * 3600 * 1000;
  const span = next.date.getTime() - anchorMs;
  const safeSpan = span > 0 ? span : 24 * 3600 * 1000;
  const progress = Math.min(1, Math.max(0, (nowMs - anchorMs) / safeSpan));

  const prayers: Prayer[] = today.map((p) => {
    const passed = p.date.getTime() <= nowMs;
    const isNext = !nextIsTomorrow && p.name === next.name;
    return toPrayerCard(p, passed, isNext);
  });

  const hh = String(next.date.getHours()).padStart(2, "0");
  const mm = String(next.date.getMinutes()).padStart(2, "0");
  const nextInfo: NextPrayerInfo = {
    name: next.name,
    time: `${hh}:${mm}`,
    displayTime: next.displayTime,
    countdownPlaceholder: "",
    progress,
    targetISO: next.date.toISOString(),
  };

  return { prayers, prev, next, nextIsTomorrow, progress, nextInfo };
}
