import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, History } from "lucide-react";
import { PageContainer } from "@/components/layout/containers";
import { SurahSearch } from "@/components/quran/SurahSearch";
import { ErrorState } from "@/components/ui/states";
import { listSurahs } from "@/lib/services/quran";

export const metadata: Metadata = {
  title: "Quran Explorer — NUR",
  description:
    "Browse all 114 surahs with Arabic text and Indonesian translation.",
};

export default async function QuranPage() {
  let surahs;
  try {
    surahs = await listSurahs();
  } catch {
    return (
      <PageContainer>
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quran Explorer</h1>
            <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
              Arabic · Indonesian translation
            </p>
          </div>
          <ErrorState
            title="Quran data couldn't be loaded"
            message="Quran data couldn't be loaded. Please try again."
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quran Explorer</h1>
          <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
            All {surahs.length} surahs · Arabic &amp; Indonesian translation
          </p>
          <nav aria-label="Quran library" className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/quran/bookmarks"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 text-sm font-medium"
            >
              <Bookmark className="h-4 w-4" aria-hidden /> Bookmarks
            </Link>
            <Link
              href="/quran/last-reading"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 text-sm font-medium"
            >
              <History className="h-4 w-4" aria-hidden /> Last Reading
            </Link>
          </nav>
        </div>
        <SurahSearch surahs={surahs} />
      </div>
    </PageContainer>
  );
}
