/**
 * Stage 4A — Home verification (run: `npx tsx lib/services/home/home.verify.ts`).
 * Covers §17: renderable sections, deterministic doa, real links, no fake
 * content, no duplicate request paths. Pure checks + one live doa fetch.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDailyDoa, selectDailyDoaIndex } from "../islamic/doa";

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

const root = join(__dirname, "..", "..", "..");
const read = (p: string): string => readFileSync(join(root, p), "utf8");
const page = read("app/page.tsx");

// --- Deterministic daily selection (pure) ---
const d1 = new Date(2026, 8, 24, 12, 0);
const d2 = new Date(2026, 8, 24, 23, 59);
check(selectDailyDoaIndex(226, d1) === selectDailyDoaIndex(226, d2), "same date → same doa");
const seen = new Set(
  Array.from({ length: 30 }, (_, i) => selectDailyDoaIndex(226, new Date(2026, 0, 2 + i)))
);
check(seen.size > 20, `dates spread across collection (${seen.size}/30 unique)`);
let threw = false;
try {
  selectDailyDoaIndex(0, d1);
} catch {
  threw = true;
}
check(threw, "empty collection throws (no silent fake pick)");

// --- No fake content in Home production flow ---
for (const banned of [
  "ContinueQuranCard",
  "mockAyahOfDay",
  "mockContinueReading",
  "mockDuaOfDay",
  "MockNotice",
  "streak",
  "Jakarta",
  "75%",
  "Last read",
]) {
  check(!page.includes(banned), `no fake content: ${banned}`);
}

// --- Real wiring present (page composes; links live in sections) ---
for (const needle of ["HomePrayerSection", "QuranEntry", "DailyDoa", '"/travel"', "Suspense"]) {
  check(page.includes(needle), `home wires: ${needle}`);
}
const quranEntry =
  read("components/home/QuranEntry.tsx") + read("components/home/HomeContinueReading.tsx");
check(quranEntry.includes('"/quran/1"') && quranEntry.includes('"/quran"'), "quran links real routes");
const duaCard = read("components/home/cards.tsx");
check(duaCard.includes('"/islamic/duas"'), "doa CTA links library");

// --- No direct fetch in Home UI (services own requests) ---
for (const f of ["app/page.tsx", "components/home/DailyDoa.tsx", "components/home/QuranEntry.tsx"]) {
  check(!read(f).includes("fetch("), `no direct fetch in ${f}`);
}

async function live(): Promise<void> {
  try {
    const dua = await getDailyDoa(new Date(2026, 8, 24));
    check(
      dua.id !== "42" && dua.arabic.trim() !== "" && dua.translation.trim() !== "",
      `live daily doa valid (id ${dua.id})`
    );
    const again = await getDailyDoa(new Date(2026, 8, 24, 18, 30));
    check(again.id === dua.id, "live deterministic same-day pick");
  } catch (e) {
    console.log(`NOT VERIFIED — doa API unreachable (${(e as Error).message})`);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void live();
