import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/containers";
import { DoaExplorer } from "@/components/islamic/DoaExplorer";
import { ErrorState } from "@/components/ui/states";
import { getDoaCategories, getDoas } from "@/lib/services/islamic/doa";
import { DoaApiError } from "@/lib/services/islamic/doaApi";

export const metadata: Metadata = {
  title: "Doa — NUR",
  description: "Daily supplications with Arabic text, transliteration, and Indonesian translation.",
};

/**
 * Stage 2E — server fetches + maps the full Doa collection once (cached
 * 24h); search/filter runs locally on the internal model. `?q=` and
 * `?category=` seed the initial view (validated, shareable).
 */
export default async function DuasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const initialQuery = typeof params.q === "string" ? params.q.slice(0, 100) : "";

  let duas;
  let categories: string[];
  try {
    [duas, categories] = await Promise.all([getDoas(), getDoaCategories()]);
  } catch (error) {
    const message =
      error instanceof DoaApiError
        ? "Doa couldn't be loaded. Please try again."
        : "Doa couldn't be loaded. Please try again.";
    return (
      <PageContainer className="max-w-3xl">
        <DoaPageHeader count={null} />
        <div className="mt-4">
          <ErrorState title="Doa couldn't be loaded" message={message} />
          <Link
            href="/islamic/duas"
            className="mt-3 inline-block min-h-[44px] rounded-xl border border-[var(--nur-border)] px-4 py-2.5 text-sm font-medium"
          >
            Try again
          </Link>
        </div>
      </PageContainer>
    );
  }

  const initialCategory =
    typeof params.category === "string" && categories.includes(params.category)
      ? params.category
      : null;

  return (
    <PageContainer className="max-w-3xl">
      <DoaPageHeader count={duas.length} />
      <div className="mt-4">
        <DoaExplorer
          duas={duas}
          categories={categories}
          initialQuery={initialQuery}
          initialCategory={initialCategory}
        />
      </div>
    </PageContainer>
  );
}

function DoaPageHeader({ count }: { count: number | null }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Doa</h1>
      <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
        {count == null
          ? "Daily supplications and prayers"
          : `${count} supplications · Daily supplications and prayers · EQuran.id`}
      </p>
    </div>
  );
}
