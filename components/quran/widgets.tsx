import Link from "next/link";
import { Bookmark, ChevronRight, Play } from "lucide-react";
import type { QuranVerse, Surah } from "@/lib/types";
import { Badge, Card } from "@/components/ui/controls";

export function QuranSurahCard({ surah }: { surah: Surah }) {
  return (
    <Link
      href={`/quran/${surah.number}`}
      className="group flex items-center gap-3 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-4 transition-colors hover:bg-[var(--nur-surface-2)]"
      aria-label={`Open Surah ${surah.transliteratedName}`}
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 rotate-45 items-center justify-center rounded-[10px] border border-[var(--nur-border)] bg-[var(--nur-surface-2)]"
      >
        <span className="-rotate-45 text-sm font-bold text-nur-deep dark:text-nur-gold">
          {surah.number}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold group-hover:underline">
          {surah.transliteratedName}
        </span>
        <span className="block truncate text-xs text-[var(--nur-text-secondary)]">
          {surah.englishName} · {surah.versesCount} verses
        </span>
        <span className="mt-1.5 flex gap-1.5">
          <Badge>{surah.revelation}</Badge>
          {surah.juz && surah.juz.length > 0 ? <Badge>Juz {surah.juz[0]}</Badge> : null}
        </span>
      </span>
      <span lang="ar" dir="rtl" className="font-arabic shrink-0 text-2xl text-nur-deep dark:text-nur-gold">
        {surah.arabicName}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--nur-text-secondary)]" aria-hidden />
    </Link>
  );
}

export function ContinueReadingCard({
  surahName,
  surahNumber,
  verse,
  totalVerses,
}: {
  surahName: string;
  surahNumber: number;
  verse: number;
  totalVerses: number;
}) {
  return (
    <Card className="nur-card-glow flex items-center gap-4">
      <span
        aria-hidden
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nur-deep text-white dark:bg-nur-gold dark:text-nur-ink"
      >
        <Bookmark className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
          Continue reading
        </p>
        <p className="truncate font-semibold">
          {surahName} · Verse {verse} of {totalVerses}
        </p>
      </div>
      <Link
        href={`/quran/${surahNumber}`}
        className="shrink-0 rounded-xl bg-nur-deep px-4 py-2.5 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
      >
        Resume
      </Link>
    </Card>
  );
}

export function QuranVerseRow({
  verse,
  audioButton,
  active = false,
  bookmarkButton,
}: {
  verse: QuranVerse;
  /** Stage 2C client play island (server renders a static button if absent). */
  audioButton?: React.ReactNode;
  /** Stage 2C highlight for the currently playing ayah. */
  active?: boolean;
  /** Stage 4B client bookmark island (static inert button if absent). */
  bookmarkButton?: React.ReactNode;
}) {
  return (
    <article
      id={`ayah-${verse.verseNumber}`}
      data-verse={verse.verseNumber}
      aria-label={`Verse ${verse.verseNumber}`}
      data-active-ayah={active ? "true" : undefined}
      className={`scroll-mt-24 rounded-2xl border bg-[var(--nur-surface)] p-5 transition-colors sm:p-6 ${
        active
          ? "border-nur-gold shadow-[0_0_0_1px_var(--color-nur-gold)]"
          : "border-[var(--nur-border)]"
      } target:border-nur-gold target:shadow-[0_0_0_1px_var(--color-nur-gold)]`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nur-surface-2)] text-xs font-bold text-nur-deep dark:text-nur-gold">
          {verse.verseNumber}
        </span>
        {active ? (
          <span className="rounded-full bg-nur-gold/15 px-2.5 py-1 text-[11px] font-semibold text-nur-deep dark:text-nur-gold">
            Playing
          </span>
        ) : null}
        <div className="ml-auto flex gap-1">
          {audioButton ?? (
            <button
              type="button"
              aria-label={`Play audio for verse ${verse.verseNumber}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--nur-text-secondary)] hover:bg-[var(--nur-surface-2)]"
            >
              <Play className="h-4 w-4" aria-hidden />
            </button>
          )}
          {bookmarkButton ?? (
            <button
              type="button"
              aria-label={`Bookmark verse ${verse.verseNumber}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--nur-text-secondary)] hover:bg-[var(--nur-surface-2)]"
            >
              <Bookmark className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <p dir="rtl" lang="ar" className="font-arabic mt-3 text-right text-[26px] leading-[2.2]">
        {verse.arabic}
      </p>
      {verse.transliteration ? (
        <p className="mt-2 text-sm italic text-[var(--nur-text-secondary)]">
          {verse.transliteration}
        </p>
      ) : null}
      <p className="mt-2 text-[15px] leading-relaxed">{verse.translation}</p>
    </article>
  );
}
