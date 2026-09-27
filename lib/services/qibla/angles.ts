/**
 * Stage 3A — circular angle utilities (pure, unit-tested).
 *
 * All compass math flows through here so the naive-averaging trap
 * (avg(359°, 1°) = 180°) can never happen: interpolation and
 * differences always travel the short way around the circle.
 */

/** Normalize any finite number into [0, 360). */
export function normalize360(degrees: number): number {
  if (!Number.isFinite(degrees)) {
    throw new Error("Cannot normalize a non-finite angle.");
  }
  return ((degrees % 360) + 360) % 360;
}

/**
 * Shortest signed turn from `from` to `to`, in (-180, 180].
 * Positive = clockwise (turn right), negative = turn left.
 */
export function shortestAngularDifference(from: number, to: number): number {
  const diff = normalize360(to) - normalize360(from);
  if (diff > 180) return diff - 360;
  if (diff <= -180) return diff + 360;
  return diff;
}

/** True when |difference| is within tolerance (inclusive). */
export function isAligned(difference: number, tolerance: number): boolean {
  return Math.abs(difference) <= tolerance;
}

/**
 * Circular interpolation: moves `current` toward `target` by fraction `t`
 * along the shortest arc. lerpAngle(359, 1, 0.5) === 0, never 180.
 */
export function lerpAngleCircular(current: number, target: number, t: number): number {
  const diff = shortestAngularDifference(current, target);
  return normalize360(current + diff * t);
}
