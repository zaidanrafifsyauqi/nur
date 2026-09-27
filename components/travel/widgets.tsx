"use client";

import Link from "next/link";
import { Clock, MapPin, Navigation, Star, UtensilsCrossed } from "lucide-react";
import type { Place } from "@/lib/types";
import { Badge, Card } from "@/components/ui/controls";

export function MapPlaceholder({
  title = "Map preview (mock)",
  subtitle = "Real map integration lands in Stage 2. This placeholder reserves layout, states and touch targets.",
  heightClass = "h-72 sm:h-96",
}: {
  title?: string;
  subtitle?: string;
  heightClass?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${title}. ${subtitle}`}
      className={`relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border border-[var(--nur-border)] bg-[var(--nur-surface-2)] px-6 text-center ${heightClass}`}
    >
      {/* stylized grid, no heavy imagery */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(var(--nur-border) 1px, transparent 1px), linear-gradient(90deg, var(--nur-border) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-nur-deep text-white dark:bg-nur-gold dark:text-nur-ink">
        <MapPin className="h-6 w-6" aria-hidden />
      </span>
      <p className="relative font-semibold">{title}</p>
      <p className="relative max-w-md text-sm text-[var(--nur-text-secondary)]">{subtitle}</p>
      <div className="relative mt-1 flex gap-2">
        <Badge>mosques</Badge>
        <Badge>halal food</Badge>
        <Badge>qibla</Badge>
      </div>
    </div>
  );
}

export function PlaceCard({ place }: { place: Place }) {
  const Icon = place.category === "halal-food" ? UtensilsCrossed : MapPin;
  return (
    <Card className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nur-surface-2)]">
        <Icon className="h-5 w-5 text-nur-deep dark:text-nur-gold" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{place.name}</p>
        <p className="truncate text-xs text-[var(--nur-text-secondary)]">{place.address}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 font-medium">
            <Star className="h-3.5 w-3.5 fill-nur-gold text-nur-gold" aria-hidden />
            {place.rating?.toFixed(1) ?? "–"}
          </span>
          <span className="text-[var(--nur-text-secondary)]">· {place.distance}</span>
          {place.openNow !== undefined ? (
            <Badge>{place.openNow ? "Open now" : "Closed"}</Badge>
          ) : null}
        </div>
      </div>
      <Link
        href="/travel/map"
        aria-label={`View ${place.name} on map (mock)`}
        className="shrink-0 rounded-lg p-2 text-nur-deep hover:bg-[var(--nur-surface-2)] dark:text-nur-gold"
      >
        <Navigation className="h-4 w-4" aria-hidden />
      </Link>
    </Card>
  );
}

export function TravelSearchMock() {
  return (
    <form
      role="search"
      aria-label="Search destinations (mock)"
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <label htmlFor="travel-search" className="sr-only">
        Search destination
      </label>
      <input
        id="travel-search"
        type="search"
        placeholder="Search destination — e.g. Istanbul, Makkah…"
        className="h-12 flex-1 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 text-sm placeholder:text-[var(--nur-text-secondary)]"
      />
      <button
        type="submit"
        className="h-12 shrink-0 rounded-2xl bg-nur-deep px-6 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
      >
        Search
      </button>
    </form>
  );
}

export function PrayerTimesStrip() {
  const items = [
    { n: "Fajr", t: "4:38 AM" },
    { n: "Dhuhr", t: "11:52 AM" },
    { n: "Asr", t: "3:08 PM" },
    { n: "Maghrib", t: "5:55 PM" },
    { n: "Isha", t: "7:06 PM" },
  ];
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Clock className="h-4 w-4" aria-hidden /> Prayer times here (mock)
      </p>
      <ul className="mt-2 divide-y divide-[var(--nur-border)] text-sm">
        {items.map((i) => (
          <li key={i.n} className="flex py-1.5">
            <span>{i.n}</span>
            <span className="ml-auto font-mono text-[var(--nur-text-secondary)]">{i.t}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
