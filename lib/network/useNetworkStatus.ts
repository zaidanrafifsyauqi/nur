"use client";

import { useEffect, useState } from "react";

/**
 * Stage 5C — network status hook. SSR-safe: "unknown" until mounted,
 * then the real browser state. Listens to online/offline events only —
 * no polling, no network requests to determine connectivity.
 */
export type NetworkStatus = "online" | "offline" | "unknown";

function readStatus(): NetworkStatus {
  if (typeof window === "undefined" || typeof window.navigator === "undefined") {
    return "unknown";
  }
  return window.navigator.onLine ? "online" : "offline";
}

export function useNetworkStatus(): NetworkStatus {
  // "unknown" initial matches the server render — no hydration mismatch.
  const [status, setStatus] = useState<NetworkStatus>("unknown");

  useEffect(() => {
    const update = () => setStatus(readStatus());
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return status;
}
