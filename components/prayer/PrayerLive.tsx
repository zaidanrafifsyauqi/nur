"use client";

import { useMemo, useState } from "react";
import { LocationGate, PrayerApiErrorCard } from "@/components/location/LocationGate";
import { CountdownTimer } from "@/components/prayer/CountdownTimer";
import { PrayerReminderSync } from "@/components/notifications/PrayerReminderSync";
import { PrayerSettings } from "@/components/prayer/PrayerSettings";
import { formatNextPrayerTime } from "@/components/prayer/PrayerTime";
import {
  NextPrayerHero,
  PrayerList,
  PrayerTimeline,
} from "@/components/prayer/widgets";
import { LoadingState } from "@/components/ui/states";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { usePrayerPreferences } from "@/lib/prayer/usePrayerPreferences";
import { SAMPLE_LOCATION } from "@/lib/services/prayer/config";
import { usePrayerClock } from "@/lib/services/prayer/usePrayerClock";
import { usePrayerTimes } from "@/lib/services/prayer/usePrayerTimes";

/**
 * Stage 2B — live /prayer experience (Client Component boundary).
 * Server shell stays static; everything below needs geolocation + ticking.
 */
export function PrayerLive() {
  const { geo, requestLocation } = useGeolocation(true);
  const { prefs } = usePrayerPreferences();
  const [useSample, setUseSample] = useState(false);

  const coords = useMemo(
    () =>
      geo.coords ??
      (useSample ? { lat: SAMPLE_LOCATION.lat, lng: SAMPLE_LOCATION.lng } : null),
    [geo.coords, useSample]
  );
  const locationLabel = useSample ? SAMPLE_LOCATION.label : "Your current location";

  const { prayer, reloadPrayer } = usePrayerTimes(coords, {
    sampleLabel: useSample ? SAMPLE_LOCATION.label : null,
    calc: { methodId: prefs.calculationMethod, school: prefs.school },
  });
  const { clock, onElapsed } = usePrayerClock(prayer.data, reloadPrayer);

  if (geo.status !== "granted" && !useSample) {
    return (
      <LocationGate
        geo={geo}
        onRetry={requestLocation}
        onUseSample={() => setUseSample(true)}
        sampleLabel={SAMPLE_LOCATION.label}
      />
    );
  }

  if (prayer.status === "loading" || prayer.status === "idle" || !clock || !prayer.data) {
    return <LoadingState label="Loading prayer times…" />;
  }

  if (prayer.status === "error") {
    return <PrayerApiErrorCard onRetry={reloadPrayer} />;
  }

  const targetISO = clock.next.date.toISOString();
  const nextDisplay = formatNextPrayerTime(clock.next, prefs.timeFormat);

  return (
    <div className="flex flex-col gap-4">
      <PrayerReminderSync next={clock.next} timeFormat={prefs.timeFormat} />
      <NextPrayerHero
        name={clock.next.name}
        displayTime={nextDisplay}
        countdown=""
        progress={clock.nextInfo.progress}
        gregorian={prayer.data.today.gregorianDate}
        hijri={prayer.data.today.hijri.formatted}
        location={locationLabel}
        liveCountdown={
          <CountdownTimer
            key={targetISO}
            targetISO={targetISO}
            prayerName={clock.next.name}
            displayTime={nextDisplay}
            onElapsed={onElapsed}
          />
        }
      />
      <p className="rounded-xl border border-dashed border-[var(--nur-border)] bg-[var(--nur-surface-2)]/60 px-3 py-2 text-xs text-[var(--nur-text-secondary)]">
        Live · AlAdhan ({prayer.data.today.methodLabel}) · {prayer.data.today.timezone}
        {clock.nextIsTomorrow ? " · showing tomorrow's Fajr" : ""}
        {useSample ? ` · sample location (${SAMPLE_LOCATION.label})` : ""}
      </p>
      {useSample ? (
        <button
          type="button"
          onClick={() => {
            setUseSample(false);
            requestLocation();
          }}
          className="rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 py-2.5 text-sm font-medium"
        >
          Enable GPS for exact times
        </button>
      ) : null}
      <PrayerTimeline prayers={clock.prayers} />
      <PrayerList prayers={clock.prayers} />
      <PrayerSettings />
    </div>
  );
}
