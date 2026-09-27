"use client";

import { Loader2, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useAudioState, useAudioTime } from "./SurahAudioProvider";
import { QURAN_AUDIO_RECITER_LABEL } from "@/lib/services/quran/audio";

function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "–:––";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Stage 2C — sticky audio bar for a surah page. All 44px+ touch targets,
 * keyboard-operable native controls, no aria-live on the ticking progress.
 */
export function QuranAudioPlayer({ surahName }: { surahName: string }) {
  const {
    available,
    status,
    index,
    total,
    error,
    playAyah,
    pauseAudio,
    prev,
    next,
    seek,
    retry,
  } = useAudioState();
  const { currentTime, duration } = useAudioTime();

  if (!available) return null;

  const currentAyah = index != null ? index + 1 : null;
  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const canSeek = Number.isFinite(duration) && duration > 0;

  return (
    <section
      aria-label={`Quran audio player for ${surahName}`}
      className="sticky top-16 z-30 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)]/95 p-3 shadow-[0_4px_16px_rgba(23,33,31,0.08)] backdrop-blur sm:p-4"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous ayah"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--nur-text-secondary)] transition-colors hover:bg-[var(--nur-surface-2)] hover:text-[var(--nur-text)]"
        >
          <SkipBack className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            if (isPlaying) pauseAudio();
            else playAyah(index ?? 0);
          }}
          aria-label={
            isPlaying
              ? `Pause ayah ${currentAyah ?? ""}`.trim()
              : currentAyah
                ? `Play ayah ${currentAyah}`
                : "Play ayah 1"
          }
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nur-deep text-white transition-colors hover:bg-nur-dark dark:bg-nur-gold dark:text-nur-ink"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" aria-hidden />
          ) : (
            <Play className="ml-0.5 h-5 w-5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next ayah"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--nur-text-secondary)] transition-colors hover:bg-[var(--nur-surface-2)] hover:text-[var(--nur-text)]"
        >
          <SkipForward className="h-5 w-5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            <Volume2 className="h-4 w-4 shrink-0 text-nur-deep dark:text-nur-gold" aria-hidden />
            <span className="truncate">
              {currentAyah
                ? `Playing Ayah ${currentAyah} of ${total}`
                : `Surah audio · ${total} ayahs`}
            </span>
          </p>
          <p className="truncate text-xs text-[var(--nur-text-secondary)]">
            {QURAN_AUDIO_RECITER_LABEL}
          </p>
        </div>

        <p className="hidden shrink-0 font-mono text-xs tabular-nums text-[var(--nur-text-secondary)] sm:block">
          <span aria-hidden="true">
            {formatClock(currentTime)} / {formatClock(duration)}
          </span>
          <span className="sr-only">
            {formatClock(currentTime)} of {formatClock(duration)}
          </span>
        </p>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label htmlFor="quran-audio-seek" className="sr-only">
          Seek audio position
        </label>
        <input
          id="quran-audio-seek"
          type="range"
          min={0}
          max={canSeek ? duration : 0}
          step={0.1}
          value={canSeek ? Math.min(currentTime, duration) : 0}
          disabled={!canSeek}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-6 w-full cursor-pointer accent-[#0F5C4D] disabled:cursor-not-allowed disabled:opacity-40"
        />
        <p className="shrink-0 font-mono text-xs tabular-nums text-[var(--nur-text-secondary)] sm:hidden">
          <span aria-hidden="true">
            {formatClock(currentTime)} / {formatClock(duration)}
          </span>
          <span className="sr-only">
            {formatClock(currentTime)} of {formatClock(duration)}
          </span>
        </p>
      </div>

      {error ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--nur-surface-2)] px-3 py-2 text-xs">
          <span className="flex-1 text-[var(--nur-text-secondary)]">{error}</span>
          <button
            type="button"
            onClick={retry}
            className="rounded-lg border border-[var(--nur-border)] px-3 py-1.5 font-medium"
          >
            Try again
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** Header play/pause toggle for the surah (client island). */
export function SurahPlayToggle() {
  const { available, status, index, total, playbackMode, playSurah, resetSurah } = useAudioState();
  if (!available) return null;
  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const isSurahMode = playbackMode === "surah";
  const canReset = index != null && index !== 0;
  const label = isSurahMode && isPlaying
    ? "Pause Surah"
    : isSurahMode && status === "paused" && index != null
      ? `Resume Surah · Ayah ${index + 1}/${total}`
      : "Play Surah";
  const ariaLabel = isSurahMode && isPlaying
    ? "Pause surah"
    : isSurahMode && status === "paused"
      ? "Resume surah"
      : "Play entire surah";
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={playSurah}
        aria-label={ariaLabel}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : isPlaying && isSurahMode ? (
          <Pause className="h-4 w-4" aria-hidden />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" aria-hidden />
        ) : (
          <Play className="h-4 w-4" aria-hidden />
        )}
        {label}
      </button>
      {canReset ? (
        <button
          type="button"
          onClick={resetSurah}
          aria-label="Reset to beginning of surah"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)] text-[var(--nur-text-secondary)] hover:bg-[var(--nur-surface-2)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
