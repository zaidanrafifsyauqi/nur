import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/containers";
import { BookmarksList } from "@/components/quran/BookmarksList";

export const metadata: Metadata = { title: "Bookmarks — NUR Quran" };

/**
 * Stage 4B — bookmarked verses. Identifiers live in localStorage; verse
 * content loads from the real Quran service per bookmarked surah.
 */
export default function BookmarksPage() {
  return (
    <PageContainer className="max-w-3xl">
      <Link
        href="/quran"
        className="inline-flex items-center gap-1.5 rounded-lg py-2 text-sm font-medium text-[var(--nur-text-secondary)] hover:text-[var(--nur-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All surahs
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Bookmarks</h1>
      <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
        Verses you saved on this device.
      </p>
      <div className="mt-4">
        <BookmarksList />
      </div>
    </PageContainer>
  );
}
