/**
 * Stage 4D — verification (run: `npx tsx lib/profile/profile.verify.ts`).
 * Static/source checks (no DOM): structure, single-source-of-truth,
 * no auto-geolocation, scoped reset, privacy, accessibility markers.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
const page = read("app/profile/page.tsx");
const island = read("components/profile/ProfileSettings.tsx");
const provider = read("components/providers/theme-provider.tsx");

// --- A. Profile structure (anonymous-first: Settings heading, route kept) ---
check(page.includes("<h1") && page.includes(">Settings<"), "A. settings heading");
for (const h of ["Appearance", "Prayer", "Location", "Privacy", "About NUR"]) {
  check(island.includes(`"${h}"`) || island.includes(`>${h}<`), `A. section: ${h}`);
}

// --- B. Theme: existing provider, no duplicates ---
check(island.includes("useTheme"), "B. uses existing ThemeProvider");
check(!island.includes("nur-theme"), "B. no duplicate theme storage key");
check(
  provider.includes("setTheme") && provider.includes('"light" | "dark"'),
  "B. provider extended additively (light/dark only, no fake system)"
);
check(!island.includes("useState") || island.includes("confirming"), "B. no duplicate theme state");

// --- C. Prayer: shared store ---
check(island.includes("usePrayerPreferences"), "C. uses prayer preference store");
check(island.includes("PrayerSettings"), "C. reuses PrayerSettings component");
check(!island.includes("calculationMethod:"), "C. no duplicate prayer state");
check(island.includes("methodShortLabel"), "C. summary from config labels");

// --- D. Location: no auto-request ---
check(island.includes("useGeolocation(false)"), "D. no auto geolocation on open");
check(!island.includes("useGeolocation(true)"), "D. no aggressive permission");
check(
  island.includes("has not been requested yet") && island.includes("Try again"),
  "D. idle + retry states"
);
for (const f of ["app/profile/page.tsx", "components/profile/ProfileSettings.tsx"]) {
  const src = read(f);
  check(
    !src.includes("latitude") || src.includes("coordinates are"),
    `D. no coords in ${f.split("/").pop()}`
  );
}
check(!island.includes("reverse") && !island.includes("Jakarta"), "D. no geocoding/fake city");

// --- E. Reset scope ---
check(!island.includes("localStorage.clear"), "E. no localStorage.clear()");
check(island.includes("resetPreferences"), "E. prayer reset reused");
check(island.includes("setTheme"), "E. theme reset via provider");
check(!island.includes("nur:quran"), "E. quran keys untouched");
check(island.includes("Cancel") && island.includes("Reset all preferences?"), "E. confirmation UI");

// --- F. Privacy ---
for (const f of ["app/profile/page.tsx", "components/profile/ProfileSettings.tsx"]) {
  const src = read(f).toLowerCase();
  check(
    !src.includes("fetch(") && !src.includes("analytics") && !src.includes("auth"),
    `F. clean ${f.split("/").pop()}`
  );
}

// --- G. Accessibility/static ---
const prayerSettingsSrc = read("components/prayer/PrayerSettings.tsx");
for (const label of ['aria-label="Color theme"', "aria-pressed", 'role="group"', "min-h-[44px]"]) {
  check(island.includes(label), `G. a11y marker: ${label}`);
}
for (const label of ['htmlFor="prayer-method"', 'htmlFor="prayer-school"']) {
  check(prayerSettingsSrc.includes(label), `G. a11y marker: ${label}`);
}
check(page.includes("max-w-2xl"), "G. constrained width");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
