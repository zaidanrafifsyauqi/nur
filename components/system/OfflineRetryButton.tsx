"use client";

/**
 * Stage 5C — offline retry button. A plain client navigation could leave
 * the user on a failed RSC fetch while offline; a full document reload
 * re-runs the service worker navigation handler (network → cache →
 * /offline fallback), which is the honest retry semantic here.
 */
export function OfflineRetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex min-h-[44px] items-center rounded-xl bg-nur-deep px-5 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
    >
      Try again
    </button>
  );
}
