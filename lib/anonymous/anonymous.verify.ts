/**
 * Anonymous-first architecture verification
 * (run: `npx tsx lib/anonymous/anonymous.verify.ts`).
 * Static/source checks: no auth/account/database surface, local-only
 * stores intact, navigation clean, services unchanged. Route liveness is
 * verified separately in the validation step (all must return 200).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
const read = (p: string): string => {
  try {
    return readFileSync(join(root, p), "utf8");
  } catch {
    return "";
  }
};
const exists = (p: string): boolean => existsSync(join(root, p));

// --- 1-6. No auth/account surface ---
for (const p of [
  "app/login",
  "app/register",
  "app/account",
  "app/forgot-password",
  "middleware.ts",
  "prisma",
]) {
  check(!exists(p), `no ${p}`);
}
const pkg = read("package.json");
for (const dep of ["prisma", "supabase", "firebase", "clerk", "@clerk", "next-auth", "mongoose", "drizzle"]) {
  check(!pkg.includes(`"${dep}"`), `no dep: ${dep}`);
}
check(!exists(".env"), "no .env file");
check(
  !exists(".env.local") || read(".env.local").includes("GEMINI_API_KEY") && !read(".env.local").includes("NEXT_PUBLIC"),
  "no NEXT_PUBLIC credentials (GEMINI_API_KEY is server-only if present)"
);

// --- 7-11. Local-only stores preserved (versioned keys, validators) ---
// Stage NUR AI: My Trips replaced by NUR AI — trips storage intentionally removed.
for (const [file, key] of [
  ["lib/quran/quranState.ts", "nur:quran:bookmarks:v1"],
  ["lib/quran/quranState.ts", "nur:quran:reading:v1"],
  ["lib/prayer/prayerPreferences.ts", "nur:prayer:preferences:v1"],
  ["lib/notifications/notificationPreferences.ts", "nur:notifications:preferences:v1"],
] as const) {
  check(read(file).includes(key), `local key intact: ${key}`);
}
check(!exists("lib/travel/tripState.ts") && !exists("lib/travel/useTrips.ts"), "My Trips storage removed (replaced by NUR AI)");
check(!exists("app/travel/trips"), "My Trips route removed");

// --- 12-13. No persistence of coords / payloads, no NUR database ---
const STORES = [
  "lib/quran/quranState.ts",
  "lib/quran/useQuranState.ts",
  "lib/prayer/prayerPreferences.ts",
  "lib/prayer/usePrayerPreferences.ts",
  "lib/notifications/notificationPreferences.ts",
  "lib/notifications/useNotificationPreferences.ts",
].map(read)
  // Strip comment lines so doc statements ("no X stored") don't false-positive.
  .map((src) =>
    src
      .split("\n")
      .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
      .join("\n")
  )
  .join("\n")
  .toLowerCase();
for (const needle of ["latitude", "longitude", "coords", "accuracy", "payload"]) {
  check(!STORES.includes(needle), `no ${needle} in user stores`);
}
for (const needle of ["DATABASE_URL", "getServerSession", "auth()", "createUser", "deleteUser"]) {
  const hit = ["app", "lib", "components"].some((dir) =>
    readdirSync(join(root, dir), { recursive: true, withFileTypes: true }).some(
      (e) =>
        e.isFile() &&
        /\.(ts|tsx)$/.test(e.name) &&
        !e.name.endsWith(".verify.ts") &&
        read(join(dir, e.parentPath.replace(root + "/", ""), e.name)).includes(needle)
    )
  );
  check(!hit, `no ${needle} in app code`);
}

// --- 14. No new database dependency ---
check(!pkg.includes("pg\"") && !pkg.includes("postgres"), "no postgres driver");

// --- 15. Navigation clean ---
const header = read("components/layout/AppHeader.tsx");
check(!/login|register|sign ?in|sign ?up|account/i.test(header.replace("Settings", "")), "header has no auth links");
const navConst = read("lib/constants/navigation.ts");
check(!/login|register|account/i.test(navConst), "nav constants have no auth items");

// --- 16. Settings implies no account ---
const profilePage = read("app/profile/page.tsx");
check(profilePage.includes(">Settings<"), "settings heading (not Profile)");
check(!/>Profile</.test(profilePage), "no Profile heading");
check(profilePage.includes("No account needed"), "anonymous-first subtitle");
check(!/login|register|sign ?in|member|my account/i.test(profilePage), "settings copy has no account terms");
check(header.includes('aria-label="Settings"'), "header settings entry (no avatar initial)");

// --- 17. Services intact ---
for (const [file, marker] of [
  ["lib/services/quran/index.ts", "listSurahs"],
  ["lib/services/prayer/index.ts", "getTwoDayPrayer"],
  ["lib/services/islamic/doa.ts", "getDoas"],
  ["lib/services/islamic/hadith.ts", "getHadithPage"],
  ["lib/services/islamic/hijri.ts", "getHijriMonthView"],
  ["components/qibla/QiblaLive.tsx", "calculateQiblaBearing"],
  ["components/travel/MuslimMap.tsx", "maplibre"],
] as const) {
  check(read(file).includes(marker), `service intact: ${file.split("/").pop()}`);
}

// --- 18-19. PWA + offline intact ---
check(read("app/manifest.ts").includes("NUR"), "PWA manifest intact");
check(read("public/sw.js").includes("nur-static-v1"), "SW intact");
check(read("app/offline/page.tsx").includes("offline"), "offline page intact");

// --- 20. Existing storage keys compatible (exact strings) ---
for (const key of [
  "nur:quran:bookmarks:v1",
  "nur:quran:reading:v1",
  "nur:prayer:preferences:v1",
  "nur:notifications:preferences:v1",
  "nur-theme",
]) {
  const found =
    read("lib/quran/quranState.ts").includes(key) ||
    read("lib/prayer/prayerPreferences.ts").includes(key) ||
    read("lib/notifications/notificationPreferences.ts").includes(key) ||
    read("components/providers/theme-provider.tsx").includes(key);
  check(found, `storage key compatible: ${key}`);
}
check(!read("lib/travel/tripState.ts").includes("nur:travel:trips:v1"), "trips key not present (replaced)");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
