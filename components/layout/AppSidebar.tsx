"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Sidebar"
      className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto py-6 pr-2 lg:flex"
    >
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-nur-deep text-white dark:bg-[var(--nur-surface-2)] dark:text-[var(--nur-text)]"
                : "text-[var(--nur-text-secondary)] hover:bg-[var(--nur-surface-2)] hover:text-[var(--nur-text)]"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-6 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-4 text-xs leading-relaxed text-[var(--nur-text-secondary)]">
        <p className="font-semibold text-[var(--nur-text)]">Quran & Prayer · Live</p>
        <p className="mt-1">
          Quran via Al Quran Cloud; prayer times via GPS + AlAdhan. Travel remains mock.
        </p>
      </div>
    </aside>
  );
}
