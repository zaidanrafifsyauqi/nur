import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";
import { PageContainer } from "@/components/layout/containers";
import { OfflineRetryButton } from "@/components/system/OfflineRetryButton";
import { Card } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Offline — NUR" };

/**
 * Stage 5C — offline fallback page (static, zero data fetching).
 * Pre-cached by the service worker on install; honest copy only —
 * no fake prayer times, places, or Quran content.
 */
export default function OfflinePage() {
  return (
    <PageContainer className="max-w-md">
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nur-surface-2)]">
          <CloudOff className="h-6 w-6 text-[var(--nur-text-secondary)]" aria-hidden />
        </span>
        <h1 className="text-xl font-bold tracking-tight">You&apos;re offline</h1>
        <p className="max-w-xs text-sm text-[var(--nur-text-secondary)]">
          Some NUR features need an internet connection. Anything you saved
          on this device — bookmarks, reading progress, and preferences — is
          still here.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <OfflineRetryButton />
          <Link
            href="/nur-ai"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-[var(--nur-border)] px-5 text-sm font-medium"
          >
            NUR AI
          </Link>
        </div>
      </Card>
    </PageContainer>
  );
}
