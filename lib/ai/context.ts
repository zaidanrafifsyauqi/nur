/**
 * Stage NUR AI — context aggregator. Selectively enriches the user query
 * with structured NUR data so Gemini is never the sole source for facts
 * NUR already knows.
 */

import { getQuranContext } from "./tools/quran";
import { getDoaContext, getHadithContext, getHijriContext } from "./tools/islamic";
import { getPrayerContext } from "./tools/prayer";
import { getQiblaContext } from "./tools/qibla";
import { getTravelContext } from "./tools/travel";

export async function buildNurContext(userQuery: string): Promise<string[]> {
  const contexts: (string | null)[] = await Promise.all([
    getQuranContext(userQuery),
    getDoaContext(userQuery),
    getHadithContext(userQuery),
    getHijriContext(userQuery),
    Promise.resolve(getPrayerContext(userQuery)),
    Promise.resolve(getQiblaContext(userQuery)),
    Promise.resolve(getTravelContext(userQuery)),
  ]);
  return contexts.filter((c): c is string => c !== null && c.trim() !== "");
}

export function enrichSystemPrompt(basePrompt: string, contexts: string[]): string {
  if (contexts.length === 0) return basePrompt;
  return `${basePrompt}\n\n---\nNUR Structured Context (trusted, use when relevant):\n${contexts.join("\n\n")}`;
}
