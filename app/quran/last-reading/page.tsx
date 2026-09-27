import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/containers";
import { LastReadingCard } from "@/components/quran/LastReadingCard";
import { ErrorState } from "@/components/ui/states";
import { listSurahs } from "@/lib/services/quran";

export const metadata: Metadata = { title: "Last Reading — NUR Quran" };

/**
 * Stage 4B — last reading position (local) resolved against real cached
 * Surah metadata. No verse fetch needed here.
 */
export default async function LastReadingPage() {
  let surahs = null;
  try {
    surahs = await listSurahs();
  } catch {
    surahs = null;
  }

  return (
    <PageContainer className="max-w-3xl">
      <Link
        href="/quran"
        className="inline-flex items-center gap-1.5 rounded-lg py-2 text-sm font-medium text-[var(--nur-text-secondary)] hover:text-[var(--nur-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All surahs
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Last Reading</h1>
      <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
        Your reading position on this device.
      </p>
      <div className="mt-4">
        {surahs ? (
          <LastReadingCard surahs={surahs} />
        ) : (
          <ErrorState
            title="Quran data couldn't be loaded"
            message="Quran data couldn't be loaded. Please try again."
          />
        )}
      </div>
    </PageContainer>
  );
}
