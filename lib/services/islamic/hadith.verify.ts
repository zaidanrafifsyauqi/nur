/**
 * Stage 2F — verification (run: `npx tsx lib/services/islamic/hadith.verify.ts`).
 * Covers §23: source, books, hadith validation, mapper, pagination,
 * integrity (API text === mapped text after trim). Small live sample only.
 */
import {
  fetchHadithCatalog,
  fetchHadithFile,
  isHadithApiFile,
  isHadithApiRecord,
} from "./hadithApi";
import { getHadith, getHadithCollections, getHadithPage } from "./hadith";
import { bookNameFromFile, mapGrades, mapHadithPair } from "./hadithMapper";

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

async function main(): Promise<void> {
  // --- Source ---
  const catalog = await fetchHadithCatalog();
  check(Object.keys(catalog).length >= 7, `catalog collections (${Object.keys(catalog).length})`);

  // --- Books ---
  const collections = await getHadithCollections();
  const ids = collections.map((c) => c.id);
  for (const want of ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]) {
    check(ids.includes(want), `collection present: ${want}`);
  }
  check(
    collections.every((c) => c.id.trim() !== "" && c.name.trim() !== ""),
    "collection ids + names valid"
  );

  // --- Hadith records (bukhari 1, muslim 1, malik 1) ---
  const bukhariFile = await fetchHadithFile("ind", "bukhari", 1);
  const bukhariRec = bukhariFile?.hadiths.find((h) => h.hadithnumber === 1) ?? null;
  check(isHadithApiRecord(bukhariRec, { requireText: true }), "bukhari 1 valid (ind)");
  const bukhariAra = await fetchHadithFile("ara", "bukhari", 1);
  const bukhariAraRec = bukhariAra?.hadiths.find((h) => h.hadithnumber === 1) ?? null;
  check(isHadithApiRecord(bukhariAraRec, { requireText: false }), "bukhari 1 valid (ara)");
  const muslimRec = (
    await fetchHadithFile("ind", "muslim", 1)
  )?.hadiths.find((h) => h.hadithnumber === 1);
  check(isHadithApiRecord(muslimRec ?? null, { requireText: true }), "muslim 1 valid (ind)");
  const malikRec = (
    await fetchHadithFile("ind", "malik", 1)
  )?.hadiths.find((h) => h.hadithnumber === 1);
  check(isHadithApiRecord(malikRec ?? null, { requireText: true }), "malik 1 valid (ind)");

  // --- Malformed records ---
  check(!isHadithApiRecord(null, { requireText: true }), "reject null");
  check(
    !isHadithApiRecord({ ...bukhariRec, text: "   " }, { requireText: true }),
    "reject empty translation"
  );
  check(
    !isHadithApiRecord({ ...bukhariRec, text: "no arabic here" }, { requireText: false }),
    "reject non-Arabic arabic text"
  );
  check(
    !isHadithApiRecord({ ...bukhariRec, hadithnumber: 0 }, { requireText: true }),
    "reject bad number"
  );
  check(!isHadithApiFile({ metadata: {}, hadiths: [] }), "reject malformed file");
  const pastEnd = await fetchHadithFile("ind", "bukhari", 999999);
  check(pastEnd === null, "past-end number → null (boundary)");

  // --- Mapper ---
  if (bukhariRec && bukhariAraRec && bukhariFile) {
    const book = bookNameFromFile(bukhariFile);
    const mapped = mapHadithPair({
      collectionId: "bukhari",
      collectionName: "Sahih al Bukhari",
      ind: bukhariRec,
      ara: bukhariAraRec,
      bookName: book?.bookName,
      bookNumber: book?.bookNumber,
    });
    check(mapped !== null, "mapper returns hadith");
    check(
      mapped?.translation === bukhariRec.text.trim(),
      "integrity: API translation === mapped translation"
    );
    check(
      mapped?.arabic === bukhariAraRec.text.trim(),
      "integrity: API arabic === mapped arabic"
    );
    check(mapped?.id === "bukhari:1", "stable id");
    check(mapped?.grading === undefined, "no fabricated grading (bukhari ungraded)");
    check((mapped?.reference ?? "").includes("No. 1"), "reference carries number");
  }
  check(mapGrades([]) === undefined, "empty grades → undefined");
  check(
    mapGrades([{ name: "Salim al-Hilali", grade: "Sahih" }]) === "Sahih — Salim al-Hilali",
    "grades exact"
  );

  // --- Pagination (note: bukhari 4 has empty Indonesian text in the
  // source and is deliberately skipped — page 0 yields 9 records) ---
  const p0 = await getHadithPage("bukhari", "Sahih al Bukhari", 0, 10);
  check(p0.hadiths.length === 9 && p0.hasMore, "first page skips gap + hasMore via probe");
  check(
    p0.hadiths[0].hadithNumber === "1" && p0.hadiths[8].hadithNumber === "10",
    "page window numbers"
  );
  const p1 = await getHadithPage("bukhari", "Sahih al Bukhari", 1, 10);
  check(p1.hadiths[0].hadithNumber === "11", "second page continues");
  check(
    p0.hadiths.every((h) => h.arabic && h.arabic.length > 0),
    "bukhari page has arabic"
  );

  // --- Integrity sample: muslim (translation-only source gap) ---
  const muslim = await getHadith("muslim", "Sahih Muslim", 5);
  check(muslim !== null && muslim.translation.length > 0, "muslim record maps");
  check(muslim?.arabic === undefined, "muslim arabic honestly absent (source gap)");

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main();
