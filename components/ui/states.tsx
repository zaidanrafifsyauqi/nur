"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/controls";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Card
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 text-sm text-[var(--nur-text-secondary)]"
    >
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label} (architecture ready — mock data, no spinners in production paths)</span>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--nur-surface-2)]">
        <Inbox className="h-5 w-5 text-[var(--nur-text-secondary)]" aria-hidden />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-[var(--nur-text-secondary)]">{description}</p>
      ) : null}
      {action}
    </Card>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again later.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card role="alert" className="flex flex-col items-start gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4 text-nur-gold" aria-hidden />
        {title}
      </span>
      <p className="text-sm text-[var(--nur-text-secondary)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg border border-[var(--nur-border)] px-3 py-2 text-sm font-medium"
        >
          Try again
        </button>
      ) : null}
    </Card>
  );
}
