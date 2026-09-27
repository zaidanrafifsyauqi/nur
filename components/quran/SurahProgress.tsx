"use client";

import { readingProgress } from "@/lib/quran/quranState";
import { useQuranUserState } from "@/lib/quran/useQuranState";
import { Progress } from "@/components/ui/controls";

/**
 * Stage 4B — subtle in-surah progress (client island). Renders nothing
 * until a real position exists for THIS surah. Percentage derives from
 * actual Surah metadata; 100% only when the final ayah is the position.
 */
export function SurahProgress({
  surahNumber,
  totalAyahs,
  surahName,
}: {
  surahNumber: number;
  totalAyahs: number;
  surahName: string;
}) {
  const { hydrated, reading } = useQuranUserState();
  if (!hydrated || !reading || reading.surahNumber !== surahNumber) return null;

  const pct = readingProgress(reading.ayahNumber, totalAyahs);
  const done = reading.ayahNumber >= totalAyahs;

  return (
    <section
      aria-label={`Reading progress for ${surahName}`}
      className="rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="text-[var(--nur-text-secondary)]">
          {done ? (
            <span className="font-semibold text-[var(--nur-text)]">
              {surahName} — selesai
            </span>
          ) : (
            <>
              Terakhir dibaca: ayat{" "}
              <span className="font-semibold text-[var(--nur-text)]">
                {reading.ayahNumber}
              </span>{" "}
              dari {totalAyahs}
            </>
          )}
        </p>
        <p
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% dibaca`}
          className="font-mono font-semibold tabular-nums"
        >
          {pct}%
        </p>
      </div>
      <Progress value={pct / 100} label={`Progress membaca ${surahName}`} className="mt-2" />
    </section>
  );
}
