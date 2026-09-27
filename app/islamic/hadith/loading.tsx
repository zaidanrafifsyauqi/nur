import { PageContainer } from "@/components/layout/containers";

export default function HadithLoading() {
  return (
    <PageContainer className="max-w-3xl">
      <div role="status" aria-live="polite" aria-label="Loading hadith">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-[var(--nur-surface-2)]" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-[var(--nur-surface-2)]" />
        <div className="mt-4 flex flex-col gap-4" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-5"
            >
              <div className="h-4 w-40 rounded bg-[var(--nur-surface-2)]" />
              <div className="mt-3 h-8 w-full rounded bg-[var(--nur-surface-2)]" />
              <div className="mt-2 h-4 w-full rounded bg-[var(--nur-surface-2)]" />
              <div className="mt-2 h-4 w-5/6 rounded bg-[var(--nur-surface-2)]" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
