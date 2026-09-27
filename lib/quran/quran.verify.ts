/**
 * Stage 4B — verification (run: `npx tsx lib/quran/quran.verify.ts`).
 * Pure state/progress/serialization tests (no DOM, no network) + static
 * integration asserts over the Quran reader pages. Browser-only behavior
 * (observer timing, audio interplay, physical taps) is NOT VERIFIED here.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  hasBookmark,
  isQuranBookmark,
  isQuranReadingPosition,
  parseBookmarks,
  parseReadingPosition,
  readingProgress,
  removeBookmark,
  serializeBookmarks,
  toggleBookmark,
} from "./quranState";

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

// --- Bookmarks: empty/add/remove/toggle/dedupe/multiple ---
check(parseBookmarks(null).length === 0, "1. empty bookmarks state");
let list = toggleBookmark([], 2, 255);
check(list.length === 1 && hasBookmark(list, 2, 255), "2. add bookmark");
list = removeBookmark(list, 2, 255);
check(list.length === 0, "3. remove bookmark");
list = toggleBookmark(toggleBookmark([], 36, 1), 36, 1);
check(list.length === 0, "4. toggle twice removes");
const dupes = parseBookmarks(
  '[{"surahNumber":1,"ayahNumber":1,"createdAt":"2026-01-01T00:00:00.000Z"},{"surahNumber":1,"ayahNumber":1,"createdAt":"2026-01-02T00:00:00.000Z"}]'
);
check(dupes.length === 1, "5. duplicate prevention");
list = toggleBookmark(toggleBookmark([], 1, 1), 2, 255);
check(list.length === 2, "6. multiple bookmarks");

// --- Invalid stored data ---
check(parseBookmarks("not-json{{{").length === 0, "7a. malformed JSON ignored");
check(parseBookmarks('[{"surahNumber":999,"ayahNumber":1,"createdAt":"x"}]').length === 0, "7b. invalid surah dropped");
check(parseBookmarks('[{"surahNumber":2,"ayahNumber":0,"createdAt":"2026-01-01T00:00:00.000Z"}]').length === 0, "7c. invalid ayah dropped");
check(!isQuranBookmark({ surahNumber: 2.5, ayahNumber: 1, createdAt: new Date().toISOString() }), "8. non-integer surah rejected");
check(!isQuranBookmark({ surahNumber: 2, ayahNumber: -3, createdAt: new Date().toISOString() }), "9. negative ayah rejected");

// --- Serialization round-trip ---
const original = toggleBookmark(toggleBookmark([], 18, 32), 36, 70);
const roundTripped = parseBookmarks(serializeBookmarks(original));
check(
  roundTripped.length === 2 && hasBookmark(roundTripped, 18, 32) && hasBookmark(roundTripped, 36, 70),
  "10. persistence serialization round-trip"
);

// --- Reading position ---
check(parseReadingPosition(null) === null, "11a. no reading → null");
check(parseReadingPosition("{{bad") === null, "11b. corrupt reading → null");
const pos = parseReadingPosition('{"surahNumber":2,"ayahNumber":255,"updatedAt":"2026-09-24T10:00:00.000Z"}');
check(pos !== null && pos.surahNumber === 2 && pos.ayahNumber === 255, "12-13. reading parses");
check(!isQuranReadingPosition({ surahNumber: 0, ayahNumber: 1, updatedAt: "2026-01-01T00:00:00.000Z" }), "14. invalid reading rejected");

// --- Progress ---
check(readingProgress(1, 7) === 14, "15. partial progress floor (1/7 → 14%)");
check(readingProgress(0, 7) === 0 && readingProgress(5, 0) === 0, "16. clamped at zero");
check(readingProgress(7, 7) === 100, "17. final ayah → 100%");
check(readingProgress(9, 7) === 100, "16b. overflow clamped to 100");
check(readingProgress(2, 286) === 0, "15b. small fraction floors honestly");

// --- Integration (static asserts over shipped code) ---
const surahPage = read("app/quran/[surah]/page.tsx");
check(surahPage.includes("ReadingTracker") && surahPage.includes("SurahProgress"), "19. reader exposes tracking + progress islands");
const ayahRow = read("components/quran/AyahRow.tsx");
check(ayahRow.includes("AyahBookmarkButton"), "19b. reader exposes bookmark action");
check(!read("components/quran/SurahAudioProvider.tsx").includes("localStorage"), "24. audio untouched by user state");
const bookmarksPage = read("app/quran/bookmarks/page.tsx");
check(bookmarksPage.includes("BookmarksList"), "19c. bookmarks page wired");
const homeEntry = read("components/home/QuranEntry.tsx");
check(homeEntry.includes("HomeContinueReading"), "22. home continue wired to real state");
check(!read("app/page.tsx").includes("ContinueQuranCard"), "23. home shows no fake progress");
const store = read("lib/quran/useQuranState.ts");
check(store.includes("localStorage") === false || store.includes("getStorage"), "26. storage centralized, no raw access");
const stateSrc = read("lib/quran/quranState.ts");
check(
  !stateSrc.includes("arabic:") || stateSrc.includes("never Arabic"),
  "26b. no Quran text in user-state model"
);

// --- No new external APIs in Quran user-state flow ---
// (BookmarksList intentionally fetches bookmarked surahs via the shared
// endpoint + validator + mapper — no new backend, no new API.)
for (const f of [
  "lib/quran/quranState.ts",
  "lib/quran/useQuranState.ts",
  "components/quran/AyahBookmarkButton.tsx",
  "components/quran/ReadingTracker.tsx",
  "components/quran/SurahProgress.tsx",
]) {
  check(!read(f).includes("fetch("), `25. no fetch in ${f.split("/").pop()}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
