import { PageContainer } from "@/components/layout/containers";

export default function MapLoading() {
  return (
    <PageContainer className="max-w-6xl">
      <div role="status" aria-live="polite" aria-label="Loading Muslim map">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--nur-surface-2)]" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-[var(--nur-surface-2)]" />
        <div
          aria-hidden
          className="mt-4 h-[52vh] min-h-[320px] animate-pulse rounded-3xl bg-[var(--nur-surface-2)]"
        />
      </div>
    </PageContainer>
  );
}
