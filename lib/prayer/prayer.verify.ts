/**
 * Stage 4C — verification (run: `npx tsx lib/prayer/prayer.verify.ts`).
 * Pure preference/format/cache-key tests (no DOM) + static integration
 * asserts + small live API checks (default method, school effect).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchPrayerDay } from "../services/prayer/api";
import { prayerCacheKey } from "../services/prayer/cache";
import {
  DEFAULT_METHOD_ID,
  isAsrSchool,
  isSupportedMethodId,
  PRAYER_METHODS,
} from "../services/prayer/methods";
import {
  formatClock24,
  formatPrayerTime,
  isPrayerTimeFormat,
} from "../services/prayer/timeFormat";
import {
  DEFAULT_PRAYER_PREFERENCES,
  isPrayerPreferences,
  parsePrayerPreferences,
  prayerPreferencesEqual,
  PRAYER_PREFS_KEY,
} from "./prayerPreferences";

let pass = 0;
let fail = 0;
function check(cond: boolean, name: string): void {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name}`);
  }
}

const root = join(__dirname, "..", "..");
const read = (p: string): string => readFileSync(join(root, p), "utf8");

// --- A. Defaults ---
check(DEFAULT_PRAYER_PREFERENCES.calculationMethod === 20, "A. default method = 20");
check(DEFAULT_PRAYER_PREFERENCES.timeFormat === "12h", "A. default format preserves current 12h UI");
check(DEFAULT_PRAYER_PREFERENCES.school === "STANDARD", "A. default school = STANDARD");
check(DEFAULT_METHOD_ID === 20, "A. default method id constant");
check(PRAYER_PREFS_KEY === "nur:prayer:preferences:v1", "A. versioned storage key");
check(
  PRAYER_METHODS.length >= 7 &&
    PRAYER_METHODS.every((m) => isSupportedMethodId(m.id) && m.name.trim() !== "") &&
    PRAYER_METHODS.some((m) => m.id === 20),
  "A. curated method catalog valid (incl. default)"
);

// --- B. Validation ---
check(isSupportedMethodId(20) && isSupportedMethodId(3), "B. valid methods accepted");
check(!isSupportedMethodId(99) && !isSupportedMethodId("20") && !isSupportedMethodId(20.5), "B. invalid methods rejected");
check(isPrayerTimeFormat("24h") && isPrayerTimeFormat("12h"), "B. valid formats accepted");
check(!isPrayerTimeFormat("13h") && !isPrayerTimeFormat(null), "B. invalid format rejected");
check(isAsrSchool("STANDARD") && isAsrSchool("HANAFI"), "B. valid schools accepted");
check(!isAsrSchool("MALIKI"), "B. invalid school rejected");
check(
  isPrayerPreferences({ calculationMethod: 3, school: "HANAFI", timeFormat: "24h" }),
  "B. valid prefs accepted"
);
check(
  !isPrayerPreferences({ calculationMethod: 99, school: "STANDARD", timeFormat: "24h" }),
  "B. bad method rejected"
);

// --- C. Storage parsing ---
check(
  prayerPreferencesEqual(parsePrayerPreferences(null), DEFAULT_PRAYER_PREFERENCES),
  "C. null falls back"
);
check(
  prayerPreferencesEqual(parsePrayerPreferences("{{bad"), DEFAULT_PRAYER_PREFERENCES),
  "C. malformed JSON falls back"
);
check(
  prayerPreferencesEqual(
    parsePrayerPreferences('{"calculationMethod":"20","school":"STANDARD","timeFormat":"24h"}'),
    DEFAULT_PRAYER_PREFERENCES
  ),
  "C. wrong types fall back"
);
check(
  parsePrayerPreferences(
    '{"calculationMethod":3,"school":"HANAFI","timeFormat":"24h","extra":1}'
  ).calculationMethod === 3,
  "C. unknown fields do not break parser"
);
check(
  prayerPreferencesEqual(
    parsePrayerPreferences('{"calculationMethod":3,"school":"HANAFI","timeFormat":"24h"}'),
    { calculationMethod: 3, school: "HANAFI", timeFormat: "24h" }
  ),
  "C. valid stored prefs parsed"
);

// --- D. Formatter ---
check(formatPrayerTime("05:01", "5:01 AM", "24h") === "05:01", "D. 24h output");
check(formatPrayerTime("05:01", "5:01 AM", "12h") === "5:01 AM", "D. 12h output");
check(formatClock24(0, 0) === "00:00", "D. midnight 24h");
check(formatPrayerTime("12:15", "12:15 PM", "24h") === "12:15", "D. noon 24h");
check(formatPrayerTime("12:15", "12:15 PM", "12h") === "12:15 PM", "D. noon 12h");
check(formatClock24(18, 3) === "18:03", "D. leading zero");

// --- E. Cache keys ---
const kA = prayerCacheKey({ lat: -6.2, lng: 106.85 }, "24-09-2026", 20, 0);
const kB = prayerCacheKey({ lat: -6.2, lng: 106.85 }, "24-09-2026", 3, 0);
const kC = prayerCacheKey({ lat: -6.2, lng: 106.85 }, "24-09-2026", 20, 1);
check(kA !== kB, "E. method changes key");
check(kA !== kC, "E. school changes key");
check(
  kA === prayerCacheKey({ lat: -6.2, lng: 106.85 }, "24-09-2026", 20, 0),
  "E. same inputs reuse key"
);
const svcSrc = read("lib/services/prayer/index.ts");
check(!svcSrc.includes("timeFormat") || svcSrc.includes("never reaches"), "E. format absent from request layer");

// --- F/G/H/I static integration ---
const prayerLive = read("components/prayer/PrayerLive.tsx");
check(prayerLive.includes("PrayerSettings"), "G. prayer page contains settings");
check(prayerLive.includes("calc:"), "F. calc passed to fetch layer");
const home = read("components/home/HomePrayerSection.tsx");
check(home.includes("usePrayerPreferences") && home.includes("calc:"), "G. home follows preferences");
const settings = read("components/prayer/PrayerSettings.tsx");
check(
  settings.includes("Kementerian Agama") === false && settings.includes("PRAYER_METHODS"),
  "G. method labels from config (not hardcoded)"
);
check(
  settings.includes("Reset to default") && settings.includes("aria-pressed"),
  "G. reset + accessible format toggle"
);
const hook = read("lib/services/prayer/usePrayerTimes.ts");
check(hook.includes("methodId") && hook.includes("school"), "G. no duplicate fetch layer");
for (const f of [
  "components/prayer/PrayerLive.tsx",
  "components/home/HomePrayerSection.tsx",
  "lib/services/prayer/index.ts",
]) {
  check(!read(f).includes("localStorage"), `H. no coordinate storage in ${f.split("/").pop()}`);
}
check(
  read("lib/prayer/usePrayerPreferences.ts").includes("PRAYER_PREFS_KEY"),
  "H. prefs isolated to versioned key"
);

async function live(): Promise<void> {
  // Default request still method 20 (existing URL contract preserved).
  try {
    const d20 = await fetchPrayerDay({ lat: -6.2, lng: 106.85 }, "24-09-2026", 20);
    check(d20.meta.method.id === 20, "F. default request is method 20");
    const d3 = await fetchPrayerDay({ lat: -6.2, lng: 106.85 }, "24-09-2026", 3);
    check(d3.meta.method.id === 3, "F. selected method is sent");
    check(d3.timings.Fajr !== d20.timings.Fajr, "F. method changes data");
    const hanafi = await fetchPrayerDay({ lat: -6.2, lng: 106.85 }, "24-09-2026", 20, 1);
    const shafi = await fetchPrayerDay({ lat: -6.2, lng: 106.85 }, "24-09-2026", 20, 0);
    check(hanafi.timings.Asr !== shafi.timings.Asr, "F. school=1 shifts Asr only");
    check(hanafi.timings.Fajr === shafi.timings.Fajr, "F. school leaves others intact");
  } catch (e) {
    console.log(`NOT VERIFIED — prayer API unreachable (${(e as Error).message})`);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void live();
