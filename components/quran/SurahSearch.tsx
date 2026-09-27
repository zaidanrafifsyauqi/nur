"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SectionHeader } from "@/components/layout/containers";
import { QuranSurahCard } from "@/components/quran/widgets";
import { Input } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/states";
import type { Surah } from "@/lib/types";

export function SurahSearch({ surahs }: { surahs: Surah[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.transliteratedName.toLowerCase().includes(q) ||
        s.englishName.toLowerCase().includes(q) ||
        s.arabicName.includes(query.trim()) ||
        String(s.number) === q
    );
  }, [query, surahs]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nur-text-secondary)]"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search surah — e.g. Kahf, Rahman, 112…"
          aria-label="Search surahs by number, Arabic or English name"
          className="pl-10"
        />
      </div>

      <SectionHeader
        title={`${results.length} surah${results.length === 1 ? "" : "s"}`}
        subtitle={
          query.trim() ? `Matching “${query.trim()}”` : "Arabic · Indonesian translation"
        }
      />

      {results.length === 0 ? (
        <EmptyState
          title="No surahs found"
          description="Try a different surah number, Arabic name or English name."
          action={
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-2 rounded-xl border border-[var(--nur-border)] px-4 py-2 text-sm font-medium"
            >
              Clear search
            </button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {results.map((s) => (
            <li key={s.number} className="min-w-0">
              <QuranSurahCard surah={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
