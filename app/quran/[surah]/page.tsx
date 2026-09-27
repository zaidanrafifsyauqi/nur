import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bookmark, Share2 } from "lucide-react";
import { PageContainer } from "@/components/layout/containers";
import { AyahRow } from "@/components/quran/AyahRow";
import { QuranAudioPlayer, SurahPlayToggle } from "@/components/quran/QuranAudioPlayer";
import { ReadingTracker } from "@/components/quran/ReadingTracker";
import { SurahAudioProvider } from "@/components/quran/SurahAudioProvider";
import { SurahProgress } from "@/components/quran/SurahProgress";
import { Badge } from "@/components/ui/controls";
import { ErrorState } from "@/components/ui/states";
import { getSurahAudio, getSurahDetail } from "@/lib/services/quran";
import { QuranApiError } from "@/lib/services/quran/api";
import type { QuranAudioAyah } from "@/lib/types";

/**
 * Only the most-visited surahs are prerendered at build time: the public
 * API aggressively rate-limits bursts (HTTP 429), so prerendering all 114
 * at once yields ErrorState pages. Remaining surahs render on first request
 * (dynamicParams) and are then cached for 1 day — every /quran/1…/quran/114
 * stays valid.
 */
export function generateStaticParams() {
  return [1, 2, 18, 36, 55, 67, 112, 114].map((n) => ({ surah: String(n) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surah: string }>;
}): Promise<Metadata> {
  const { surah } = await params;
  const n = Number(surah);
  if (!Number.isInteger(n) || n < 1 || n > 114) {
    return { title: "Surah not found — NUR" };
  }
  try {
    const detail = await getSurahDetail(n);
    if (!detail) return { title: "Surah not found — NUR" };
    return { title: `${detail.transliteratedName} — NUR Quran` };
  } catch {
    return { title: "Quran — NUR" };
  }
}

export default async function SurahPage({
  params,
}: {
  params: Promise<{ surah: string }>;
}) {
  const { surah } = await params;
  const n = Number(surah);
  if (!Number.isInteger(n) || n < 1 || n > 114) notFound();

  // Verse text and audio metadata fetch in parallel (both cached 1 day).
  // An audio failure must never blank the page — verses stay readable.
  const [detailSettled, audioSettled] = await Promise.allSettled([
    getSurahDetail(n),
    getSurahAudio(n),
  ]);

  if (detailSettled.status === "rejected") {
    const cause = detailSettled.reason;
    const message =
      cause instanceof QuranApiError
        ? "Quran data couldn't be loaded. Please try again."
        : "Quran data couldn't be loaded. Please try again.";
    return (
      <PageContainer className="max-w-3xl">
        <Link
          href="/quran"
          className="inline-flex items-center gap-1.5 rounded-lg py-2 text-sm font-medium text-[var(--nur-text-secondary)] hover:text-[var(--nur-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> All surahs
        </Link>
        <div className="mt-2">
          <ErrorState title="Quran data couldn't be loaded" message={message} />
        </div>
      </PageContainer>
    );
  }
  const detail = detailSettled.value;
  if (!detail) notFound();

  const settledAudios =
    audioSettled.status === "fulfilled" ? audioSettled.value : null;
  const audios: QuranAudioAyah[] | null =
    settledAudios && settledAudios.length > 0 ? settledAudios : null;

  const showBismillah = detail.number !== 1 && detail.number !== 9;

  return (
    <PageContainer className="max-w-3xl">
      <Link
        href="/quran"
        className="inline-flex items-center gap-1.5 rounded-lg py-2 text-sm font-medium text-[var(--nur-text-secondary)] hover:text-[var(--nur-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All surahs
      </Link>

      <header className="mt-2 rounded-3xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-6 text-center sm:p-8">
        <div className="flex justify-center gap-2">
          <Badge>{detail.revelation}</Badge>
          <Badge>{detail.versesCount} verses</Badge>
        </div>
        <p
          dir="rtl"
          lang="ar"
          className="font-arabic mt-4 text-4xl text-nur-deep sm:text-5xl dark:text-nur-gold"
        >
          {detail.arabicName}
        </p>
        <h1 className="mt-3 text-2xl font-bold">{detail.transliteratedName}</h1>
        <p className="text-sm text-[var(--nur-text-secondary)]">
          {detail.englishName} · Surah {detail.number}
        </p>
        {showBismillah ? (
          <p dir="rtl" lang="ar" className="font-arabic mx-auto mt-4 max-w-md text-2xl">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        ) : null}
        <p className="mx-auto mt-2 max-w-md text-xs text-[var(--nur-text-secondary)]">
          Indonesian translation · Bahasa Indonesia via Al Quran Cloud
        </p>
      </header>

      {/*
        Single audio controller for the page: header toggle, sticky player
        bar and per-ayah buttons share one HTMLAudioElement. Server-rendered
        children pass through the client provider untouched.
      */}
      <SurahAudioProvider audios={audios}>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <SurahPlayToggle />
          <button
            type="button"
            aria-label="Bookmark this surah"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)]"
          >
            <Bookmark className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Share this surah"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)]"
          >
            <Share2 className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4">
          <QuranAudioPlayer surahName={detail.transliteratedName} />
        </div>
        {audios ? null : (
          <div className="mt-4">
            <ErrorState
              title="Quran audio couldn't be loaded"
              message="Quran audio couldn't be loaded. Please try again."
            />
          </div>
        )}

        <div className="mt-4">
          <SurahProgress
            surahNumber={detail.number}
            totalAyahs={detail.versesCount}
            surahName={detail.transliteratedName}
          />
        </div>

        <ReadingTracker surahNumber={detail.number} totalAyahs={detail.versesCount}>
          {detail.verses.map((v, i) => (
            <AyahRow key={v.verseNumber} verse={v} index={i} />
          ))}
        </ReadingTracker>
      </SurahAudioProvider>
    </PageContainer>
  );
}
