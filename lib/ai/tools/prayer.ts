/**
 * Stage NUR AI — Prayer context (reuse existing service contract, no new API).
 * Prayer times depend on location; if request provides no coords, explain
 * that location permission is needed instead of inventing a city.
 */

/* This tool deliberately does NOT fetch prayer times without coordinates.
   Instead it describes how NUR obtains them, so Gemini doesn't hallucinate. */

export function getPrayerContext(query: string): string | null {
  const q = query.toLowerCase();
  if (!/(prayer|shalat|sholat|fajr|subuh|dhuhr|dzuhur|asr|ashar|maghrib|isha|isya|sunrise|prayer.*time|waktu.*shalat)/i.test(q)) {
    return null;
  }

  // Provide structural context, not live times (location required).
  const isSpecificTime = /(what time|jam berapa|when is|kapan).*(fajr|dhuhr|asr|maghrib|isha|maghrib|subuh)/i.test(q);
  if (isSpecificTime) {
    return `[Prayer Context — NUR uses AlAdhan API with method 20 (Kementerian Agama RI), Shafi asr.
Prayer times in NUR are calculated from the user's browser location (GPS) and are available at /prayer.
If the user has not granted location, explain that accurate times require location access and direct them to /prayer.
Do NOT invent times like "Maghrib is at 18:00". Use only the structured prayer data if the client has sent it, otherwise be honest.]`;
  }

  return `[Prayer Context — NUR Prayer]
NUR provides Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha with method 20 (Kementerian Agama RI).
Questions about general concepts (difference Fajr/Sunrise, how prayer times are calculated) can be answered generally.
For today's exact times, refer to /prayer and mention that times depend on location.]`;
}
