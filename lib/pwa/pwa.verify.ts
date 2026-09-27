/**
 * Stage 5C — verification (run: `npx tsx lib/pwa/pwa.verify.ts`).
 * Static/source checks (no browser): manifest, icons, SW, network hook,
 * banner, offline page, cache safety, feature regression markers.
 * Browser/device behavior (install, lifecycle, real offline reload) is
 * NOT VERIFIED here by design — see report.
 */
import { existsSync, readFileSync } from "node:fs";
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
const exists = (p: string): boolean => existsSync(join(root, p));

/** Real PNG dimension read (IHDR) — no image libs needed. */
function pngSize(path: string): { w: number; h: number } | null {
  try {
    const d = readFileSync(join(root, path));
    if (d[0] !== 137 || d[1] !== 80 || d[2] !== 78 || d[3] !== 71) return null;
    return { w: d.readUInt32BE(16), h: d.readUInt32BE(20) };
  } catch {
    return null;
  }
}

// --- A. Manifest ---
check(exists("app/manifest.ts"), "A. manifest route exists");
const manifest = read("app/manifest.ts");
for (const needle of [
  "NUR — Muslim Travel Companion",
  'short_name: "NUR"',
  "Your daily Islamic",
  'start_url: "/"',
  "scope:",
  'display: "standalone"',
  'orientation: "portrait-primary"',
  "#0F5C4D",
  "#FCFBF7",
  'lang: "en"',
  'dir: "ltr"',
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "maskable",
]) {
  check(manifest.includes(needle), `A. manifest: ${needle.slice(0, 28)}`);
}
const s192 = pngSize("public/icons/icon-192.png");
const s512 = pngSize("public/icons/icon-512.png");
const sMask = pngSize("public/icons/icon-512-maskable.png");
check(s192?.w === 192 && s192?.h === 192, "A. icon 192 real PNG size");
check(s512?.w === 512 && s512?.h === 512, "A. icon 512 real PNG size");
check(sMask?.w === 512 && sMask?.h === 512, "A. maskable real PNG size");
check(read("app/layout.tsx").includes('themeColor: "#0F5C4D"'), "A. viewport themeColor");

// --- B. Service Worker ---
check(exists("public/sw.js"), "B. sw.js exists");
const sw = read("public/sw.js");
for (const needle of [
  "nur-static-v1",
  "nur-pages-v1",
  "caches.delete",
  'startsWith("nur-")',
  "/offline",
  "skipWaiting",
  "clients.claim",
  "request.mode",
  '"navigate"',
  "_next/static/",
  "/icons/",
  "/maplibre/",
]) {
  check(sw.includes(needle), `B. sw: ${needle.slice(0, 30)}`);
}
check(!sw.includes("location.reload"), "B. no reload logic");
check(!sw.includes("setInterval"), "B. no polling in worker");
const reg = read("components/system/ServiceWorkerRegister.tsx");
check(reg.includes("NODE_ENV") && reg.includes("production"), "B. production-only registration");
check(reg.includes("serviceWorker") && reg.includes(".catch("), "B. guarded registration");

// --- C. Network status ---
const hook = read("lib/network/useNetworkStatus.ts");
check(hook.includes("typeof window"), "C. SSR-safe guard");
check(hook.includes('"online"') && hook.includes('"offline"'), "C. online/offline states");
check(hook.includes("removeEventListener"), "C. listener cleanup");
check(!hook.includes("fetch("), "C. no polling/requests");

// --- D. Banner ---
const banner = read("components/system/OfflineBanner.tsx");
check(banner.includes('role="status"'), "D. accessible status");
check(banner.includes("You're offline") || banner.includes("You&apos;re offline"), "D. offline copy");
check(read("app/layout.tsx").includes("OfflineBanner"), "D. mounted once in layout");

// --- E. Offline page ---
check(exists("app/offline/page.tsx"), "E. offline page exists");
const offline = read("app/offline/page.tsx");
for (const needle of ["You", "offline", "min-h-[44px]"]) {
  check(offline.includes(needle), `E. offline page: ${needle.slice(0, 20)}`);
}
check(
  offline.includes("OfflineRetryButton") &&
    read("components/system/OfflineRetryButton.tsx").includes("Try again"),
  "E. retry action (full-reload island)"
);
check(!offline.includes("fetch("), "E. zero data fetching");

// --- F. Cache safety ---
for (const bad of [
  "localStorage",
  "latitude",
  "longitude",
  "nur:notifications",
  "nur:travel:trips",
  "nur:quran",
]) {
  check(!sw.includes(bad), `F. sw never touches: ${bad}`);
}

// --- G. Features intact (markers, not behavior tests) ---
for (const [file, marker] of [
  ["lib/services/quran/index.ts", "listSurahs"],
  ["lib/services/prayer/index.ts", "getTwoDayPrayer"],
  ["lib/services/islamic/doa.ts", "getDoas"],
  ["lib/services/islamic/hadith.ts", "getHadithPage"],
  ["lib/services/islamic/hijri.ts", "getHijriMonthView"],
  ["components/qibla/QiblaLive.tsx", "calculateQiblaBearing"],
  ["components/travel/MuslimMap.tsx", "maplibre"],
  ["app/nur-ai/page.tsx", "NUR AI"],
  ["lib/quran/useQuranState.ts", "QURAN_BOOKMARKS_KEY"],
  ["lib/notifications/useNotificationPreferences.ts", "NOTIF_PREFS_KEY"],
] as const) {
  check(read(file).includes(marker), `G. intact ${file.split("/").pop()}`);
}

// --- H/I. Trips removed (replaced by NUR AI) + Quran state untouched ---
check(!exists("lib/travel/tripState.ts") && !exists("app/travel/trips/page.tsx"), "H. My Trips removed");
check(!read("components/system/ServiceWorkerRegister.tsx").includes("Notification"), "J. no notif duplication");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
