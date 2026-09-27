/**
 * Stage 2E — maps EQuran.id Doa records to NUR internal types.
 *
 * Data flow: API → DoaApiItem → mapper → Doa (lib/types.ts) → UI.
 * Religious text is preserved exactly (trimmed only) — never rewritten,
 * paraphrased, or enhanced. Raw API objects never reach components.
 */
import type { Dua } from "@/lib/types";
import type { DoaApiItem } from "./doaApi";

function clean(value: string): string {
  return value.trim();
}

function cleanList(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (t !== "" && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export function mapDoaItemToDua(item: DoaApiItem): Dua {
  const reference = clean(item.tentang);
  return {
    id: String(item.id),
    title: clean(item.nama),
    arabic: clean(item.ar),
    transliteration: clean(item.tr),
    translation: clean(item.idn),
    reference: reference === "" ? undefined : reference,
    category: clean(item.grup),
    tags: cleanList(item.tag),
  };
}
