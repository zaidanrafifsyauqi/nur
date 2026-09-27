import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/containers";
import { HijriCalendar } from "@/components/islamic/HijriCalendar";
import { ErrorState } from "@/components/ui/states";
import {
  getHijriMonthView,
  getTodayReference,
  isValidHijriMonth,
  isValidHijriYear,
  shiftHijriMonth,
} from "@/lib/services/islamic/hijri";
import { HijriApiError } from "@/lib/services/islamic/hijriApi";

export const metadata: Metadata = { title: "Hijri Calendar — NUR" };

/**
 * Stage 2D — real Hijri month view. Month/year travel in the URL
 * (?month=4&year=1448, shareable, validated with fallback); browsing
 * uses SPA Link navigation. No geolocation involved.
 */
export default async function HijriPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const rawMonth = Number(params.month);
  const rawYear = Number(params.year);

  let todayRef;
  try {
    todayRef = await getTodayReference();
  } catch {
    return (
      <PageContainer>
        <HijriPageHeader subtitle="Today unavailable" />
        <div className="mt-4">
          <ErrorState
            title="Hijri calendar couldn't be loaded"
            message="Hijri calendar couldn't be loaded. Please try again."
          />
          <Link
            href="/islamic/hijri"
            className="mt-3 inline-block rounded-xl border border-[var(--nur-border)] px-4 py-2.5 text-sm font-medium"
          >
            Try again
          </Link>
        </div>
      </PageContainer>
    );
  }

  const month = isValidHijriMonth(rawMonth) ? rawMonth : todayRef.month;
  const year = isValidHijriYear(rawYear) ? rawYear : todayRef.year;

  let view;
  try {
    view = await getHijriMonthView(month, year);
  } catch (error) {
    const message =
      error instanceof HijriApiError
        ? "Hijri calendar couldn't be loaded. Please try again."
        : "Hijri calendar couldn't be loaded. Please try again.";
    return (
      <PageContainer>
        <HijriPageHeader subtitle={`Today · ${todayRef.hijri.formatted}`} />
        <div className="mt-4">
          <ErrorState title="Hijri calendar couldn't be loaded" message={message} />
          <Link
            href={`/islamic/hijri?month=${month}&year=${year}`}
            className="mt-3 inline-block rounded-xl border border-[var(--nur-border)] px-4 py-2.5 text-sm font-medium"
          >
            Try again
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <HijriPageHeader subtitle={`Today · ${todayRef.hijri.formatted}`} />
      <div className="mt-4">
        <HijriCalendar
          view={view}
          prev={shiftHijriMonth(month, year, -1)}
          next={shiftHijriMonth(month, year, 1)}
        />
      </div>
    </PageContainer>
  );
}

function HijriPageHeader({ subtitle }: { subtitle: string }) {
  return (
    <div>
      <Link
        href="/islamic"
        className="inline-flex items-center gap-1.5 rounded-lg py-2 text-sm font-medium text-[var(--nur-text-secondary)] hover:text-[var(--nur-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Islamic hub
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Hijri calendar</h1>
      <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">{subtitle}</p>
    </div>
  );
}
