"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getStorage,
  hasBookmark,
  parseBookmarks,
  parseReadingPosition,
  QURAN_BOOKMARKS_KEY,
  QURAN_READING_KEY,
  serializeBookmarks,
  serializeReadingPosition,
  toggleBookmark,
  type QuranBookmark,
  type QuranReadingPosition,
} from "./quranState";

/**
 * Stage 4B — shared local Quran store (React useSyncExternalStore, no
 * external state library). One module-level snapshot shared by every
 * island on the page, so N bookmark buttons never desync.
 *
 * SSR: server snapshot is always empty + unhydrated; storage is read
 * lazily on first client subscribe (never during render, never on server).
 * Corrupt/foreign data is dropped by validators, never thrown.
 */

interface QuranUserSnapshot {
  hydrated: boolean;
  bookmarks: QuranBookmark[];
  reading: QuranReadingPosition | null;
}

const EMPTY: QuranUserSnapshot = { hydrated: false, bookmarks: [], reading: null };

let snapshot: QuranUserSnapshot = EMPTY;
const listeners = new Set<() => void>();
let initialized = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function readStored(): void {
  const storage = getStorage();
  if (!storage) {
    snapshot = { hydrated: true, bookmarks: [], reading: null };
    return;
  }
  let bookmarks: QuranBookmark[] = [];
  let reading: QuranReadingPosition | null = null;
  try {
    bookmarks = parseBookmarks(storage.getItem(QURAN_BOOKMARKS_KEY));
  } catch {
    bookmarks = [];
  }
  try {
    reading = parseReadingPosition(storage.getItem(QURAN_READING_KEY));
  } catch {
    reading = null;
  }
  snapshot = { hydrated: true, bookmarks, reading };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!initialized) {
    initialized = true;
    // Defer past render/commit — never read storage during render.
    queueMicrotask(() => {
      readStored();
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): QuranUserSnapshot {
  return snapshot;
}

function getServerSnapshot(): QuranUserSnapshot {
  return EMPTY;
}

function persistBookmarks(list: QuranBookmark[]): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(QURAN_BOOKMARKS_KEY, serializeBookmarks(list));
    } catch {
      // Quota/denied — in-memory state still updates for the session.
    }
  }
}

function persistReading(pos: QuranReadingPosition | null): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (pos) storage.setItem(QURAN_READING_KEY, serializeReadingPosition(pos));
    else storage.removeItem(QURAN_READING_KEY);
  } catch {
    // Quota/denied — in-memory state still updates for the session.
  }
}

export interface QuranUserState extends QuranUserSnapshot {
  toggleVerseBookmark: (surahNumber: number, ayahNumber: number) => void;
  removeVerseBookmark: (surahNumber: number, ayahNumber: number) => void;
  isBookmarked: (surahNumber: number, ayahNumber: number) => boolean;
  saveReadingPosition: (surahNumber: number, ayahNumber: number) => void;
}

export function useQuranUserState(): QuranUserState {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleVerseBookmark = useCallback((surahNumber: number, ayahNumber: number) => {
    snapshot = {
      ...snapshot,
      hydrated: true,
      bookmarks: toggleBookmark(snapshot.bookmarks, surahNumber, ayahNumber),
    };
    persistBookmarks(snapshot.bookmarks);
    emit();
  }, []);

  const removeVerseBookmark = useCallback((surahNumber: number, ayahNumber: number) => {
    snapshot = {
      ...snapshot,
      hydrated: true,
      bookmarks: snapshot.bookmarks.filter(
        (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
      ),
    };
    persistBookmarks(snapshot.bookmarks);
    emit();
  }, []);

  const isBookmarked = useCallback(
    (surahNumber: number, ayahNumber: number) => hasBookmark(snap.bookmarks, surahNumber, ayahNumber),
    [snap.bookmarks]
  );

  const saveReadingPosition = useCallback((surahNumber: number, ayahNumber: number) => {
    if (
      !Number.isInteger(surahNumber) ||
      surahNumber < 1 ||
      surahNumber > 114 ||
      !Number.isInteger(ayahNumber) ||
      ayahNumber < 1
    ) {
      return;
    }
    const current = snapshot.reading;
    if (current && current.surahNumber === surahNumber && current.ayahNumber === ayahNumber) {
      return;
    }
    const pos: QuranReadingPosition = {
      surahNumber,
      ayahNumber,
      updatedAt: new Date().toISOString(),
    };
    snapshot = { ...snapshot, hydrated: true, reading: pos };
    persistReading(pos);
    emit();
  }, []);

  return {
    hydrated: snap.hydrated,
    bookmarks: snap.bookmarks,
    reading: snap.reading,
    toggleVerseBookmark,
    removeVerseBookmark,
    isBookmarked,
    saveReadingPosition,
  };
}
