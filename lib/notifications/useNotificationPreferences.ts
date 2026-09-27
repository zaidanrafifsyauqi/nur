"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotifStorage,
  NOTIF_PREFS_KEY,
  parseNotificationPreferences,
  serializeNotificationPreferences,
  type NotificationPreferences,
  type ReminderOffset,
  type ReminderPrayerName,
} from "./notificationPreferences";

/**
 * Stage 5B — shared notification-preferences store (useSyncExternalStore,
 * same pattern as Quran/prayer stores — no external state library).
 * Server snapshot is always defaults; storage hydrates once after mount.
 */
interface NotifSnapshot {
  hydrated: boolean;
  prefs: NotificationPreferences;
}

const SERVER_SNAPSHOT: NotifSnapshot = {
  hydrated: false,
  prefs: { ...DEFAULT_NOTIFICATION_PREFERENCES },
};

let snapshot: NotifSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let initialized = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!initialized) {
    initialized = true;
    queueMicrotask(() => {
      const storage = getNotifStorage();
      const prefs = parseNotificationPreferences(storage?.getItem(NOTIF_PREFS_KEY) ?? null);
      snapshot = { hydrated: true, prefs };
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NotifSnapshot {
  return snapshot;
}

function getServerSnapshot(): NotifSnapshot {
  return SERVER_SNAPSHOT;
}

function persist(prefs: NotificationPreferences): void {
  const storage = getNotifStorage();
  if (!storage) return;
  try {
    storage.setItem(NOTIF_PREFS_KEY, serializeNotificationPreferences(prefs));
  } catch {
    // Quota/denied — in-memory state still updates for the session.
  }
}

export interface NotificationPreferencesState extends NotifSnapshot {
  setEnabled: (enabled: boolean) => void;
  setPrayerEnabled: (prayer: ReminderPrayerName, enabled: boolean) => void;
  setOffsetMinutes: (offset: ReminderOffset) => void;
}

export function useNotificationPreferences(): NotificationPreferencesState {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setEnabled = useCallback((enabled: boolean) => {
    snapshot = { hydrated: true, prefs: { ...snapshot.prefs, enabled } };
    persist(snapshot.prefs);
    emit();
  }, []);

  const setPrayerEnabled = useCallback((prayer: ReminderPrayerName, enabled: boolean) => {
    snapshot = {
      hydrated: true,
      prefs: { ...snapshot.prefs, prayers: { ...snapshot.prefs.prayers, [prayer]: enabled } },
    };
    persist(snapshot.prefs);
    emit();
  }, []);

  const setOffsetMinutes = useCallback((offset: ReminderOffset) => {
    snapshot = { hydrated: true, prefs: { ...snapshot.prefs, offsetMinutes: offset } };
    persist(snapshot.prefs);
    emit();
  }, []);

  return {
    hydrated: snap.hydrated,
    prefs: snap.prefs,
    setEnabled,
    setPrayerEnabled,
    setOffsetMinutes,
  };
}
