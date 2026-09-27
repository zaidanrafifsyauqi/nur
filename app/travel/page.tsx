import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { PageContainer } from "@/components/layout/containers";
import { TravelLocationStatus } from "@/components/travel/TravelLocationStatus";
import { Card } from "@/components/ui/controls";
import {
  TRAVEL_FEATURES,
  TRAVEL_QUICK_ACTIONS,
} from "@/lib/services/travel/travelHub";

export const metadata: Metadata = { title: "Muslim Travel — NUR" };

/**
 * Stage 3D — Travel Hub. Links-only integration over existing routes:
 * no MapLibre instance, no compass, no prayer fetch, no Overpass calls,
 * no new APIs. Each section stands alone so one unavailable service
 * never breaks the hub.
 */
export default function TravelPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        {/* Hero */}
        <section
          aria-labelledby="travel-hero"
          className="nur-card-glow rounded-3xl bg-nur-deep p-6 text-white sm:p-10 dark:bg-[var(--nur-surface)] dark:text-[var(--nur-text)] dark:border dark:border-[var(--nur-border)]"
        >
          <p className="text-xs font-medium uppercase tracking-[0.18em] opacity-70">
            Muslim Travel
          </p>
          <h1
            id="travel-hero"
            className="mt-2 max-w-md text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Your Muslim travel companion
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed opacity-80 sm:text-base">
            Find nearby places, check prayer times, and stay oriented wherever
            you go.
          </p>
        </section>

        {/* Location status (own island; hub stays usable without it) */}
        <TravelLocationStatus />

        {/* Quick actions — horizontal scroll on mobile */}
        <nav aria-label="Travel quick actions">
          <div className="no-scrollbar -mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {TRAVEL_QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.id}
                  href={a.href}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--nur-surface-2)]"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {a.shortLabel}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Travel Essentials */}
        <section aria-labelledby="travel-essentials">
          <div className="mb-4">
            <h2 id="travel-essentials" className="text-lg font-semibold tracking-tight">
              Travel Essentials
            </h2>
            <p className="mt-0.5 text-sm text-[var(--nur-text-secondary)]">
              Map, Qibla and prayer — each opens its own page
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRAVEL_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.id}>
                  <Link
                    href={f.href}
                    aria-label={`${f.title}: ${f.description}`}
                    className="group flex h-full min-h-[44px] items-start gap-3 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-5 transition-colors hover:bg-[var(--nur-surface-2)]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-nur-deep/10 text-nur-deep dark:bg-nur-gold/15 dark:text-nur-gold">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-semibold group-hover:underline">
                        {f.title}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="mt-0.5 block text-sm text-[var(--nur-text-secondary)]">
                        {f.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Nearby preview — deliberately fetch-free (see §5/§7 of the stage) */}
        <section aria-labelledby="nearby-preview">
          <div className="mb-4">
            <h2 id="nearby-preview" className="text-lg font-semibold tracking-tight">
              Nearby places
            </h2>
          </div>
          <Card className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--nur-surface-2)] text-nur-deep dark:text-nur-gold"
            >
              <MapPin className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Explore nearby Muslim-friendly places.</p>
              <p className="text-sm text-[var(--nur-text-secondary)]">
                Mosques, Islamic centers and halal food on a live map.
              </p>
            </div>
            <Link
              href="/travel/map"
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl bg-nur-deep px-5 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
            >
              Open Muslim Map
            </Link>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
