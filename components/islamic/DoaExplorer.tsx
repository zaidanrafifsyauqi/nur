"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SectionHeader } from "@/components/layout/containers";
import { Input } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/states";
import { DoaCard } from "./DoaCard";
import { filterDoas } from "@/lib/services/islamic/doaSearch";
import type { Dua } from "@/lib/types";

/**
 * Stage 2E — search + category filter over the server-fetched collection.
 * Initial values come from the URL (?q=&category=, validated server-side);
 * typing filters locally with zero additional API requests.
 */
export function DoaExplorer({
  duas,
  categories,
  initialQuery,
  initialCategory,
}: {
  duas: Dua[];
  categories: string[];
  initialQuery: string;
  initialCategory: string | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | null>(initialCategory);

  const results = useMemo(
    () => filterDoas(duas, query, category),
    [duas, query, category]
  );

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
          placeholder="Search doa — e.g. tidur, makan, safar…"
          aria-label="Search doa by title, translation, or tags"
          className="pl-10"
          type="search"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button
          type="button"
          onClick={() => setCategory(null)}
          aria-pressed={category === null}
          className={`min-h-[44px] rounded-full border px-3.5 py-2 text-sm font-medium ${
            category === null
              ? "border-nur-deep bg-nur-deep text-white dark:border-nur-gold dark:bg-nur-gold dark:text-nur-ink"
              : "border-[var(--nur-border)] bg-[var(--nur-surface)]"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? null : c)}
            aria-pressed={category === c}
            className={`min-h-[44px] rounded-full border px-3.5 py-2 text-sm font-medium ${
              category === c
                ? "border-nur-deep bg-nur-deep text-white dark:border-nur-gold dark:bg-nur-gold dark:text-nur-ink"
                : "border-[var(--nur-border)] bg-[var(--nur-surface)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <SectionHeader
        title={`${results.length} doa`}
        subtitle={
          category ?? (query.trim() !== "" ? `Matching “${query.trim()}”` : "Full collection")
        }
      />

      {results.length === 0 ? (
        <EmptyState
          title="No doa found."
          description="Try a different keyword or category."
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(null);
              }}
              className="mt-2 min-h-[44px] rounded-xl border border-[var(--nur-border)] px-4 py-2 text-sm font-medium"
            >
              Clear search
            </button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {results.map((d) => (
            <li key={d.id}>
              <DoaCard dua={d} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
