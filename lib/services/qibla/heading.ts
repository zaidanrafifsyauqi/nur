/**
 * Stage 3A — device-orientation → compass heading (pure, unit-tested).
 *
 * Model (documented — NOT hardware-verified, see report):
 * - Only ABSOLUTE orientation events are trusted (`absolute === true`),
 *   i.e. referenced to Earth's coordinate frame. Relative-only readings
 *   are reported unreliable; the UI must show manual mode instead.
 * - Portrait-primary heading: `heading = normalize360(360 - alpha)`.
 *   `alpha` is the compass yaw of the device frame; negating converts
 *   the counter-clockwise sensor convention to clockwise-from-north.
 * - Screen compensation: the top edge of the screen is what the user
 *   "faces", so a clockwise screen rotation θ adds θ:
 *   `heading = normalize360(360 - alpha + screenAngle)`, where
 *   screenAngle is `screen.orientation.angle` ∈ {0, 90, 180, 270}.
 * - Raw sensor value and normalized heading stay separate types so a
 *   component can never mistake one for the other.
 */
import { normalize360 } from "./angles";

export interface OrientationReading {
  /** DeviceOrientationEvent.alpha (may be null when sensor absent). */
  alpha: number | null;
  /** True when the event is Earth-referenced (absolute). */
  absolute: boolean;
  /** screen.orientation.angle at event time (0/90/180/270). */
  screenAngle: number;
}

export interface DeviceHeading {
  /** Degrees clockwise from true north, [0, 360). Null when unusable. */
  heading: number | null;
  /** False for null/NaN alpha or non-absolute readings — never guess. */
  reliable: boolean;
}

export function orientationToHeading(reading: OrientationReading): DeviceHeading {
  const { alpha, absolute, screenAngle } = reading;
  if (alpha == null || !Number.isFinite(alpha) || !absolute) {
    return { heading: null, reliable: false };
  }
  const screen = Number.isFinite(screenAngle) ? screenAngle : 0;
  return { heading: normalize360(360 - alpha + screen), reliable: true };
}
