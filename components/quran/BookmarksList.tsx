"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, BookmarkX } from "lucide-react";
import { QuranVerseRow } from "./widgets";
import { useQuranUserState } from "@/lib/quran/useQuranState";
import { mapEditionsToSurahDetail } from "@/lib/services/quran/mapper";
import { parseSurahEditionsResponse, surahEditionsUrl } from "@/lib/services/quran/api";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { LoadingState } from "@/components/ui/states";
import type { QuranVerse, SurahDetail } from "@/lib/types";

interface LoadedVerse extends QuranVerse {
  surahName: string;
}

/**
 * Stage 4B — bookmark list island. Reads local bookmark identifiers, then
 * loads each bookmarked surah ONCE (parallel, browser-cached) through the
 * shared endpoint + validator + mapper — no new backend, no whole-Quran
 * download, raw API never touches JSX (mapped first).
 */
export function BookmarksList() {
  const { hydrated, bookmarks, removeVerseBookmark } = useQuranUserState();

  type FetchState =
    | { status: "idle" | "loading" }
    | { status: "ready"; details: SurahDetail[] }
    | { status: "error" };
  const [fetchState, dispatch] = useReducer(
    (_s: FetchState, a: FetchState): FetchState => a,
    { status: "idle" } as FetchState
  );

  const surahNumbers = useMemo(
    () => [...new Set(bookmarks.map((b) => b.surahNumber))].sort((a, b) => a - b),
    [bookmarks]
  );
  const surahKey = surahNumbers.join(",");
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    // Same surah set (e.g. toggling within it) must not refetch.
    if (fetchedKeyRef.current === surahKey) return;
    fetchedKeyRef.current = surahKey;
    // Empty list renders EmptyState directly — no fetch.
    if (surahNumbers.length === 0) return;
    let cancelled = false;
    dispatch({ status: "loading" });
    void (async () => {
      try {
        const loaded = await Promise.all(
          surahNumbers.map(async (n) => {
            const res = await fetch(surahEditionsUrl(n));
            if (!res.ok) throw new Error(`Surah ${n} request failed.`);
            const json: unknown = await res.json();
            return mapEditionsToSurahDetail(...parseSurahEditionsResponse(json));
          })
        );
        if (!cancelled) dispatch({ status: "ready", details: loaded });
      } catch {
        if (!cancelled) {
          fetchedKeyRef.current = null;
          dispatch({ status: "error" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, surahKey, surahNumbers]);

  if (!hydrated) {
    return <LoadingState label="Loading bookmarks…" />;
  }

  if (bookmarks.length === 0) {
    return (
      <EmptyState
        title="Belum ada ayat yang ditandai"
        description="Ketuk ikon bookmark pada ayat mana pun untuk menyimpannya di sini."
        action={
          <Link
            href="/quran"
            className="mt-2 inline-flex min-h-[44px] items-center rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Jelajahi Quran
          </Link>
        }
      />
    );
  }

  if (fetchState.status === "error") {
    return (
      <ErrorState
        title="Quran data couldn't be loaded"
        message="Quran data couldn't be loaded. Please try again."
      />
    );
  }

  if (fetchState.status !== "ready") {
    return <LoadingState label="Loading bookmarked verses…" />;
  }

  const bySurah = new Map(fetchState.details.map((d) => [d.number, d]));
  const verses: LoadedVerse[] = [];
  for (const b of bookmarks) {
    const detail = bySurah.get(b.surahNumber);
    const verse = detail?.verses.find((v) => v.verseNumber === b.ayahNumber);
    if (verse && detail) {
      verses.push({ ...verse, surahName: detail.transliteratedName });
    }
  }

  return (
    <ul className="flex flex-col gap-3">
      {verses.map((v) => (
        <li key={`${v.surahNumber}:${v.verseNumber}`}>
          <QuranVerseRow
            verse={v}
            bookmarkButton={
              <button
                type="button"
                onClick={() => removeVerseBookmark(v.surahNumber, v.verseNumber)}
                aria-label={`Remove bookmark for verse ${v.verseNumber}`}
                title="Remove bookmark"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-nur-deep hover:bg-[var(--nur-surface-2)] dark:text-nur-gold"
              >
                <BookmarkX className="h-[18px] w-[18px]" aria-hidden />
              </button>
            }
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1 text-xs text-[var(--nur-text-secondary)]">
            <span>
              {v.surahName} · Ayat {v.verseNumber}
            </span>
            <Link
              href={`/quran/${v.surahNumber}#ayah-${v.verseNumber}`}
              className="font-medium text-nur-deep underline dark:text-nur-gold"
            >
              Buka ayat
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
