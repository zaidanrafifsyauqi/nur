"use client";

/**
 * Stage 3A + Hardening — device-orientation hook (Client Component only).
 *
 * Flow: idle → (button "Enable Compass") → requesting →
 * granted (listeners attached) / denied / unsupported / error.
 * Permission is NEVER requested on mount — iOS requires a user gesture
 * for DeviceOrientationEvent.requestPermission() [capability-detected,
 * not UA-sniffed; iPhone Chrome uses WebKit too so capability checks are
 * the only reliable signal].
 *
 * Pipeline per event: normalize → circular smooth → rAF batch → state.
 * - Absolute events preferred (`deviceorientationabsolute` when the
 *   browser exposes it); relative-only readings surface as unavailable,
 *   never faked into a heading.
 * - Capability detection for everything: requestPermission, DeviceOrientation,
 *   absolute event support, screen.orientation.angle.
 * - Single active listener at a time (no duplicate streams).
 * - Smoothing uses circular interpolation (no naive angle averaging).
 * - State updates at most once per animation frame, and the heading is
 *   rounded to 0.1° so identical frames bail out of re-render.
 * - Stability window (last 24 headings, wrap-aware spread) drives the
 *   good/calibrating quality flag.
 * - Respects prefers-reduced-motion: skips smoothing for immediate heading.
 * - Listeners + rAF + orientationchange observer are cleaned up on unmount.
 *
 * Platform notes (installed as a dev-facing comment so support stays honest):
 * - iOS Safari (& iPhone Chrome/WebKit) requires requestPermission() from a
 *   user gesture when available; otherwise it is a no-op.
 * - Android Chrome typically exposes deviceorientation (absolute flag) or
 *   deviceorientationabsolute on newer builds; both are handled.
 * - Some desktop browsers expose no usable magnetometer — manual fallback
 *   is shown instead of faking a heading.
 * - Production must run over HTTPS (localhost is an exception); sensor
 *   APIs are restricted to secure contexts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { lerpAngleCircular, shortestAngularDifference } from "@/lib/services/qibla/angles";
import { orientationToHeading } from "@/lib/services/qibla/heading";

export type OrientationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

export type CompassQuality = "good" | "calibrating" | "unavailable";

export interface OrientationState {
  status: OrientationStatus;
  /** Smoothed heading ° clockwise from true north; null when unusable. */
  heading: number | null;
  quality: CompassQuality;
  /** True when the browser can deliver Earth-referenced orientation. */
  absoluteCapable: boolean;
  message: string | null;
}

const SMOOTHING_FACTOR = 0.25;
const STABILITY_WINDOW = 24;
const STABILITY_DEGREES = 3;

const IDLE_STATE: OrientationState = {
  status: "idle",
  heading: null,
  quality: "unavailable",
  absoluteCapable: false,
  message: null,
};

declare global {
  interface DeviceOrientationEventStatic {
    requestPermission?: () => Promise<"granted" | "denied">;
  }
}

