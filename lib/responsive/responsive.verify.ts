/**
 * Responsive audit verification (run: `npx tsx lib/responsive/responsive.verify.ts`).
 * Static/source checks over shipped code: layout behavior, responsive
 * grids, touch targets, overflow hazards, intentional-vs-accidental
 * scrolling. No browser available here — visual viewport testing is
 * explicitly NOT VERIFIED (see report).
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

// --- Global layout ---
const header = read("components/layout/AppHeader.tsx");
check(header.includes("hidden") && header.includes("sm:block"), "header hides secondary text on mobile");
const nav = read("components/layout/MobileBottomNav.tsx");
check(nav.includes("grid-cols-6") && nav.includes("min-h-[64px]"), "bottom nav fits 6 items, 64px targets");
check(nav.includes("env(safe-area-inset-bottom)"), "bottom nav safe-area");
check(nav.includes("lg:hidden"), "bottom nav mobile-only");
const container = read("components/layout/containers.tsx");
check(container.includes("px-4") && container.includes("pb-28"), "container padding + nav clearance");
check(!read("app/globals.css").includes("overflow-x-hidden"), "no body overflow-x-hidden shortcut");

// --- Typography (responsive, not fixed huge) ---
const surahPage = read("app/quran/[surah]/page.tsx");
check(surahPage.includes("text-4xl") && surahPage.includes("sm:text-5xl"), "surah title scales");
check(!surahPage.includes("mt-4 text-5xl "), "no fixed 5xl title");

// --- Intentional scroll only ---
for (const f of ["app/travel/page.tsx", "components/travel/MuslimMap.tsx"]) {
  const src = read(f);
  check(src.includes("no-scrollbar") && src.includes("overflow-x-auto"), `deliberate carousel: ${f.split("/").pop()}`);
}
check(read("components/prayer/widgets.tsx").includes("overflow-x-auto"), "timeline scrolls inside card");

// --- Quran ---
const qcard = read("components/quran/widgets.tsx");
check(qcard.includes("min-w-0") && qcard.includes("truncate"), "surah card truncates safely");
const player = read("components/quran/QuranAudioPlayer.tsx");
check(player.includes("min-w-0 flex-1") && player.includes("shrink-0"), "audio player flex guards");
check(player.includes("h-11 w-11") && player.includes("h-12 w-12"), "audio controls 44px+");
check(player.includes("sticky top-16 z-30"), "audio sticky below header");

// --- Hijri (table risk) ---
const hijri = read("components/islamic/HijriCalendar.tsx");
check(hijri.includes("table-fixed") && hijri.includes("w-full"), "hijri table fits viewport");
check(hijri.includes("flex-wrap"), "hijri header wraps");
check(hijri.includes("min-h-[44px]"), "hijri controls 44px+");

// --- Map ---
const map = read("components/travel/MuslimMap.tsx");
check(map.includes("flex-wrap justify-center gap-2 px-3"), "map controls wrap");
check(map.includes("h-[52vh] min-h-[320px]"), "map mobile height");
check(map.includes("lg:grid-cols-"), "map desktop grid");
check(map.includes("min-h-[44px]"), "map buttons 44px+");

// --- Qibla ---
check(read("components/qibla/QiblaCompass.tsx").includes("h-56 w-56 sm:h-64"), "dial fits 360px");

// --- Trips removed (replaced by NUR AI); verify NUR AI is responsive instead ---
check(!read("lib/constants/navigation.ts").includes("My Trips"), "trips nav removed");
check(read("app/nur-ai/page.tsx").includes("NUR AI"), "nur-ai page exists");

// --- Profile / notifications ---
check(read("components/profile/ProfileSettings.tsx").includes("min-h-[44px]"), "profile targets");
check(read("components/notifications/NotificationSettings.tsx").includes("min-h-[44px]"), "notification targets");

// --- Doa / Hadith filters ---
check(read("components/islamic/DoaExplorer.tsx").includes("flex-wrap"), "doa filters wrap");

// --- Home / travel heroes scale ---
check(read("app/travel/page.tsx").includes("text-3xl") && read("app/travel/page.tsx").includes("sm:text-4xl"), "travel hero scales");

// --- Offline ---
const banner = read("components/system/OfflineBanner.tsx");
check(banner.includes("fixed") && banner.includes("safe-area-inset-bottom"), "banner above bottom nav");
check(banner.includes('role="status"'), "banner accessible status");

// --- Touch targets sweep: icon-only buttons across key components ---
for (const f of [
  "components/quran/widgets.tsx",
  "components/quran/AyahBookmarkButton.tsx",
  "components/travel/PlaceCard.tsx",
]) {
  const src = read(f);
  check(src.includes("h-9 w-9") || src.includes("h-11 w-11") || src.includes("min-h-[44px]"), `targets: ${f.split("/").pop()}`);
}

// --- Flex min-width root fix (main must shrink below wide min-content) ---
check(read("app/layout.tsx").includes("min-w-0 flex-1"), "main allows shrinking (no body stretch)");

// --- Unbreakable API/user strings must wrap, never stretch ---
for (const [f, label] of [
  ["components/islamic/DoaCard.tsx", "doa reference"],
  ["components/home/cards.tsx", "home dua reference"],
] as const) {
  check(read(f).includes("break-words"), `break-words: ${label}`);
}

// --- Grid items with nowrap/shrink-0 content need min-w-0 ---
for (const [f, label] of [["components/quran/SurahSearch.tsx", "surah cards"]] as const) {
  check(read(f).includes("min-w-0"), `grid items shrink: ${label}`);
}

// --- No fixed pixel page widths ---
const risky = ["app/page.tsx", "app/travel/page.tsx", "app/profile/page.tsx", "app/travel/map/page.tsx"]
  .map((f) => ({ f, src: read(f) }))
  .filter(({ src }) => /w-\[\d+px\]/.test(src) || /min-w-\[\d+px\]/.test(src));
check(risky.length === 0, "no fixed-px widths on key pages");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
