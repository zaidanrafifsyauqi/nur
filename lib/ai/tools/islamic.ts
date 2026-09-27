/**
 * Stage NUR AI — Islamic tools (Doa, Hadith, Hijri). Reuse existing services.
 */

import { getDoas } from "@/lib/services/islamic/doa";
import { getHadithCollections, getHadithPage } from "@/lib/services/islamic/hadith";
import { getTodayHijri } from "@/lib/services/islamic/hijri";

export async function getDoaContext(query: string): Promise<string | null> {
  const q = query.toLowerCase();
  if (!/doa|dua|prayer.*travel|safar|sleep|tidur|makan/i.test(q)) return null;
  try {
    const duas = await getDoas();
    // Simple keyword match for travel-related doa
    let matched = duas.find((d) => /safar|travel|perjalanan/i.test(d.title + " " + d.category));
    if (/travel|safar|perjalanan/i.test(q)) {
      matched = duas.find((d) => /safar|travel|perjalanan/i.test(d.title + " " + d.category)) ?? matched;
    } else {
      // Fallback: first doa containing query word
      const word = q.split(/\s+/).find((w) => w.length > 3);
      if (word) matched = duas.find((d) => d.title.toLowerCase().includes(word)) ?? matched;
    }
    if (matched) {
      return `[Doa — verified from EQuran.id]
Title: ${matched.title}
Arabic: ${matched.arabic}
Transliteration: ${matched.transliteration ?? "-"}
Translation: ${matched.translation}
Category: ${matched.category}
${matched.reference ? `Reference: ${matched.reference}` : ""}`.trim();
    }
    return `[Doa — NUR has ${duas.length} verified supplications. No exact match for this query; offer general guidance labeled as such.]`;
  } catch {
    return null;
  }
}

export async function getHadithContext(query: string): Promise<string | null> {
  const q = query.toLowerCase();
  if (!/hadith|hadis|hadist|sunnah|narrator|bukhari|muslim/i.test(q)) return null;
  try {
    const collections = await getHadithCollections();
    const bukhari = collections.find((c) => c.id === "bukhari");
    if (!bukhari) return null;
    // Fetch first page as sample verified hadith
    const page = await getHadithPage(bukhari.id, bukhari.name, 0, 1);
    const h = page.hadiths[0];
    if (!h) return null;
    return `[Hadith — verified via hadith-api (Fawaz Ahmed)]
Collection: ${h.collectionName}
Book: ${h.bookName ?? "-"} No. ${h.hadithNumber}
Arabic: ${h.arabic ?? "-"}
Translation: ${h.translation}
${h.grading ? `Grading: ${h.grading}` : ""}
${h.reference ? `Reference: ${h.reference}` : ""}`.trim();
  } catch {
    return null;
  }
}

export async function getHijriContext(query: string): Promise<string | null> {
  if (!/hijri|islamic.*date|calendar|tanggal.*hijriah/i.test(query.toLowerCase())) return null;
  try {
    const today = await getTodayHijri();
    return `[Hijri — verified via AlAdhan]
Today: ${today.formatted} (${today.weekday ?? ""})`.trim();
  } catch {
    return null;
  }
}
