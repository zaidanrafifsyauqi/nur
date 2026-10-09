/**
 * Stage 3B — Overpass error normalization (no UI imports).
 *
 * Transient (429/5xx/timeout/abort-external) → retryable once after a
 * wait. Fatal (400/404/406/malformed) → no retry. Aborts are silent
 * (a newer search superseded them). Raw server HTML is never surfaced.
 */

export type OverpassFailureKind =
  | "retryable"
  | "fatal"
  | "aborted";

export interface NormalizedOverpassError {
  kind: OverpassFailureKind;
  /** User-safe message (UI may show it verbatim). */
  message: string;
}

export const OVERPASS_USER_MESSAGE = "We couldn't load nearby mosques right now.";

export function normalizeOverpassError(error: unknown): NormalizedOverpassError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { kind: "aborted", message: "" };
  }
  if (error instanceof Error && /aborted|abort/i.test(error.message)) {
    return { kind: "aborted", message: "" };
  }
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status: unknown }).status
      : null;
  if (status === 429 || (typeof status === "number" && status >= 500)) {
    return { kind: "retryable", message: OVERPASS_USER_MESSAGE };
  }
  if (error instanceof TypeError) {
    // Network failure / timeout surface as TypeError in fetch.
    return { kind: "retryable", message: OVERPASS_USER_MESSAGE };
  }
  return { kind: "fatal", message: OVERPASS_USER_MESSAGE };
}

export class OverpassStatusError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Overpass request failed (${status}).`);
    this.name = "OverpassStatusError";
    this.status = status;
  }
}

/**
 * Internal client-side timeout (the budget racing Overpass in places.ts).
 *
 * Deliberately distinct from external aborts (unmount / superseding search,
 * which surface as DOMException AbortError): a timeout means the attempt
 * produced no answer and is eligible for the single retry, while external
 * aborts must stay silent and never retry.
 */
export class OverpassTimeoutError extends Error {
  constructor() {
    super("Overpass request timed out.");
    this.name = "OverpassTimeoutError";
  }
}
