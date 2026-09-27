import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "gold";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        "min-h-[44px] px-4 text-sm",
        size === "sm" && "min-h-[36px] px-3 text-[13px]",
        size === "lg" && "min-h-[52px] px-6 text-base",
        size === "icon" && "min-h-[44px] min-w-[44px] px-0",
        variant === "primary" &&
          "bg-nur-deep text-white hover:bg-nur-dark dark:bg-nur-deep dark:text-white",
        variant === "gold" && "bg-nur-gold text-nur-ink hover:brightness-95",
        variant === "secondary" &&
          "border border-[var(--nur-border)] bg-[var(--nur-surface)] text-[var(--nur-text)] hover:bg-[var(--nur-surface-2)]",
        variant === "ghost" &&
          "bg-transparent text-[var(--nur-text-secondary)] hover:bg-[var(--nur-surface-2)] hover:text-[var(--nur-text)]",
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-5 shadow-[0_1px_2px_rgba(23,33,31,0.05)]",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--nur-border)] bg-[var(--nur-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--nur-text-secondary)]",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-[var(--nur-border)] bg-[var(--nur-surface)] px-4 text-sm text-[var(--nur-text)] placeholder:text-[var(--nur-text-secondary)]",
        className
      )}
      {...props}
    />
  );
}

export function Progress({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--nur-surface-2)]"
      >
        <div
          className="h-full rounded-full bg-nur-deep transition-all dark:bg-nur-gold"
          style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        />
      </div>
    </div>
  );
}
