"use client";

import { memo } from "react";
import { AyahBookmarkButton } from "./AyahBookmarkButton";
import { AyahPlayButton } from "./AyahPlayButton";
import { useAudioState } from "./SurahAudioProvider";
import { QuranVerseRow } from "./widgets";
import type { QuranVerse } from "@/lib/types";

/**
 * Stage 2C client island per ayah (+ Stage 4B bookmark island).
 * Reads AudioStateContext (index/status) and the shared Quran user store;
 * 1 Hz audio ticks never re-render verses. Arabic + translation markup
 * stays identical to Stage 2A.
 */
export const AyahRow = memo(function AyahRow({
  verse,
  index,
}: {
  verse: QuranVerse;
  /** 0-based position in this surah. */
  index: number;
}) {
  const { available, index: activeIndex } = useAudioState();
  const active = available && activeIndex === index;

  return (
    <QuranVerseRow
      verse={verse}
      active={active}
      audioButton={<AyahPlayButton ayahNumber={verse.verseNumber} index={index} />}
      bookmarkButton={
        <AyahBookmarkButton surahNumber={verse.surahNumber} ayahNumber={verse.verseNumber} />
      }
    />
  );
});
