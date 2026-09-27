"use client";

import { useMemo, useState } from "react";
import { LocationGate, PrayerApiErrorCard } from "@/components/location/LocationGate";
import { CountdownTimer } from "@/components/prayer/CountdownTimer";
import { PrayerReminderSync } from "@/components/notifications/PrayerReminderSync";
import { formatNextPrayerTime } from "@/components/prayer/PrayerTime";
import {
  HijriCard,
  LocationCard,
  NextPrayerCard,
  TodaysPrayersCard,
} from "@/components/home/cards";
import { LoadingState } from "@/components/ui/states";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { usePrayerPreferences } from "@/lib/prayer/usePrayerPreferences";
import { SAMPLE_LOCATION } from "@/lib/services/prayer/config";
import { usePrayerClock } from "@/lib/services/prayer/usePrayerClock";
import { usePrayerTimes } from "@/lib/services/prayer/usePrayerTimes";

/**
 * Stage 2B — live prayer blocks on the Home dashboard.
 * Location, next prayer (+countdown), today's times and Hijri date are
 * real; `sideExtra` keeps the still-mock Continue-Quran card in place.
 */
export function HomePrayerSection({ sideExtra }: { sideExtra?: React.ReactNode }) {
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

  return (
    <>
      <PrayerReminderSync next={clock.next} timeFormat={prefs.timeFormat} />
      <LocationCard
        location={locationLabel}
        detail={`GPS · ${prayer.data.today.methodLabel}${useSample ? " · sample" : ""}`}
      />
      <NextPrayerCard
        next={clock.nextInfo}
        liveCountdown={
          <CountdownTimer
            key={clock.next.date.toISOString()}
            targetISO={clock.next.date.toISOString()}
            prayerName={clock.next.name}
            displayTime={formatNextPrayerTime(clock.next, prefs.timeFormat)}
            onElapsed={onElapsed}
          />
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TodaysPrayersCard prayers={clock.prayers} />
        <div className="flex flex-col gap-4">
          <HijriCard hijri={prayer.data.today.hijri} />
          {sideExtra}
        </div>
      </div>
    </>
  );
}
