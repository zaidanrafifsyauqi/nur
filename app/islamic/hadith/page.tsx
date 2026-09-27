import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageContainer, SectionHeader } from "@/components/layout/containers";
import { HadithCard } from "@/components/islamic/HadithCard";
import { EmptyState } from "@/components/ui/states";
import { ErrorState } from "@/components/ui/states";
import {
  getHadithCollections,
  getHadithPage,
  HADITH_PAGE_SIZE,
} from "@/lib/services/islamic/hadith";
import { HadithApiError } from "@/lib/services/islamic/hadithApi";

export const metadata: Metadata = {
  title: "Hadith — NUR",
  description: "Sayings and teachings from trusted Hadith collections, with Arabic text and Indonesian translation.",
};

const DEFAULT_COLLECTION = "bukhari";

function pageHref(collection: string, page: number): string {
  return `/islamic/hadith?collection=${collection}&page=${page}`;
}

/**
 * Stage 2F — server-rendered Hadith browser. Collection + page travel in
 * the URL (validated, shareable); one page window (10 hadiths) per view.
 * No search endpoint exists in the source API — browsing by collection
 * and page only (documented, not silently faked client-side).
 */
export default async function HadithPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; page?: string }>;
}) {
  const params = await searchParams;

  let collections;
  try {
    collections = await getHadithCollections();
  } catch (error) {
    const message =
      error instanceof HadithApiError
        ? "Hadith couldn't be loaded. Please try again."
        : "Hadith couldn't be loaded. Please try again.";
    return (
      <PageContainer className="max-w-3xl">
        <HadithPageHeader />
        <div className="mt-4">
          <ErrorState title="Hadith couldn't be loaded" message={message} />
          <Link
            href="/islamic/hadith"
            className="mt-3 inline-block min-h-[44px] rounded-xl border border-[var(--nur-border)] px-4 py-2.5 text-sm font-medium"
          >
            Try again
          </Link>
        </div>
      </PageContainer>
    );
  }

  const collection =
    collections.find((c) => c.id === params.collection) ??
    collections.find((c) => c.id === DEFAULT_COLLECTION) ??
    collections[0];
  const rawPage = Number(params.page);
  const page = Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0;

  if (!collection) {
    return (
      <PageContainer className="max-w-3xl">
        <HadithPageHeader />
        <div className="mt-4">
          <EmptyState
            title="No hadith found."
            description="No Hadith collections are available right now."
          />
        </div>
      </PageContainer>
    );
  }

  let paged;
  try {
    paged = await getHadithPage(collection.id, collection.name, page, HADITH_PAGE_SIZE);
  } catch (error) {
    const message =
      error instanceof HadithApiError
        ? "Hadith couldn't be loaded. Please try again."
        : "Hadith couldn't be loaded. Please try again.";
    return (
      <PageContainer className="max-w-3xl">
        <HadithPageHeader />
        <div className="mt-4">
          <ErrorState title="Hadith couldn't be loaded" message={message} />
          <Link
            href={pageHref(collection.id, page)}
            className="mt-3 inline-block min-h-[44px] rounded-xl border border-[var(--nur-border)] px-4 py-2.5 text-sm font-medium"
          >
            Try again
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-3xl">
      <HadithPageHeader />

      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by collection"
      >
        {collections.map((c) => {
          const active = c.id === collection.id;
          return (
            <Link
              key={c.id}
              href={pageHref(c.id, 0)}
              aria-current={active ? "true" : undefined}
              className={`flex min-h-[44px] items-center rounded-full border px-3.5 py-2 text-sm font-medium ${
                active
                  ? "border-nur-deep bg-nur-deep text-white dark:border-nur-gold dark:bg-nur-gold dark:text-nur-ink"
                  : "border-[var(--nur-border)] bg-[var(--nur-surface)]"
              }`}
            >
              {c.name}
            </Link>
          );
        })}
      </div>

      <div className="mt-4">
        <SectionHeader
          title={`${collection.name} · Page ${paged.page + 1}`}
          subtitle="Arabic + Indonesian · hadith-api via jsDelivr"
        />
        {paged.hadiths.length === 0 ? (
          <EmptyState
            title="No hadith found."
            description="This page has no complete records in the source."
            action={
              <span className="mt-2 flex flex-wrap justify-center gap-2">
                {paged.page > 0 ? (
                  <Link
                    href={pageHref(collection.id, paged.page - 1)}
                    className="inline-block min-h-[44px] rounded-xl border border-[var(--nur-border)] px-4 py-2 text-sm font-medium"
                  >
                    Back
                  </Link>
                ) : null}
                <Link
                  href={pageHref(collection.id, paged.page + 1)}
                  className="inline-block min-h-[44px] rounded-xl border border-[var(--nur-border)] px-4 py-2 text-sm font-medium"
                >
                  Next page
                </Link>
                <Link
                  href={pageHref(collection.id, 0)}
                  className="inline-block min-h-[44px] rounded-xl border border-[var(--nur-border)] px-4 py-2 text-sm font-medium"
                >
                  Clear
                </Link>
              </span>
            }
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {paged.hadiths.map((h) => (
              <li key={h.id}>
                <HadithCard hadith={h} />
              </li>
            ))}
          </ul>
        )}

        <nav
          aria-label="Hadith pages"
          className="mt-4 flex items-center justify-between gap-2"
        >
          {paged.page > 0 ? (
            <Link
              href={pageHref(collection.id, paged.page - 1)}
              aria-label="Previous page"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--nur-border)] px-4 text-sm font-medium"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-[var(--nur-text-secondary)]">
            Page {paged.page + 1}
          </span>
          {paged.hasMore ? (
            <Link
              href={pageHref(collection.id, paged.page + 1)}
              aria-label="Next page"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-nur-deep px-4 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
            >
              Next <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span className="text-xs text-[var(--nur-text-secondary)]">End</span>
          )}
        </nav>
      </div>
    </PageContainer>
  );
}

function HadithPageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Hadith</h1>
      <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
        Explore sayings and teachings from trusted Hadith collections.
      </p>
    </div>
  );
}
