"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { BellOff, BellRing } from "lucide-react";
import { Card } from "@/components/ui/controls";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  type NotificationPermissionState,
} from "@/lib/notifications/notificationPermission";
import {
  REMINDER_OFFSET_LABELS,
  REMINDER_OFFSETS,
  REMINDER_PRAYERS,
  type ReminderOffset,
} from "@/lib/notifications/notificationPreferences";
import { useNotificationPreferences } from "@/lib/notifications/useNotificationPreferences";
import { cn } from "@/lib/utils";

/**
 * Stage 5B — Prayer Notifications section for /profile (the preferences
 * center). Permission is requested ONLY from the Enable button — never on
 * mount, never on hydration. Preference-enabled and permission-granted
 * stay visibly distinct states.
 */
export function NotificationSettings() {
  const { prefs, setEnabled, setPrayerEnabled, setOffsetMinutes } =
    useNotificationPreferences();
  // Seeded "unsupported" on both server and client (identical first paint);
  // the real permission is dispatched post-mount (reducer dispatch in
  // effects is lint-clean, unlike direct setState).
  const [permission, dispatchPermission] = useReducer(
    (_s: NotificationPermissionState, a: NotificationPermissionState): NotificationPermissionState => a,
    "unsupported" as NotificationPermissionState
  );
  const [requesting, setRequesting] = useState(false);

  // Refresh permission on mount (read-only; never prompts).
  useEffect(() => {
    dispatchPermission(getNotificationPermission());
  }, []);

  const supported = permission !== "unsupported";
  const granted = permission === "granted";
  const blocked = permission === "denied";

  const handleEnable = useCallback(async () => {
    if (!isNotificationSupported()) {
      dispatchPermission("unsupported");
      return;
    }
    const current = getNotificationPermission();
    if (current === "granted") {
      dispatchPermission("granted");
      setEnabled(true);
      return;
    }
    if (current === "denied") {
      dispatchPermission("denied");
      return;
    }
    setRequesting(true);
    try {
      const result = await requestNotificationPermission();
      dispatchPermission(result);
      if (result === "granted") setEnabled(true);
    } finally {
      setRequesting(false);
    }
  }, [setEnabled]);

  const statusLabel = !supported
    ? "Unsupported"
    : blocked
      ? "Blocked"
      : granted && prefs.enabled
        ? "Granted"
        : "Not enabled";

  return (
    <section aria-labelledby="profile-notifications">
      <h2 id="profile-notifications" className="mb-2 text-lg font-semibold tracking-tight">
        Prayer Notifications
      </h2>
      <Card>
        <p className="text-sm text-[var(--nur-text-secondary)]">
          Get a local reminder before selected prayer times.
        </p>

        <div className="mt-3 flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              granted && prefs.enabled
                ? "bg-nur-deep dark:bg-nur-gold"
                : blocked
                  ? "bg-red-500"
                  : "bg-[var(--nur-border)]"
            )}
          />
          <span className="font-medium" role="status">
            {statusLabel}
          </span>
        </div>

        {!supported ? (
          <p className="mt-2 text-sm text-[var(--nur-text-secondary)]">
            Prayer notifications aren&apos;t supported by this browser.
          </p>
        ) : blocked ? (
          <p className="mt-2 text-sm text-[var(--nur-text-secondary)]">
            Notifications are blocked in your browser. Allow notifications in
            your browser settings to enable prayer reminders.
          </p>
        ) : !granted ? (
          <div className="mt-3">
            <p className="text-sm text-[var(--nur-text-secondary)]">
              Allow notifications to enable prayer reminders.
            </p>
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={requesting}
              className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-nur-gold dark:text-nur-ink"
            >
              <BellRing className="h-4 w-4" aria-hidden />
              {requesting ? "Requesting…" : "Enable Notifications"}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={prefs.enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-[#0F5C4D]"
              />
              Enable prayer reminders
            </label>

            <fieldset disabled={!prefs.enabled} className="disabled:opacity-60">
              <legend className="mb-1.5 text-sm font-medium">Prayer reminders</legend>
              <ul className="flex flex-col gap-1">
                {REMINDER_PRAYERS.map((name) => (
                  <li key={name}>
                    <label className="inline-flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-lg px-1 text-sm">
                      <input
                        type="checkbox"
                        checked={prefs.prayers[name]}
                        onChange={(e) => setPrayerEnabled(name, e.target.checked)}
                        className="h-5 w-5 shrink-0 accent-[#0F5C4D]"
                      />
                      {name}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <div>
              <label htmlFor="reminder-offset" className="mb-1.5 block text-sm font-medium">
                Remind me
              </label>
              <select
                id="reminder-offset"
                value={prefs.offsetMinutes}
                disabled={!prefs.enabled}
                onChange={(e) => setOffsetMinutes(Number(e.target.value) as ReminderOffset)}
                className="min-h-[44px] w-full rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-3 text-sm text-[var(--nur-text)] disabled:opacity-60"
              >
                {REMINDER_OFFSETS.map((o) => (
                  <option key={o} value={o}>
                    {REMINDER_OFFSET_LABELS[o]}
                  </option>
                ))}
              </select>
            </div>

            <p className="flex items-start gap-1.5 text-xs text-[var(--nur-text-secondary)]">
              <BellOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Foreground reminders only — they don&apos;t fire when the browser
              is closed or the device is asleep.
            </p>
          </div>
        )}
      </Card>
    </section>
  );
}
