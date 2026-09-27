"use client";

import { useEffect, useRef } from "react";

/**
 * Stage 5C — service worker registration (production only).
 *
 * - Client-side useEffect: never touches SSR/hydration.
 * - `NODE_ENV === "production"`: dev keeps hot reload + fresh bundles.
 * - Failures are swallowed: the app works identically without a worker.
 * - No update modals, no reload loops — lifecycle handled by the worker
 *   itself (versioned caches, skipWaiting, old-cache purge).
 */
export function ServiceWorkerRegister() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline foundation is best-effort; the app stays fully usable.
    });
  }, []);

  return null;
}
