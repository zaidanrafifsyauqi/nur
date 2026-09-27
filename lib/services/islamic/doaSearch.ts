/**
 * Stage 2E — search/filter over the INTERNAL Doa model (never raw API).
 * Pure functions shared by the UI and the logic tests.
 */
import type { Dua } from "@/lib/types";

/** Lowercase + trim + collapse whitespace + strip diacritics/modifiers. */
export function normalizeDoaText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ʿʾʼ'‘’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Case-/accent-/whitespace-tolerant match on title, translation, transliteration, category, tags. */
export function doaMatchesQuery(dua: Dua, query: string): boolean {
  const q = normalizeDoaText(query);
  if (q === "") return true;
  const haystacks = [
    dua.title,
    dua.translation,
    dua.transliteration ?? "",
    dua.category,
    ...dua.tags,
  ];
  return haystacks.some((h) => normalizeDoaText(h).includes(q));
}

export function filterDoas(duas: Dua[], query: string, category: string | null): Dua[] {
  return duas.filter(
    (d) =>
      (category == null || category === "" || d.category === category) &&
      doaMatchesQuery(d, query)
  );
}

/** Clipboard body: title + Arabic + transliteration + translation + reference. */
export function formatDoaForCopy(dua: Dua): string {
  const lines = [dua.title, "", dua.arabic];
  if (dua.transliteration && dua.transliteration.trim() !== "") {
    lines.push("", dua.transliteration);
  }
  lines.push("", dua.translation);
  if (dua.reference && dua.reference.trim() !== "") {
    lines.push("", `Ref: ${dua.reference}`);
  }
  return lines.join("\n");
}
