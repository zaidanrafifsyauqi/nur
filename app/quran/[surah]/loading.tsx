import { PageContainer } from "@/components/layout/containers";

export default function SurahLoading() {
  return (
    <PageContainer className="max-w-3xl">
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading surah verses"
        className="flex flex-col gap-3"
      >
        <div className="rounded-3xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-6 text-center sm:p-8">
          <div className="mx-auto h-5 w-32 animate-pulse rounded-full bg-[var(--nur-surface-2)]" />
          <div className="mx-auto mt-4 h-12 w-48 animate-pulse rounded-lg bg-[var(--nur-surface-2)]" />
          <div className="mx-auto mt-3 h-6 w-40 animate-pulse rounded bg-[var(--nur-surface-2)]" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className="animate-pulse rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-5 sm:p-6"
          >
            <div className="h-4 w-full rounded bg-[var(--nur-surface-2)]" />
            <div className="mt-2 h-4 w-11/12 rounded bg-[var(--nur-surface-2)]" />
            <div className="mt-4 h-3 w-2/3 rounded bg-[var(--nur-surface-2)]" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
