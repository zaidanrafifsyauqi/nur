/**
 * Stage 2E — logic tests (run: `npx tsx lib/services/islamic/doa.verify.ts`).
 * Covers §20: API validation, mapper, search, filtering, copy formatting.
 * Pure functions only — no network, no DOM.
 */
import { isDoaApiItem } from "./doaApi";
import { mapDoaItemToDua } from "./doaMapper";
import {
  doaMatchesQuery,
  filterDoas,
  formatDoaForCopy,
  normalizeDoaText,
} from "./doaSearch";
import type { Dua } from "@/lib/types";

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

const VALID = {
  id: 1,
  grup: "Doa Perjalanan",
  nama: "Doa Safar",
  ar: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا",
  tr: "Subhanalladzi sakhkhara lana",
  idn: "Mahasuci Tuhan yang menundukkan kendaraan bagi kami.",
  tentang: "HR. Muslim.",
  tag: ["safar", "perjalanan"],
};

// --- API validation ---
check(isDoaApiItem(VALID), "validation accepts valid record");
check(!isDoaApiItem({ ...VALID, ar: "  " }), "validation rejects empty arabic");
check(
  !isDoaApiItem({ ...VALID, ar: "Indonesian narrative, no Arabic script" }),
  "validation rejects non-Arabic arabic field"
);
check(!isDoaApiItem({ ...VALID, idn: undefined }), "validation rejects missing translation");
check(!isDoaApiItem({ ...VALID, tag: "safar" }), "validation rejects non-array tags");
check(!isDoaApiItem({ ...VALID, tag: ["ok", 7] }), "validation rejects non-string tag");
check(!isDoaApiItem({ ...VALID, id: 1.5 }), "validation rejects non-integer id");
check(!isDoaApiItem(null), "validation rejects null");
check(!isDoaApiItem("x"), "validation rejects string");

// --- Mapper ---
const mapped = mapDoaItemToDua(VALID);
check(mapped.id === "1", "mapper stable string id");
check(mapped.arabic === VALID.ar, "mapper arabic exact");
check(mapped.transliteration === VALID.tr, "mapper transliteration exact");
check(mapped.translation === VALID.idn, "mapper translation exact");
check(mapped.reference === VALID.tentang, "mapper reference exact");
check(mapped.category === VALID.grup, "mapper category exact");
check(
  Array.isArray(mapped.tags) && mapped.tags.length === 2 && mapped.tags[0] === "safar",
  "mapper tags array"
);
const noRef = mapDoaItemToDua({ ...VALID, tentang: "   " });
check(noRef.reference === undefined, "mapper empty reference → undefined");

// --- Search ---
const A: Dua = { ...mapped };
const B: Dua = {
  ...mapped,
  id: "2",
  title: "Doa Sebelum Tidur",
  translation: "Ya Allah, dengan nama-Mu aku hidup dan mati.",
  transliteration: undefined,
  reference: undefined,
  category: "Doa Tidur",
  tags: ["tidur", "malam"],
};
check(doaMatchesQuery(A, "safar"), "search title");
check(doaMatchesQuery(A, "menundukkan kendaraan"), "search translation");
check(doaMatchesQuery(A, "Sakhkhara"), "search transliteration case-insensitive");
check(doaMatchesQuery(A, "PERJALANAN"), "search category case-insensitive");
check(doaMatchesQuery(A, "safar"), "search tags");
check(doaMatchesQuery(B, "tidur"), "search second record");
check(!doaMatchesQuery(B, "safar"), "search non-match excluded");
check(
  normalizeDoaText("Rābiʿ  al-Awwal") === normalizeDoaText("rabi al-awwal"),
  "normalize accent/whitespace tolerant"
);

// --- Filtering ---
const all = [A, B];
check(filterDoas(all, "", null).length === 2, "filter all");
check(
  filterDoas(all, "", "Doa Tidur").length === 1 &&
    filterDoas(all, "", "Doa Tidur")[0].id === "2",
  "filter category"
);
check(filterDoas(all, "tidur", null).length === 1, "filter query");
check(filterDoas(all, "zzz-no-match", null).length === 0, "filter empty result");

// --- Copy formatting ---
const copy = formatDoaForCopy(A);
check(
  copy.includes(A.title) &&
    copy.includes(A.arabic) &&
    copy.includes(A.translation) &&
    copy.includes(A.transliteration ?? "x") &&
    copy.includes("Ref:"),
  "copy includes all fields"
);
const copyB = formatDoaForCopy(B);
check(
  !copyB.includes("undefined") && !copyB.includes("Ref:"),
  "copy omits missing optionals without 'undefined'"
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
