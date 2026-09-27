import Link from "next/link";
import { ArrowRight, BookMarked, CalendarDays, HeartHandshake, Sparkles } from "lucide-react";
import type { Dhikr, Dua } from "@/lib/types";
import { Badge, Card } from "@/components/ui/controls";

export const ISLAMIC_CARDS = [
  {
    href: "/islamic/duas",
    title: "Duas",
    desc: "Daily supplications for every moment",
    icon: HeartHandshake,
  },
  {
    href: "/islamic/hadith",
    title: "Hadith",
    desc: "Prophetic wisdom, curated excerpts",
    icon: BookMarked,
  },
  {
    href: "/islamic/hijri",
    title: "Hijri Calendar",
    desc: "Sacred dates at a glance",
    icon: CalendarDays,
  },
  {
    href: "/islamic#dhikr",
    title: "Dhikr",
    desc: "Morning & evening remembrance",
    icon: Sparkles,
  },
];

export function IslamicHubGrid() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {ISLAMIC_CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <li key={c.title}>
            <Link
              href={c.href}
              className="flex h-full items-start gap-3 rounded-2xl border border-[var(--nur-border)] bg-[var(--nur-surface)] p-5 transition-colors hover:bg-[var(--nur-surface-2)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-nur-deep/10 text-nur-deep dark:bg-nur-gold/15 dark:text-nur-gold">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="flex items-center gap-1 font-semibold">
                  {c.title} <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
                <span className="mt-0.5 block text-sm text-[var(--nur-text-secondary)]">
                  {c.desc}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DuaListCard({ dua }: { dua: Dua }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <Badge>{dua.category}</Badge>
        {dua.source ? (
          <span className="text-xs text-[var(--nur-text-secondary)]">{dua.source}</span>
        ) : null}
      </div>
      <h3 className="mt-2 font-semibold">{dua.title}</h3>
      <p dir="rtl" lang="ar" className="font-arabic mt-2 text-right text-xl leading-loose">
        {dua.arabic}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--nur-text-secondary)]">
        {dua.translation}
      </p>
    </Card>
  );
}

export function DhikrCard({ dhikr }: { dhikr: Dhikr }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <p dir="rtl" lang="ar" className="font-arabic text-right text-2xl">
          {dhikr.arabic}
        </p>
        <p className="mt-1 text-sm text-[var(--nur-text-secondary)]">{dhikr.translation}</p>
      </div>
      <span
        aria-label={`Repeat ${dhikr.repeat} times`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-nur-gold text-sm font-bold text-nur-deep dark:text-nur-gold"
      >
        ×{dhikr.repeat}
      </span>
    </Card>
  );
}
