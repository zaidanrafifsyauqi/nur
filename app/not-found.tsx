import Link from "next/link";
import { PageContainer } from "@/components/layout/containers";
import { Card } from "@/components/ui/controls";

export default function NotFound() {
  return (
    <PageContainer className="max-w-md text-center">
      <Card className="py-10">
        <p aria-hidden className="text-4xl">☾</p>
        <h1 className="mt-2 text-xl font-bold">Page not found</h1>
        <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">
          This route isn&apos;t part of Stage 1. Let&apos;s get you back.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-nur-deep px-5 py-2.5 text-sm font-semibold text-white dark:bg-nur-gold dark:text-nur-ink"
        >
          Back home
        </Link>
      </Card>
    </PageContainer>
  );
}
