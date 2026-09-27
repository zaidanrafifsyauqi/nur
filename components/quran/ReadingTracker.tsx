"use client";

import { useEffect, useRef } from "react";
import { useQuranUserState } from "@/lib/quran/useQuranState";

/**
 * Stage 4B — observes which verse is meaningfully visible and persists it
 * as the reading position (debounced; never on every scroll tick).
 *
 * - One IntersectionObserver on the list container, center-band rootMargin.
 * - Topmost intersecting verse wins (data-verse attributes from the reader).
 * - Writes only when the visible ayah actually changes; never stores
 *   pixels, pages, or audio state. Audio playback never touches this.
 */
export function ReadingTracker({
  surahNumber,
  totalAyahs,
  children,
}: {
  surahNumber: number;
  totalAyahs: number;
  children: React.ReactNode;
}) {
  const { saveReadingPosition } = useQuranUserState();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(new Map<number, boolean>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef<string | null>(null);

  // Keep latest callback without re-subscribing the observer.
  const saveRef = useRef(saveReadingPosition);
  useEffect(() => {
    saveRef.current = saveReadingPosition;
  }, [saveReadingPosition]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;
    const visible = visibleRef.current;

    const persist = (ayahNumber: number) => {
      if (ayahNumber < 1 || ayahNumber > totalAyahs) return;
      const key = `${surahNumber}:${ayahNumber}`;
      if (savedRef.current === key) return;
      savedRef.current = key;
      saveRef.current(surahNumber, ayahNumber);
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        let topmost: number | null = null;
        for (const [ayah, isVisible] of visible) {
          if (isVisible && (topmost == null || ayah < topmost)) topmost = ayah;
        }
        if (topmost != null) persist(topmost);
      }, 1200);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        for (const entry of entries) {
          const ayah = Number((entry.target as HTMLElement).dataset.verse);
          if (!Number.isInteger(ayah)) continue;
          const was = visible.get(ayah) ?? false;
          if (was !== entry.isIntersecting) {
            visible.set(ayah, entry.isIntersecting);
            changed = true;
          }
        }
        if (changed) schedule();
      },
      { root: null, rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );

    const articles = container.querySelectorAll("article[data-verse]");
    articles.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      visible.clear();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [surahNumber, totalAyahs]);

  return <div ref={containerRef} className="mt-4 flex flex-col gap-3">{children}</div>;
}
