"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellOff,
  Info,
  MapPin,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { PrayerSettings } from "@/components/prayer/PrayerSettings";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { Card } from "@/components/ui/controls";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { usePrayerPreferences } from "@/lib/prayer/usePrayerPreferences";
import { useTheme } from "@/components/providers/theme-provider";
import { methodShortLabel } from "@/lib/services/prayer/methods";
import { version as appVersion } from "@/package.json";
import { cn } from "@/lib/utils";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-2 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <Section id="profile-appearance" title="Appearance">
      <Card>
        <div role="group" aria-label="Color theme" className="flex gap-2">
          {(
            [
              { value: "light", label: "Light", Icon: Sun },
              { value: "dark", label: "Dark", Icon: Moon },
            ] as const
          ).map(({ value, label, Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-medium transition-colors",
                  active
                    ? "border-nur-deep bg-nur-deep text-white dark:border-nur-gold dark:bg-nur-gold dark:text-nur-ink"
                    : "border-[var(--nur-border)] bg-[var(--nur-surface)] text-[var(--nur-text)]"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--nur-text-secondary)]">
          Applies instantly on this device. System preference is used until you
          choose.
        </p>
      </Card>
    </Section>
  );
}

function PrayerSection() {
  const { prefs } = usePrayerPreferences();
  const [editing, setEditing] = useState(false);
  return (
    <Section id="profile-prayer" title="Prayer">
      <Card>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--nur-text-secondary)]">Calculation Method</dt>
            <dd className="text-right font-medium">{methodShortLabel(prefs.calculationMethod)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--nur-text-secondary)]">Madhab</dt>
            <dd className="text-right font-medium">
              {prefs.school === "STANDARD" ? "Shafi / Standard" : "Hanafi"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--nur-text-secondary)]">Time Format</dt>
            <dd className="text-right font-medium">
              {prefs.timeFormat === "24h" ? "24-hour" : "12-hour"}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-expanded={editing}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--nur-border)] px-4 text-sm font-medium"
        >
          {editing ? "Hide Prayer Settings" : "Edit Prayer Settings"}
          <ArrowRight className={cn("h-4 w-4 transition-transform", editing && "rotate-90")} aria-hidden />
        </button>
        {editing ? (
          <div className="mt-3">
            <PrayerSettings />
          </div>
        ) : null}
      </Card>
    </Section>
  );
}

function LocationSection() {
  // Never auto-request: idle until the user taps enable.
  const { geo, requestLocation } = useGeolocation(false);
  return (
    <Section id="profile-location" title="Location">
      <Card className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nur-surface-2)] text-[var(--nur-text-secondary)]">
          <MapPin className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          {geo.status === "granted" ? (
            <p className="text-sm font-semibold">Location access is enabled.</p>
          ) : geo.status === "denied" ? (
            <p className="text-sm font-semibold">Location access is currently denied.</p>
          ) : geo.status === "requesting" ? (
            <p className="text-sm font-semibold">Getting your location…</p>
          ) : geo.status === "unavailable" || geo.status === "error" ? (
            <p className="text-sm font-semibold">
              {geo.message ?? "Location is unavailable on this device."}
            </p>
          ) : (
            <p className="text-sm font-semibold">
              Location permission has not been requested yet.
            </p>
          )}
          <p className="text-xs text-[var(--nur-text-secondary)]">
            Used for prayer times, Qibla and nearby places. Coordinates are
            never stored.
          </p>
        </div>
        {geo.status !== "granted" && geo.status !== "requesting" ? (
          <button
            type="button"
            onClick={requestLocation}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
          >
            Try again
          </button>
        ) : null}
      </Card>
    </Section>
  );
}

function PrivacySection() {
  return (
    <Section id="profile-privacy" title="Privacy">
      <Card>
        <ul className="flex flex-col gap-2 text-sm leading-relaxed">
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-nur-deep dark:text-nur-gold" aria-hidden />
            Prayer preferences are stored locally on this device.
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-nur-deep dark:text-nur-gold" aria-hidden />
            Quran bookmarks and reading progress are stored locally.
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-nur-deep dark:text-nur-gold" aria-hidden />
            Location coordinates are used for location-based features but are
            not stored as profile data.
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-nur-deep dark:text-nur-gold" aria-hidden />
            Prayer data is not stored as profile data.
          </li>
          <li className="flex gap-2">
            <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-nur-deep dark:text-nur-gold" aria-hidden />
            NUR does not require an account in the current version.
          </li>
        </ul>
      </Card>
    </Section>
  );
}

function ResetSection() {
  const { resetPreferences } = usePrayerPreferences();
  const { setTheme } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const doReset = () => {
    // Scoped reset only: prayer prefs + light theme. Quran bookmarks and
    // reading progress are user content and are NEVER touched here —
    // no blanket storage wipe anywhere in this flow.
    resetPreferences();
    setTheme("light");
    setConfirming(false);
    setDone(true);
  };

  return (
    <Section id="profile-reset" title="Reset Preferences">
      <Card>
        {!confirming ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-[var(--nur-text-secondary)]">
              Restore NUR&apos;s local preferences to their defaults. Bookmarks
              and reading history are kept.
            </p>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setConfirming(true);
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--nur-border)] px-4 text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset Preferences
            </button>
            {done ? (
              <p role="status" className="text-xs text-[var(--nur-text-secondary)]">
                Preferences restored to defaults.
              </p>
            ) : null}
          </div>
        ) : (
          <div role="group" aria-labelledby="reset-confirm-title">
            <p id="reset-confirm-title" className="text-sm font-semibold">
              Reset all preferences?
            </p>
            <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
              This will restore your local NUR settings to their default
              values.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-[var(--nur-border)] px-4 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doReset}
                className="inline-flex min-h-[44px] items-center rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </Card>
    </Section>
  );
}

function AboutSection() {
  const features = [
    "Prayer Times",
    "Quran",
    "Doa",
    "Hadith",
    "Hijri Calendar",
    "Qibla",
    "Muslim Map",
    "Muslim-friendly places",
  ];
  return (
    <Section id="profile-about" title="About NUR">
      <Card>
        <p className="flex items-center gap-2 font-bold">
          <Info className="h-4 w-4 text-nur-deep dark:text-nur-gold" aria-hidden />
          NUR
        </p>
        <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
          Your daily Islamic &amp; Muslim travel companion.
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {features.map((f) => (
            <li
              key={f}
              className="rounded-full bg-[var(--nur-surface-2)] px-2.5 py-1 text-[var(--nur-text-secondary)]"
            >
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[var(--nur-text-secondary)]">
          Version {appVersion} · Anonymous local-first build
        </p>
        <Link
          href="/travel"
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-nur-deep dark:text-nur-gold"
        >
          Explore Travel <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Card>
    </Section>
  );
}

/**
 * Stage 4D — Profile content island. Single client boundary composing
 * existing single-source-of-truth states only (theme, prayer prefs,
 * geolocation, Quran untouched). No fetching, no new APIs.
 */
export function ProfileSettings() {
  return (
    <div className="flex flex-col gap-5">
      <AppearanceSection />
      <PrayerSection />
      <NotificationSettings />
      <LocationSection />
      <PrivacySection />
      <ResetSection />
      <AboutSection />
    </div>
  );
}
