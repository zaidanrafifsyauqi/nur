/**
 * Stage NUR AI — Qibla tool. Reuse existing Kaaba+bearing calculation
 * description; never recalculate with raw coords unless absolutely needed.
 */

import { KAABA_COORDINATES } from "@/lib/services/qibla/config";

export function getQiblaContext(query: string): string | null {
  if (!/qibla|kiblat|kaaba|ka'bah|arah.*sholat/i.test(query.toLowerCase())) return null;

  return `[Qibla Context — NUR local calculation]
Kaaba coordinates: ${KAABA_COORDINATES.latitude}, ${KAABA_COORDINATES.longitude}
Bearing is calculated locally on device via great-circle initial bearing (true north, no magnetic correction).
Qibla page is at /travel/qibla; it uses browser GPS + device orientation compass.
If the user asks "what is my Qibla direction" without location context, explain that it needs location access and point to /travel/qibla.
Prefer "Qibla bearing is approximately X° from true north" over raw coordinates when a bearing is known.
Do NOT invent coordinates or bearings.]`;
}
