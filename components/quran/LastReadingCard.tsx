"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/controls";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { readingProgress } from "@/lib/quran/quranState";
import { useQuranUserState } from "@/lib/quran/useQuranState";
import type { Surah } from "@/lib/types";

/**
 * Stage 4B — last-reading island. Resolves the stored position against
 * real Surah metadata (passed from the server, cached) — no verse fetch
 * needed to render this card.
 */
export function LastReadingCard({ surahs }: { surahs: Surah[] }) {
  const { hydrated, reading } = useQuranUserState();

  if (!hydrated) {
    return <LoadingState label="Loading reading history…" />;
  }

  if (!reading) {
    return (
      <EmptyState
        title="Belum ada riwayat bacaan"
        description="Mulai membaca dari surah mana pun — posisi terakhirmua akan tersimpan otomatis di perangkat ini."
        action={
          <Link
            href="/quran"
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
          >
            Mulai membaca Al-Qur&apos;an <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
    );
  }

  const meta = surahs.find((s) => s.number === reading.surahNumber);
  const pct = meta ? readingProgress(reading.ayahNumber, meta.versesCount) : null;
  const done = meta ? reading.ayahNumber >= meta.versesCount : false;
  let updated = "";
  try {
    updated = new Date(reading.updatedAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    updated = "";
  }

  return (
    <Card className="nur-card-glow">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
        Terakhir dibaca{updated ? ` · ${updated}` : ""}
      </p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">
            {meta?.transliteratedName ?? `Surah ${reading.surahNumber}`}{" "}
            {meta ? (
              <span lang="ar" dir="rtl" className="font-arabic text-nur-deep dark:text-nur-gold">
                {meta.arabicName}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-sm text-[var(--nur-text-secondary)]">
            Ayat {reading.ayahNumber}
            {meta ? ` dari ${meta.versesCount}` : ""}
            {pct != null ? ` · ${pct}%` : ""}
            {done ? " · selesai" : ""}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Link
          href={`/quran/${reading.surahNumber}#ayah-${reading.ayahNumber}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
        >
          Lanjutkan membaca <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
