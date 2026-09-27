/**
 * Stage 2E — EQuran.id Doa API client (server-side only).
 *
 * Source: https://equran.id/api/doa (docs: https://equran.id/apidev/doa)
 * Single request returns the full collection (no pagination observed).
 * No authentication required.
 *
 * NOTE — live response differs from the documentation's field names:
 * docs suggest arab/latin/terjemah-style keys, but the live API returns
 * `ar` (Arabic), `tr` (Latin transliteration), `idn` (Indonesian
 * translation), `nama` (title), `grup` (category), `tag` (string[]),
 * `tentang` (source/reference notes). Types below match the LIVE shape,
 * verified 2026-09-24 (status=success, total=227).
 *
 * Never import this module from Client Components.
 */

const DOA_API_URL = "https://equran.id/api/doa";

/** One record exactly as the live API returns it. */
export interface DoaApiItem {
  id: number;
  grup: string;
  nama: string;
  ar: string;
  tr: string;
  idn: string;
  tentang: string;
  tag: string[];
}

export interface DoaApiResponse {
  status: string;
  total: number;
  data: DoaApiItem[];
}

export class DoaApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DoaApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Strict per-record validator — rejects malformed records individually. */
export function isDoaApiItem(value: unknown): value is DoaApiItem {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "number" || !Number.isInteger(value.id)) return false;
  if (typeof value.grup !== "string" || value.grup.trim() === "") return false;
  if (typeof value.nama !== "string" || value.nama.trim() === "") return false;
  if (typeof value.ar !== "string" || value.ar.trim() === "") return false;
  // The Arabic field must actually contain Arabic script (id 42 in the
  // live API carries Indonesian narrative text here — genuinely malformed).
  if (!/[\u0600-\u06FF]/.test(value.ar)) return false;
  if (typeof value.tr !== "string" || value.tr.trim() === "") return false;
  if (typeof value.idn !== "string" || value.idn.trim() === "") return false;
  if (typeof value.tentang !== "string") return false;
  if (
    !Array.isArray(value.tag) ||
    !value.tag.every((t) => typeof t === "string" && t.trim() !== "")
  ) {
    return false;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Full collection fetch (server-side, cached 24h). */
export async function fetchDoas(attempts = 3): Promise<DoaApiItem[]> {
  let delayMs = 800;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(DOA_API_URL, { next: { revalidate: 86400 } });
    } catch {
      if (attempt === attempts - 1) throw new DoaApiError("Doa API unreachable.");
      await sleep(delayMs);
      delayMs *= 2;
      continue;
    }
    if (!res.ok) {
      try {
        await res.arrayBuffer();
      } catch {
        // ignore drain errors before retry
      }
      if (attempt === attempts - 1 || (res.status !== 429 && res.status < 500)) {
        throw new DoaApiError(`Doa request failed (${res.status}).`);
      }
      await sleep(delayMs + Math.floor(Math.random() * 400));
      delayMs *= 2;
      continue;
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new DoaApiError("Doa response was not valid JSON.");
    }
    if (!isRecord(json)) throw new DoaApiError("Doa response was malformed.");
    const { status, data } = json as Partial<DoaApiResponse>;
    if (status !== "success" || !Array.isArray(data) || data.length === 0) {
      throw new DoaApiError("Doa response was malformed.");
    }
    // Deliberate per-record filtering: one bad record must not crash the page.
    const valid = data.filter(isDoaApiItem);
    if (valid.length === 0) throw new DoaApiError("Doa response was malformed.");
    return valid;
  }
  throw new DoaApiError("Doa API unreachable.");
}
