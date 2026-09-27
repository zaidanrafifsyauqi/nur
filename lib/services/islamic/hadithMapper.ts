/**
 * Stage 2F — maps hadith-api records to NUR internal types.
 *
 * Data flow: API → validated API model → mapper → Hadith → UI.
 * Religious text preserved exactly (trimmed only). Grading shown only
 * when the source grades the record; narrator is never fabricated
 * (the source carries narrators inline in the text, not as metadata).
 */
import type { Hadith } from "@/lib/types";
import type { HadithApiFile, HadithApiGrade, HadithApiRecord } from "./hadithApi";

export interface HadithPairInput {
  collectionId: string;
  collectionName: string;
  /** Indonesian record (required — carries the translation). */
  ind: HadithApiRecord;
  /** Arabic record for the same number (optional — source gaps exist). */
  ara: HadithApiRecord | null;
  /** Book/section name resolved for this record's book. */
  bookName?: string;
  bookNumber?: number;
}

/** "Sahih — Salim al-Hilali" from exact source parts; undefined if ungraded. */
export function mapGrades(grades: HadithApiGrade[]): string | undefined {
  const parts = grades
    .map((g) => {
      const grade = g.grade.trim();
      const name = g.name.trim();
      if (grade === "") return null;
      return name === "" ? grade : `${grade} — ${name}`;
    })
    .filter((p): p is string => p !== null);
  if (parts.length === 0) return undefined;
  return [...new Set(parts)].join("; ");
}

/**
 * Maps one Indonesian record (+ optional Arabic twin) to Hadith.
 * Returns null when the translation is missing — a record without
 * Indonesian text cannot render in NUR.
 */
export function mapHadithPair(input: HadithPairInput): Hadith | null {
  const { collectionId, collectionName, ind, ara } = input;
  const translation = ind.text.trim();
  if (translation === "") return null;

  const arabicRaw = ara?.text.trim() ?? "";
  const arabic = arabicRaw === "" ? undefined : arabicRaw;

  const bookNumber = input.bookNumber ?? ind.reference.book;
  const reference = `No. ${ind.hadithnumber}${
    input.bookName ? ` · Book ${bookNumber}: ${input.bookName}` : ""
  }`;

  return {
    id: `${collectionId}:${ind.hadithnumber}`,
    collectionId,
    collectionName,
    bookName: input.bookName,
    bookNumber,
    hadithNumber: String(ind.hadithnumber),
    arabic,
    translation,
    reference,
    grading: mapGrades(ind.grades),
  };
}

/** Book/section name for a file: single-entry section map. */
export function bookNameFromFile(file: HadithApiFile): { bookNumber: number; bookName: string } | null {
  const entries = Object.entries(file.metadata.section);
  if (entries.length === 0) return null;
  const [num, name] = entries[0];
  const bookNumber = Number(num);
  if (!Number.isInteger(bookNumber)) return null;
  return { bookNumber, bookName: name };
}
