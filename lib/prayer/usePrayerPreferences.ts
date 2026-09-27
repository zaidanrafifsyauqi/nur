"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_PRAYER_PREFERENCES,
  getPrefsStorage,
  isPrayerPreferences,
  parsePrayerPreferences,
  PRAYER_PREFS_KEY,
  prayerPreferencesEqual,
  serializePrayerPreferences,
  type PrayerPreferences,
} from "./prayerPreferences";

/**
 * Stage 4C — shared prayer-preferences store (React useSyncExternalStore,
 * same pattern as Stage 4B Quran state — no external state library).
 *
 * SSR snapshot is always the defaults (deterministic, no mismatch);
 * saved preferences load once after mount. Updates re-render subscribers
 * instantly; reset restores defaults. No storage access during SSR.
 */
interface PrefsSnapshot {
  hydrated: boolean;
  prefs: PrayerPreferences;
}

const SERVER_SNAPSHOT: PrefsSnapshot = {
  hydrated: false,
  prefs: { ...DEFAULT_PRAYER_PREFERENCES },
};

let snapshot: PrefsSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let initialized = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!initialized) {
    initialized = true;
    // Past render/commit — never touch storage during render.
    queueMicrotask(() => {
      const storage = getPrefsStorage();
      const prefs = parsePrayerPreferences(storage?.getItem(PRAYER_PREFS_KEY) ?? null);
      snapshot = { hydrated: true, prefs };
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PrefsSnapshot {
  return snapshot;
}

function getServerSnapshot(): PrefsSnapshot {
  return SERVER_SNAPSHOT;
}

function persist(prefs: PrayerPreferences): void {
  const storage = getPrefsStorage();
  if (!storage) return;
  try {
    storage.setItem(PRAYER_PREFS_KEY, serializePrayerPreferences(prefs));
  } catch {
    // Quota/denied — in-memory state still updates for the session.
  }
}

export interface PrayerPreferencesState extends PrefsSnapshot {
  updatePreferences: (patch: Partial<PrayerPreferences>) => void;
  resetPreferences: () => void;
}

export function usePrayerPreferences(): PrayerPreferencesState {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updatePreferences = useCallback((patch: Partial<PrayerPreferences>) => {
    const next: PrayerPreferences = { ...snapshot.prefs, ...patch };
    // Strict validator is the single gate — invalid patches are dropped.
    if (!isPrayerPreferences(next)) return;
    if (prayerPreferencesEqual(snapshot.prefs, next)) return;
    snapshot = { hydrated: true, prefs: next };
    persist(next);
    emit();
  }, []);

  const resetPreferences = useCallback(() => {
    if (prayerPreferencesEqual(snapshot.prefs, DEFAULT_PRAYER_PREFERENCES)) return;
    snapshot = { hydrated: true, prefs: { ...DEFAULT_PRAYER_PREFERENCES } };
    const storage = getPrefsStorage();
    if (storage) {
      try {
        storage.removeItem(PRAYER_PREFS_KEY);
      } catch {
        // ignore — in-memory state already reset
      }
    }
    emit();
  }, []);

  return {
    hydrated: snap.hydrated,
    prefs: snap.prefs,
    updatePreferences,
    resetPreferences,
  };
}
