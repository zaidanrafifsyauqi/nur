import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { GreetingHeader } from "@/components/home/cards";
import { DailyDoa } from "@/components/home/DailyDoa";
import { HomePrayerSection } from "@/components/home/HomePrayerSection";
import { QuranEntry } from "@/components/home/QuranEntry";
import { PageContainer } from "@/components/layout/containers";
import { Card } from "@/components/ui/controls";

export const metadata: Metadata = {
  title: "NUR — Islamic & Muslim Travel Companion",
  description:
    "A modern Islamic companion for prayer times, Quran, duas, Hijri calendar, Qibla and Muslim-friendly travel.",
};

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <div className="animate-pulse rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-5">
        <div className="h-4 w-28 rounded bg-[var(--nur-surface-2)]" />
        <div className="mt-3 h-5 w-2/3 rounded bg-[var(--nur-surface-2)]" />
        <div className="mt-2 h-4 w-full rounded bg-[var(--nur-surface-2)]" />
      </div>
    </div>
  );
}

/**
 * Stage 4A — real Home dashboard. Prayer/location/Hijri live via
 * HomePrayerSection; Quran entry + daily doa via isolated server sections
 * (independent Suspense = independent loading/failure). No mock content,
 * no new APIs, no duplicate requests.
 */
export default function HomePage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        {/* A. Header / greeting context */}
        <GreetingHeader />

        {/* B + C. Islamic context + live prayer (one client boundary) */}
        <HomePrayerSection />

        {/* D. Quran entry */}
        <section aria-labelledby="home-quran">
          <div className="mb-3">
            <h2 id="home-quran" className="text-lg font-semibold tracking-tight">
              Quran
            </h2>
          </div>
          <Suspense fallback={<SectionSkeleton label="Loading Quran entry" />}>
            <QuranEntry />
          </Suspense>
        </section>

        {/* E. Daily doa */}
        <section aria-labelledby="home-doa">
          <div className="mb-3">
            <h2 id="home-doa" className="text-lg font-semibold tracking-tight">
              Daily doa
            </h2>
          </div>
          <Suspense fallback={<SectionSkeleton label="Loading daily doa" />}>
            <DailyDoa />
          </Suspense>
        </section>

        {/* F. Travel companion (navigation only — no map fetch here) */}
        <section aria-labelledby="home-travel">
          <div className="mb-3">
            <h2 id="home-travel" className="text-lg font-semibold tracking-tight">
              Muslim Travel Companion
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
              <p className="font-semibold">Mosques, halal food, Qibla and Muslim map.</p>
              <p className="text-sm text-[var(--nur-text-secondary)]">
                Explore Muslim-friendly places wherever you go.
              </p>
            </div>
            <Link
              href="/travel"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-nur-deep px-5 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
            >
              Explore Travel <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
