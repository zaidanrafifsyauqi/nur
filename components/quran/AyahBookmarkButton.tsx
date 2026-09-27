"use client";

import { memo } from "react";
import { Bookmark } from "lucide-react";
import { useQuranUserState } from "@/lib/quran/useQuranState";
import { cn } from "@/lib/utils";

/**
 * Stage 4B — per-ayah bookmark island. Same server/client markup before
 * hydration (neutral unpressed state) so no hydration mismatch; real
 * state syncs on mount. Instant toggle, localStorage only, no API calls.
 */
export const AyahBookmarkButton = memo(function AyahBookmarkButton({
  surahNumber,
  ayahNumber,
}: {
  surahNumber: number;
  ayahNumber: number;
}) {
  const { hydrated, isBookmarked, toggleVerseBookmark } = useQuranUserState();
  const saved = hydrated && isBookmarked(surahNumber, ayahNumber);

  return (
    <button
      type="button"
      onClick={() => toggleVerseBookmark(surahNumber, ayahNumber)}
      aria-pressed={saved}
      aria-label={saved ? `Remove bookmark for verse ${ayahNumber}` : `Bookmark verse ${ayahNumber}`}
      title={saved ? "Remove bookmark" : "Bookmark verse"}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-[var(--nur-surface-2)]",
        saved
          ? "text-nur-deep dark:text-nur-gold"
          : "text-[var(--nur-text-secondary)]"
      )}
    >
      <Bookmark
        className={cn("h-[18px] w-[18px]", saved && "fill-current")}
        aria-hidden
      />
    </button>
  );
});
