import { mockDhikr, mockDuas } from "@/lib/mock/islamic";

export { getHijriMonthView, getTodayHijri } from "./hijri";
export { getDoas, getDoaCategories } from "./doa";
export { getHadithCollections, getHadithPage, getHadith } from "./hadith";

/** Stage 1 placeholders — no network (duas/hadith now have live services above). */
export async function listDuas() {
  return mockDuas;
}
export async function listDhikr() {
  return mockDhikr;
}
