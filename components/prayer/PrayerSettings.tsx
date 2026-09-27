"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/controls";
import { usePrayerPreferences } from "@/lib/prayer/usePrayerPreferences";
import {
  PRAYER_METHODS,
  type AsrSchool,
} from "@/lib/services/prayer/methods";
import type { PrayerTimeFormat } from "@/lib/services/prayer/timeFormat";

/**
 * Stage 4C — compact Prayer Settings (lives on /prayer only; Stage 4D
 * owns Profile). Calculation changes refetch via the shared cache;
 * format changes are presentation-only. Everything 44px+, labeled,
 * keyboard-operable, dark-mode safe.
 */
export function PrayerSettings() {
  const { prefs, updatePreferences, resetPreferences } = usePrayerPreferences();

  return (
    <section aria-labelledby="prayer-settings-heading">
      <Card>
        <h2 id="prayer-settings-heading" className="text-base font-semibold">
          Prayer Settings
        </h2>
      <p className="mt-0.5 text-xs text-[var(--nur-text-secondary)]">
        Saved on this device only.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <label
            htmlFor="prayer-method"
            className="mb-1.5 block text-sm font-medium"
          >
            Calculation Method
          </label>
          <select
            id="prayer-method"
            value={prefs.calculationMethod}
            onChange={(e) => updatePreferences({ calculationMethod: Number(e.target.value) })}
            className="min-h-[44px] w-full rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-3 text-sm text-[var(--nur-text)]"
          >
            {PRAYER_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="prayer-school"
            className="mb-1.5 block text-sm font-medium"
          >
            Madhab / Asr Calculation
          </label>
          <select
            id="prayer-school"
            value={prefs.school}
            onChange={(e) => updatePreferences({ school: e.target.value as AsrSchool })}
            className="min-h-[44px] w-full rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-3 text-sm text-[var(--nur-text)]"
          >
            <option value="STANDARD">Shafi, Maliki, Hanbali (Standard)</option>
            <option value="HANAFI">Hanafi</option>
          </select>
          <p className="mt-1 text-xs text-[var(--nur-text-secondary)]">
            Determines when Asr begins.
          </p>
        </div>

        <div>
          <span id="time-format-label" className="mb-1.5 block text-sm font-medium">
            Time Format
          </span>
          <div role="group" aria-labelledby="time-format-label" className="flex gap-2">
            {(["24h", "12h"] as PrayerTimeFormat[]).map((f) => {
              const active = prefs.timeFormat === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => updatePreferences({ timeFormat: f })}
                  aria-pressed={active}
                  className={`min-h-[44px] flex-1 rounded-xl border px-4 text-sm font-medium transition-colors ${
                    active
                      ? "border-nur-deep bg-nur-deep text-white dark:border-nur-gold dark:bg-nur-gold dark:text-nur-ink"
                      : "border-[var(--nur-border)] bg-[var(--nur-surface)] text-[var(--nur-text)]"
                  }`}
                >
                  {f === "24h" ? "24-hour" : "12-hour"}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={resetPreferences}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--nur-border)] px-4 text-sm font-medium text-[var(--nur-text-secondary)] transition-colors hover:text-[var(--nur-text)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset to default
        </button>
        <Link
          href="/profile"
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-medium text-nur-deep dark:text-nur-gold"
        >
          Manage prayer notifications
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      </Card>
    </section>
  );
}
