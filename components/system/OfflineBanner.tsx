"use client";

import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/lib/network/useNetworkStatus";

/**
 * Stage 5C — global offline banner (mounted once in the root layout).
 * Renders nothing while online/unknown; fixed above the mobile bottom
 * nav and clear of the header. role="status" without aggressive updates.
 */
export function OfflineBanner() {
  const status = useNetworkStatus();
  if (status !== "offline") return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm"
    >
      <p className="flex items-center gap-2 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 py-3 text-sm shadow-lg">
        <WifiOff className="h-4 w-4 shrink-0 text-nur-deep dark:text-nur-gold" aria-hidden />
        <span>
          <span className="font-semibold">You&apos;re offline. </span>
          <span className="text-[var(--nur-text-secondary)]">
            Some live features may be unavailable.
          </span>
        </span>
      </p>
    </div>
  );
}
