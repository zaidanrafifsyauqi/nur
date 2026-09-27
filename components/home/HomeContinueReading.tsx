"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Badge, Card, Progress } from "@/components/ui/controls";
import { readingProgress } from "@/lib/quran/quranState";
import { useQuranUserState } from "@/lib/quran/useQuranState";
import type { Surah } from "@/lib/types";

/**
 * Stage 4B — Home Quran block. Shows REAL "Continue Reading" only when a
 * local reading position exists (percentage derived from actual Surah
 * metadata); otherwise the honest Explore entry. Surah catalog comes from
 * the server (one cached fetch) — never refetched here.
 */
export function HomeContinueReading({ surahs }: { surahs: Surah[] }) {
  const { hydrated, reading } = useQuranUserState();
  const meta = reading ? surahs.find((s) => s.number === reading.surahNumber) : undefined;

  if (hydrated && reading && meta) {
    const pct = readingProgress(reading.ayahNumber, meta.versesCount);
    const done = reading.ayahNumber >= meta.versesCount;
    return (
      <Card className="nur-card-glow">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
          <BookOpen className="h-3.5 w-3.5" aria-hidden /> Continue Reading
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">
              {done ? `${meta.transliteratedName} — selesai` : meta.transliteratedName}{" "}
              <span lang="ar" dir="rtl" className="font-arabic text-nur-deep dark:text-nur-gold">
                {meta.arabicName}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[var(--nur-text-secondary)]">
              Ayat {reading.ayahNumber} dari {meta.versesCount} · {pct}%
            </p>
          </div>
          <Link
            href={`/quran/${meta.number}#ayah-${reading.ayahNumber}`}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
          >
            Lanjutkan membaca <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <Progress value={pct / 100} label={`Progress membaca ${meta.transliteratedName}`} className="mt-3" />
      </Card>
    );
  }

  const fatihah = surahs.find((s) => s.number === 1);
  return (
    <Card className="nur-card-glow">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
        <BookOpen className="h-3.5 w-3.5" aria-hidden /> Explore the Quran
      </p>
      {fatihah ? (
        <div className="mt-2">
          <p className="truncate text-lg font-bold">
            {fatihah.transliteratedName}{" "}
            <span lang="ar" dir="rtl" className="font-arabic text-nur-deep dark:text-nur-gold">
              {fatihah.arabicName}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-[var(--nur-text-secondary)]">
            Surah {fatihah.number} · {fatihah.versesCount} verses
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <Badge>{fatihah.revelation}</Badge>
            <Badge>{fatihah.englishName}</Badge>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--nur-text-secondary)]">
          Begin with Surah Al-Fatihah — 7 verses.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/quran/1"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
        >
          Read Surah <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/quran"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-[var(--nur-border)] px-4 text-sm font-medium"
        >
          Explore all Surahs
        </Link>
      </div>
    </Card>
  );
}
