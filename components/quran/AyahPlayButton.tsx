"use client";

import { memo } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { useAudioState } from "./SurahAudioProvider";

/**
 * Stage 2C — per-ayah play island. Memoized on (ayahNumber, active, status)
 * so the 1 Hz progress ticks and other ayahs' transitions skip it.
 */
export const AyahPlayButton = memo(function AyahPlayButton({
  ayahNumber,
  index,
}: {
  ayahNumber: number;
  /** 0-based position in this surah. */
  index: number;
}) {
  const { available, status, index: activeIndex, toggleAyah } = useAudioState();
  const active = available && activeIndex === index;
  const isPlaying = active && status === "playing";
  const isLoading = active && status === "loading";

  return (
    <button
      type="button"
      onClick={() => toggleAyah(index)}
      disabled={!available}
      aria-label={
        !available
          ? `Audio unavailable for verse ${ayahNumber}`
          : isPlaying
            ? `Pause verse ${ayahNumber}`
            : `Play verse ${ayahNumber}`
      }
      title={
        !available
          ? "Audio unavailable"
          : isPlaying
            ? "Playing — tap to pause"
            : `Play ayah ${ayahNumber}`
      }
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--nur-text-secondary)] transition-colors hover:bg-[var(--nur-surface-2)] disabled:cursor-not-allowed disabled:opacity-40 aria-[pressed=true]:bg-nur-deep/10 aria-[pressed=true]:text-nur-deep dark:aria-[pressed=true]:text-nur-gold"
      aria-pressed={active}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : isPlaying ? (
        <Pause className="h-4 w-4" aria-hidden />
      ) : (
        <Play className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
});
