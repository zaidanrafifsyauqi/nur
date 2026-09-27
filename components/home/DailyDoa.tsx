import { DuaCard } from "@/components/home/cards";
import { Card } from "@/components/ui/controls";
import { getDailyDoa } from "@/lib/services/islamic/doa";

/**
 * Stage 4A — one deterministic daily doa (server). Failure is isolated:
 * only this section degrades; prayer/Quran/travel keep working.
 */
export async function DailyDoa() {
  let dua;
  try {
    dua = await getDailyDoa();
  } catch {
    return (
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--nur-text-secondary)]">
          Daily doa
        </p>
        <p className="mt-2 text-sm text-[var(--nur-text-secondary)]">
          Today&apos;s doa couldn&apos;t be loaded. You can still browse the full
          library.
        </p>
        <a
          href="/islamic/duas"
          className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-nur-deep dark:text-nur-gold"
        >
          Lihat semua doa
        </a>
      </Card>
    );
  }
  return <DuaCard dua={dua} />;
}
