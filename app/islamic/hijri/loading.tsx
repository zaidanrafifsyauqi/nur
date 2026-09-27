import { PageContainer } from "@/components/layout/containers";

export default function HijriLoading() {
  return (
    <PageContainer>
      <div role="status" aria-live="polite" aria-label="Loading Hijri calendar">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--nur-surface-2)]" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-[var(--nur-surface-2)]" />
        <div className="mt-4 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-5">
          <div className="flex items-center justify-between">
            <div className="h-6 w-40 animate-pulse rounded bg-[var(--nur-surface-2)]" />
            <div className="flex gap-2">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-[var(--nur-surface-2)]" />
              <div className="h-11 w-20 animate-pulse rounded-xl bg-[var(--nur-surface-2)]" />
              <div className="h-11 w-11 animate-pulse rounded-xl bg-[var(--nur-surface-2)]" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5" aria-hidden="true">
            {Array.from({ length: 35 }, (_, i) => (
              <div
                key={i}
                className="min-h-[52px] animate-pulse rounded-xl bg-[var(--nur-surface-2)]"
              />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
