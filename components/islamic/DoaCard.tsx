import { Badge, Card } from "@/components/ui/controls";
import { CopyDoaButton } from "./CopyDoaButton";
import type { Dua } from "@/lib/types";

/**
 * Stage 2E — focused Doa card (server-rendered; only the copy action is
 * a client island). Arabic stays RTL with the existing Arabic font;
 * Latin + Indonesian remain LTR.
 */
export function DoaCard({ dua }: { dua: Dua }) {
  return (
    <article aria-label={`Doa: ${dua.title}`}>
      <Card>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{dua.category}</Badge>
        {dua.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-[var(--nur-surface-2)] px-2.5 py-1 text-xs text-[var(--nur-text-secondary)]"
          >
            {t}
          </span>
        ))}
      </div>

      <h3 className="mt-2.5 text-base font-bold tracking-tight">{dua.title}</h3>

      <p dir="rtl" lang="ar" className="font-arabic mt-3 text-right text-[22px] leading-[2.1]">
        {dua.arabic}
      </p>

      {dua.transliteration ? (
        <p lang="id" className="mt-2 break-words text-sm italic leading-relaxed text-[var(--nur-text-secondary)]">
          {dua.transliteration}
        </p>
      ) : null}

      <p className="mt-2 break-words text-[15px] leading-relaxed">{dua.translation}</p>

      {dua.reference ? (
        <p className="mt-3 break-words whitespace-pre-line border-l-2 border-nur-gold pl-3 text-xs leading-relaxed text-[var(--nur-text-secondary)]">
          {dua.reference}
        </p>
      ) : null}

      <div className="mt-3">
        <CopyDoaButton dua={dua} />
      </div>
      </Card>
    </article>
  );
}