function orientationSupported(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

function absoluteSupported(): boolean {
  return typeof window !== "undefined" && "ondeviceorientationabsolute" in window;
}

function needsPermissionGesture(): boolean {
  if (typeof window === "undefined") return false;
  const DOE = (window as unknown as Record<string, unknown>)
    .DeviceOrientationEvent as { requestPermission?: unknown } | undefined;
  return typeof DOE?.requestPermission === "function";
}

function currentScreenAngle(): number {
  if (typeof window === "undefined") return 0;
  const angle = window.screen?.orientation?.angle;
  return typeof angle === "number" && Number.isFinite(angle) ? angle : 0;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Wrap-aware spread: max |shortest diff| from the first sample. */
function circularSpread(samples: number[]): number {
  if (samples.length === 0) return 0;
  const anchor = samples[0];
  let max = 0;
  for (const s of samples) {
    const d = Math.abs(shortestAngularDifference(anchor, s));
    if (d > max) max = d;
  }
  return max;
}

export function useDeviceOrientation() {
  const [state, setState] = useState<OrientationState>(IDLE_STATE);
  const latest = useRef<{
    alpha: number | null;
    absolute: boolean;
    screenAngle: number;
  } | null>(null);
  const smoothed = useRef<number | null>(null);
  const history = useRef<number[]>([]);
  const rafId = useRef<number | null>(null);
  const mounted = useRef(true);
  const attachedType = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const pump = useCallback(() => {
    rafId.current = null;
    const reading = latest.current;
    if (!reading || !mounted.current) return;
    const { heading, reliable } = orientationToHeading(reading);
    if (!reliable || heading == null) {
      setState((s) =>
        s.heading === null && s.quality === "unavailable"
          ? s
          : { ...s, heading: null, quality: "unavailable" }
      );
      return;
    }
    // Respect reduced-motion: bypass smoothing.
    const next = prefersReducedMotion()
      ? heading
      : smoothed.current == null
        ? heading
        : lerpAngleCircular(smoothed.current, heading, SMOOTHING_FACTOR);
    smoothed.current = next;
    history.current.push(next);
    if (history.current.length > STABILITY_WINDOW) history.current.shift();
    const rounded = Math.round(next * 10) / 10;
    const stable =
      history.current.length < STABILITY_WINDOW ||
      circularSpread(history.current) < STABILITY_DEGREES;
    setState((s) => {
      const quality: CompassQuality = stable ? "good" : "calibrating";
      if (s.heading === rounded && s.quality === quality) return s;
      return { ...s, heading: rounded, quality };
    });
  }, []);

  const handleEvent = useCallback(
    (ev: Event) => {
      const e = ev as DeviceOrientationEvent;
      latest.current = {
        alpha: e.alpha,
        absolute: e.absolute ?? false,
        screenAngle: currentScreenAngle(),
      };
      if (rafId.current == null) {
        rafId.current = requestAnimationFrame(pump);
      }
    },
    [pump]
  );

  const detach = useCallback(() => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    if (typeof window !== "undefined") {
      // Remove whichever type was attached; also try the other to be safe.
      if (attachedType.current) {
        window.removeEventListener(
          attachedType.current,
          handleEvent as EventListener
        );
        attachedType.current = null;
      }
      window.removeEventListener(
        "deviceorientationabsolute",
        handleEvent as EventListener
      );
      window.removeEventListener("deviceorientation", handleEvent as EventListener);
    }
  }, [handleEvent]);

  useEffect(() => {
    return () => {
      detach();
    };
  }, [detach]);

  const enable = useCallback(async () => {
    // Guard: prevent duplicate listeners from rapid double-clicks.
    if (state.status === "requesting") return;
    if (attachedType.current) return;
    if (!orientationSupported()) {
      setState((s) => ({
        ...s,
        status: "unsupported",
        quality: "unavailable",
        message: "This device or browser doesn't provide compass orientation.",
      }));
      return;
    }
    setState((s) => ({ ...s, status: "requesting", message: null }));
    try {
      if (needsPermissionGesture()) {
        const DOE = (
          window as unknown as {
            DeviceOrientationEvent: DeviceOrientationEventStatic;
          }
        ).DeviceOrientationEvent;
        let result: string | undefined;
        try {
          result = await DOE.requestPermission?.();
        } catch {
          // requestPermission can throw on some WebKit builds.
          if (mounted.current) {
            setState((s) => ({
              ...s,
              status: "error",
              quality: "unavailable",
              message:
                "The compass couldn't be started. You can still use the manual bearing below.",
            }));
          }
          return;
        }
        if (result !== "granted") {
          if (mounted.current) {
            setState((s) => ({
              ...s,
              status: "denied",
              quality: "unavailable",
              message:
                "Compass permission was denied. You can still use the manual bearing below.",
            }));
          }
          return;
        }
      }
      // Guard: if enable was called while a previous call was still pending,
      // the early-return above prevents the second caller from attaching a
      // second listener. Single active stream ensured.
      if (attachedType.current) return;
      history.current = [];
      smoothed.current = null;
      const type = absoluteSupported() ? "deviceorientationabsolute" : "deviceorientation";
      window.addEventListener(type, handleEvent as EventListener);
      attachedType.current = type;
      if (mounted.current) {
        setState((s) => ({
          ...s,
          status: "granted",
          absoluteCapable: absoluteSupported(),
          message: null,
        }));
      }
    } catch {
      if (mounted.current) {
        setState((s) => ({
          ...s,
          status: "error",
          quality: "unavailable",
          message:
            "The compass couldn't be started. You can still use the manual bearing below.",
        }));
      }
    }
  }, [handleEvent, state.status]);

  const retry = useCallback(() => {
    detach();
    history.current = [];
    smoothed.current = null;
    latest.current = null;
    void enable();
  }, [detach, enable]);

  return { orientation: state, enableCompass: enable, retryCompass: retry };
}
