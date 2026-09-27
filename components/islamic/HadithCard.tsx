import { Badge, Card } from "@/components/ui/controls";
import { CopyHadithButton } from "./CopyHadithButton";
import type { Hadith } from "@/lib/types";

/**
 * Stage 2F — focused Hadith card (server-rendered; only copy is a client
 * island). Hadith text, translation, source reference and grading are kept
 * visually distinct; grading appears ONLY when the source supplies it.
 */
export function HadithCard({ hadith }: { hadith: Hadith }) {
  return (
    <article aria-label={`Hadith ${hadith.collectionName} number ${hadith.hadithNumber}`}>
      <Card>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{hadith.collectionName}</Badge>
          <Badge>No. {hadith.hadithNumber}</Badge>
          {hadith.grading ? (
            <Badge className="border-nur-gold">{hadith.grading}</Badge>
          ) : null}
        </div>

        {hadith.bookName ? (
          <h3 className="mt-2.5 text-base font-bold tracking-tight">
            Book {hadith.bookNumber}: {hadith.bookName}
          </h3>
        ) : null}

        {hadith.arabic ? (
          <p dir="rtl" lang="ar" className="font-arabic mt-3 text-right text-[22px] leading-[2.1]">
            {hadith.arabic}
          </p>
        ) : null}

        <p className="mt-2 text-[15px] leading-relaxed">“{hadith.translation}”</p>

        {hadith.reference ? (
          <p className="mt-2 text-xs text-[var(--nur-text-secondary)]">
            {hadith.reference}
          </p>
        ) : null}

        <div className="mt-3">
          <CopyHadithButton hadith={hadith} />
        </div>
      </Card>
    </article>
  );
}
