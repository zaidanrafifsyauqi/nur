import Link from "next/link";
import { HomeContinueReading } from "@/components/home/HomeContinueReading";
import { Card } from "@/components/ui/controls";
import { listSurahs } from "@/lib/services/quran";

/**
 * Stage 4A real Quran entry + Stage 4B real Continue Reading.
 * One cached catalog fetch on the server; the client island decides
 * between Continue (real local position) and Explore (honest default).
 */
export async function QuranEntry() {
  let surahs = null;
  try {
    surahs = await listSurahs();
  } catch {
    surahs = null;
  }

  if (!surahs) {
    return (
      <Card className="nur-card-glow">
        <p className="text-sm text-[var(--nur-text-secondary)]">
          Quran content couldn&apos;t be loaded right now — you can still open
          the explorer.
        </p>
        <Link
          href="/quran"
          className="mt-3 inline-flex min-h-[44px] items-center rounded-xl border border-[var(--nur-border)] px-4 text-sm font-medium"
        >
          Explore all Surahs
        </Link>
      </Card>
    );
  }

  return <HomeContinueReading surahs={surahs} />;
}
