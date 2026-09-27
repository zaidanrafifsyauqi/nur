import { PageContainer } from "@/components/layout/containers";

function SurahCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse items-center gap-3 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-4"
    >
      <div className="h-10 w-10 rounded-[10px] bg-[var(--nur-surface-2)]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-[var(--nur-surface-2)]" />
        <div className="h-3 w-1/2 rounded bg-[var(--nur-surface-2)]" />
      </div>
      <div className="h-8 w-16 rounded bg-[var(--nur-surface-2)]" />
    </div>
  );
}

export default function QuranLoading() {
  return (
    <PageContainer>
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading Quran surahs"
        className="flex flex-col gap-4"
      >
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--nur-surface-2)]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[var(--nur-surface-2)]" />
        </div>
        <div className="h-11 animate-pulse rounded-xl bg-[var(--nur-surface-2)]" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, i) => (
            <SurahCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
