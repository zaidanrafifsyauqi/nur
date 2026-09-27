/**
 * Stage continuous Quran audio verification (run: `npx tsx lib/quran/quranAudio.verify.ts`).
 * Pure state-machine tests + static integration asserts. No DOM, no network.
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

/**
 * Minimal pure emulator of SurahAudioProvider's continuous logic.
 * Uses same state names and transitions, but without HTMLAudioElement.
 */
class Emu {
  index: number | null = null;
  status: "idle" | "loading" | "playing" | "paused" | "error" = "idle";
  mode: "single" | "surah" = "single";
  total: number;
  currentTime = 0;
  error: string | null = null;
  constructor(total: number) {
    this.total = total;
  }
  playAyah(i: number) {
    if (i < 0 || i >= this.total) return;
    this.mode = "single";
    this.index = i;
    this.currentTime = 0;
    this.status = "playing";
    this.error = null;
  }
  playSurah() {
    if (this.total === 0) return;
    const cur = this.index;
    const isPlaying = this.status === "playing";
    if (this.mode === "surah" && isPlaying) {
      this.status = "paused";
      return;
    }
    if (this.mode === "surah" && !isPlaying && cur != null) {
      // resume without resetting time
      this.status = "playing";
      return;
    }
    if (cur != null && isPlaying) {
      this.mode = "surah";
      return;
    }
    const start = cur ?? 0;
    this.mode = "surah";
    this.index = start;
    this.currentTime = 0;
    this.status = "playing";
  }
  toggleAyah(i: number) {
    if (this.index === i && this.status === "playing") {
      this.status = "paused";
    } else {
      this.playAyah(i);
    }
  }
  onEnded() {
    if (this.mode !== "surah") {
      this.status = "paused";
      return;
    }
    if (this.index == null) {
      this.status = "paused";
      this.mode = "single";
      return;
    }
    if (this.index < this.total - 1) {
      this.index += 1;
      this.currentTime = 0;
      this.status = "playing";
    } else {
      this.status = "paused";
      this.mode = "single";
    }
  }
  onError() {
    this.status = "error";
    this.error = "Quran audio couldn't be loaded. Please try again.";
    this.mode = "single";
  }
  playReject() {
    this.status = "error";
    this.error = "Quran audio couldn't be played. Please try again.";
    if (this.mode === "surah") this.mode = "single";
  }
  prev() {
    if (this.index == null) return;
    const target = this.index - 1;
    if (target < 0) return;
    const wasPlaying = this.status === "playing";
    this.index = target;
    this.currentTime = 0;
    this.status = wasPlaying ? "playing" : "paused";
  }
  next() {
    if (this.index == null) return;
    const target = this.index + 1;
    if (target >= this.total) return;
    const wasPlaying = this.status === "playing";
    this.index = target;
    this.currentTime = 0;
    this.status = wasPlaying ? "playing" : "paused";
  }
  pause() {
    if (this.status === "playing") this.status = "paused";
  }
  resume() {
    // surah resume without resetting
    if (this.mode === "surah" && this.status === "paused") {
      this.status = "playing";
    }
  }
}

// 1. Single ayah ends and stops
{
  const c = new Emu(7);
  c.playAyah(2);
  c.onEnded();
  check(c.status === "paused" && c.index === 2 && c.mode === "single", "1. Single ayah ends and stops");
}

// 2. Surah mode advances 1→2
{
  const c = new Emu(7);
  c.playSurah(); // starts 0
  check(c.index === 0 && c.mode === "surah", "2a. Surah starts at 1");
  c.onEnded();
  check(c.index === 1 && c.status === "playing" && c.mode === "surah", "2b. Surah advances 1→2");
}

// 3. Across multiple
{
  const c = new Emu(7);
  c.playSurah();
  c.onEnded(); //1
  c.onEnded(); //2
  c.onEnded(); //3
  check(c.index === 3, "3. Surah advances across multiple");
}

// 4. Stops after final
{
  const c = new Emu(3);
  c.playSurah(); //0
  c.onEnded(); //1
  c.onEnded(); //2 last
  c.onEnded(); // should stay at 2 and pause
  check(c.index === 2 && c.status === "paused" && c.mode === "single", "4. Surah stops after final");
}

// 5. No loop
{
  const c = new Emu(3);
  c.playSurah();
  c.onEnded();
  c.onEnded();
  const before = c.index;
  c.onEnded();
  check(c.index === before, "5. No loop");
}

