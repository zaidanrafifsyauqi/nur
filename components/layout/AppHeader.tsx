"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Moon, Search, Settings, Sun } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/controls";

export function AppHeader() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--nur-border)] bg-[color-mix(in_srgb,var(--nur-background)_88%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="NUR home">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-nur-deep text-lg font-bold text-white dark:bg-nur-gold dark:text-nur-ink"
          >
            ن
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-[0.18em]">NUR</span>
            <span className="hidden text-[11px] text-[var(--nur-text-secondary)] sm:block">
              Daily &amp; travel companion
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--nur-surface-2)] text-[var(--nur-text)]"
                    : "text-[var(--nur-text-secondary)] hover:text-[var(--nur-text)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Search (mock)">
            <Search className="h-5 w-5" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notifications (mock)">
            <Bell className="h-5 w-5" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle color theme">
            {theme === "dark" ? (
              <Sun className="h-5 w-5" aria-hidden />
            ) : (
              <Moon className="h-5 w-5" aria-hidden />
            )}
          </Button>
          <Link
            href="/profile"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-nur-sand text-nur-ink dark:bg-[var(--nur-surface-2)] dark:text-[var(--nur-text)]"
            aria-label="Settings"
          >
            <Settings className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