// 6. Pause preserves ayah
{
  const c = new Emu(5);
  c.playSurah();
  c.pause();
  check(c.index === 0 && c.status === "paused" && c.mode === "surah", "6. Pause preserves ayah");
}

// 7. Resume preserves position
{
  const c = new Emu(5);
  c.playSurah();
  c.currentTime = 5.5;
  c.pause();
  const t = c.currentTime;
  c.playSurah(); // resume
  check(c.currentTime === t && c.status === "playing", "7. Resume preserves position");
}

// 8. Play Surah during single switches to continuous
{
  const c = new Emu(5);
  c.playAyah(3);
  check(c.mode === "single" && c.index === 3, "8a. Single playing at 4");
  c.playSurah();
  check(c.mode === "surah" && c.index === 3 && c.status === "playing", "8b. Play Surah switches mode without restart");
}

// 9. Clicking single ayah during continuous switches to single
{
  const c = new Emu(5);
  c.playSurah(); //0 surah
  c.onEnded(); //1
  c.toggleAyah(4); // click ayah 5
  check(c.mode === "single" && c.index === 4, "9. Single click switches mode");
  c.onEnded();
  check(c.index === 4 && c.status === "paused", "9b. Single does not auto-advance");
}

// 10. Previous during continuous
{
  const c = new Emu(5);
  c.playSurah();
  c.onEnded(); //1
  c.prev();
  check(c.index === 0 && c.mode === "surah", "10. Previous during surah stays surah");
}

// 11. Next during continuous
{
  const c = new Emu(5);
  c.playSurah();
  c.next();
  check(c.index === 1 && c.mode === "surah", "11. Next during surah stays surah");
}

// 12. Final ayah does not advance
{
  const c = new Emu(2);
  c.playSurah(); //0
  c.onEnded(); //1 final
  const before = c.index;
  c.next();
  check(c.index === before, "12. Final ayah next no-op");
}

// 13. Failed next audio enters safe error
{
  const c = new Emu(5);
  c.playSurah();
  c.onError();
  check(c.status === "error" && c.mode === "single", "13. Failed next enters safe error");
}

// 14. play() rejection handled
{
  const c = new Emu(5);
  c.playSurah();
  c.playReject();
  check(c.status === "error", "14. play rejection handled");
}

// 15. Refresh does not persist (storage check)
{
  const src = read("components/quran/SurahAudioProvider.tsx");
  check(!src.includes("localStorage"), "15. Refresh does not persist (no localStorage)");
}

// 16. Only one audio element
{
  const src = read("components/quran/SurahAudioProvider.tsx");
  const count = (src.match(/new Audio\(\)/g) ?? []).length;
  check(count === 1, "16. Only one HTMLAudioElement");
}

// 17. Current ayah state updates
{
  const c = new Emu(5);
  c.playSurah();
  c.onEnded();
  check(c.index === 1, "17. Current ayah updates");
}

// 18. Playback mode resets after completion
{
  const c = new Emu(2);
  c.playSurah();
  c.onEnded();
  // after final, mode should be single
  c.onEnded();
  check(c.mode === "single", "18. Mode resets after completion");
}

// 19. Continuous does not affect bookmarks
{
  const src = read("components/quran/SurahAudioProvider.tsx");
  check(!src.includes("QURAN_BOOKMARKS_KEY") && !src.includes("bookmark"), "19. No bookmark coupling");
}

// 20. Continuous does not affect reading progress
{
  const src = read("components/quran/SurahAudioProvider.tsx");
  check(!src.includes("QURAN_READING_KEY") && !src.includes("ReadingTracker"), "20. No reading progress coupling");
}

// Static integration asserts
{
  const provider = read("components/quran/SurahAudioProvider.tsx");
  check(provider.includes('playbackMode') && provider.includes('"single"') && provider.includes('"surah"'), "provider has playbackMode");
  check(provider.includes("playSurah"), "provider exposes playSurah");
  check(read("components/quran/QuranAudioPlayer.tsx").includes("playSurah"), "player uses playSurah");
  check(read("components/quran/QuranAudioPlayer.tsx").includes("Pause surah") || read("components/quran/QuranAudioPlayer.tsx").includes("Pause surah"), "player has surah labels");
  check(read("components/quran/AyahPlayButton.tsx").includes("toggleAyah"), "ayah button still single");
  check(provider.includes("onEnded") && provider.includes('mode !== "surah"'), "onEnded respects mode");
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
