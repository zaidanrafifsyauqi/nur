/**
 * Stage Proxy-1 — server search verification (run: `npx tsx lib/services/travel/placesServer.verify.ts`).
 *
 * Deterministic: upstream fetch is stubbed per test, budgets shrunk via
 * opts. No live Overpass calls. Covers: input validation (400s), query
 * built server-side (no raw passthrough), success shape, fatal (no
 * fallback), retryable → fallback (timeout/429/5xx), budget cap, external
 * abort, and no upstream-body leakage. Uses public rounded test coords.
 */
import {
  PROXY_UPSTREAM_BUDGET_MS,
  serveNearbySearch,
} from "./placesServer";
import { OVERPASS_CONFIG } from "./overpassConfig";

const PRIMARY = OVERPASS_CONFIG.endpoint;
const FALLBACK = OVERPASS_CONFIG.fallbackEndpoint;

// Public rounded test point (Central Jakarta, non-identifying).
const LAT = -6.18;
const LNG = 106.83;

let pass = 0;
let fail = 0;
function check(cond: boolean, name: string, extra = ""): void {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortLike(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (error instanceof Error) return /abort/i.test(error.message);
  return false;
}

type Behavior = (signal: AbortSignal | null) => Promise<Response>;

interface RecordedCall {
  url: string;
  method: string;
  body: string;
  userAgent: string;
}

interface Stub {
  calls: () => number;
  urls: () => string[];
  lastCall: () => RecordedCall | null;
}

function installStub(behaviors: Behavior[], fallback: Behavior): Stub {
  let calls = 0;
  const urls: string[] = [];
  let last: RecordedCall | null = null;
  const queue = [...behaviors];
  globalThis.fetch = (async (
    ...args: Parameters<typeof fetch>
  ): Promise<Response> => {
    calls += 1;
    const input = args[0];
    const init = args[1] ?? {};
    const headers = (init.headers ?? {}) as Record<string, string>;
    last = {
      url: String(typeof input === "string" ? input : input),
      method: String(init.method ?? "GET"),
      body: String(init.body ?? ""),
      userAgent: String(headers["User-Agent"] ?? ""),
    };
    urls.push(last.url);
    const signal = init.signal ?? null;
    const next = queue.shift() ?? fallback;
    return next(signal);
  }) as typeof fetch;
  return {
    calls: () => calls,
    urls: () => [...urls],
    lastCall: () => last,
  };
}

function mosquePayload(count: number, startId = 2000): string {
  const elements = Array.from({ length: count }, (_, i) => ({
    type: "node",
    id: startId + i,
    lat: LAT,
    lon: LNG,
    tags: { name: `Masjid S${i}` },
  }));
  return JSON.stringify({ version: 0.9, generator: "placesServer.verify", elements });
}

function okBehavior(count: number): Behavior {
  return () =>
    Promise.resolve(
      new Response(mosquePayload(count), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
}

function statusBehavior(code: number, text = "upstream error"): Behavior {
  return () => Promise.resolve(new Response(text, { status: code }));
}

function hangBehavior(): Behavior {
  return (signal) =>
    new Promise<Response>((_resolve, reject) => {
      if (!signal) return;
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
    });
}

const originalFetch = globalThis.fetch;

function validBody(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { latitude: LAT, longitude: LNG, ...extra };
}

async function main(): Promise<void> {
  // 0. Budget design locked: 10s + 2s + 10s fits inside the 25s client budget.
  const clientBudgetMs = OVERPASS_CONFIG.timeoutSeconds * 1000 + 5000;
  check(PROXY_UPSTREAM_BUDGET_MS === 10_000, "0. upstream budget is 10s per attempt");
  check(
    PROXY_UPSTREAM_BUDGET_MS + 2000 + PROXY_UPSTREAM_BUDGET_MS < clientBudgetMs,
    "0b. worst-case proxy total fits inside client budget",
    `proxy<=22000 < client=${clientBudgetMs}`
  );

  // 1. Invalid inputs → 400 without touching upstream.
  const invalidBodies: unknown[] = [
    null,
    {},
    { latitude: "x", longitude: LNG },
    { latitude: 91, longitude: LNG },
    { latitude: LAT, longitude: 200 },
    { latitude: NaN, longitude: LNG },
    { ...validBody(), radiusMeters: 50 },
    { ...validBody(), radiusMeters: 99999 },
    { ...validBody(), category: "sushi" },
    { ...validBody(), category: 42 },
  ];
  let all400 = true;
  for (const body of invalidBodies) {
    const stub = installStub([], okBehavior(1));
    const outcome = await serveNearbySearch(body, { budgetMs: 1000 });
    if (outcome.status !== 400 || stub.calls() !== 0) all400 = false;
  }
  check(all400, "1. invalid bodies rejected with 400, zero upstream calls");

  // 2. Valid body → query built server-side, raw fields never forwarded.
  let stub = installStub([okBehavior(2)], okBehavior(1));
  let outcome = await serveNearbySearch(
    { ...validBody(), radiusMeters: 3000, category: "mosques", query: "evil-query" },
    { budgetMs: 5000 }
  );
  const call = stub.lastCall();
  const decoded = call ? decodeURIComponent(call.body) : "";
  check(outcome.status === 200, "2. valid body returns 200");
  check(
    outcome.status === 200 && outcome.elements.length === 2,
    "2b. success carries elements"
  );
  check(
    call?.method === "POST" && decoded.includes("around:3000"),
    "2c. upstream receives POST form with radius"
  );
  check(
    decoded.includes('["amenity"="place_of_worship"]["religion"="muslim"]') &&
      decoded.includes("[timeout:20]"),
    "2d. server-built query carries mosque tags + timeout"
  );
  check(!decoded.includes("evil"), "2e. raw client fields never forwarded");
  check(
    (call?.userAgent ?? "").length > 0,
    "2f. server identifies with UA header"
  );
  check(stub.calls() === 1, "2g. success uses exactly 1 upstream call");

  // 3. Fatal upstream (400) → 502, no fallback, no body leak.
  stub = installStub(
    [statusBehavior(400, "upstream-sensitive-detail")],
    okBehavior(1)
  );
  outcome = await serveNearbySearch(validBody(), { budgetMs: 5000 });
  check(outcome.status === 502, "3. fatal upstream maps to 502");
  check(stub.calls() === 1, "3b. fatal never falls back", `got ${stub.calls()}`);
  check(
    outcome.status !== 200 &&
      !outcome.error.includes("upstream-sensitive-detail") &&
      !outcome.error.includes("400"),
    "3c. error hides raw upstream body"
  );

  // 4. Retryable (500) → fallback success, order primary→fallback.
  stub = installStub([statusBehavior(500), okBehavior(3)], okBehavior(1));
  outcome = await serveNearbySearch(validBody(), { budgetMs: 5000 });
  check(
    outcome.status === 200 && outcome.elements.length === 3,
    "4. 500 falls back then succeeds"
  );
  check(
    stub.urls().join("|") === `${PRIMARY}|${FALLBACK}`,
    "4b. order is primary then fallback",
    `got [${stub.urls().join(", ")}]`
  );

  // 5. Both fail → 502 generic, capped at 2 calls.
  stub = installStub(
    [statusBehavior(500, "first-secret"), statusBehavior(503, "second-secret")],
    okBehavior(1)
  );
  outcome = await serveNearbySearch(validBody(), { budgetMs: 5000 });
  check(outcome.status === 502, "5. persistent 5xx maps to 502");
  check(stub.calls() === 2, "5b. total capped at 2 upstream calls");
  check(
    outcome.status !== 200 &&
      !outcome.error.includes("secret"),
    "5c. exhausted error hides upstream bodies"
  );

  // 6. Timeout primary → fallback success; both hang → 504.
  stub = installStub([hangBehavior(), okBehavior(1)], okBehavior(1));
  outcome = await serveNearbySearch(validBody(), { budgetMs: 80 });
  check(
    outcome.status === 200 && outcome.elements.length === 1,
    "6. primary timeout falls back then succeeds"
  );
  stub = installStub([hangBehavior(), hangBehavior()], okBehavior(1));
  outcome = await serveNearbySearch(validBody(), { budgetMs: 80 });
  check(outcome.status === 504, "6b. double timeout maps to 504");
  check(stub.calls() === 2, "6c. timeout path capped at 2 calls");

  // 7. External abort → rejects (no response), single call.
  stub = installStub([hangBehavior()], okBehavior(1));
  const controller = new AbortController();
  const pending = serveNearbySearch(validBody(), {
    budgetMs: 5000,
    signal: controller.signal,
  });
  await sleep(30);
  controller.abort();
  let thrown: unknown = null;
  try {
    await pending;
  } catch (error) {
    thrown = error;
  }
  check(isAbortLike(thrown), "7. external abort rejects as abort");
  check(stub.calls() === 1, "7b. aborted search issues no fallback");

  // 8. Non-JSON / malformed upstream → 502, single call each.
  stub = installStub(
    [() => Promise.resolve(new Response("not json", { status: 200 }))],
    okBehavior(1)
  );
  outcome = await serveNearbySearch(validBody(), { budgetMs: 5000 });
  check(outcome.status === 502, "8. non-JSON upstream maps to 502");
  check(stub.calls() === 1, "8b. non-JSON never falls back");
  stub = installStub(
    [
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ version: 1 }), { status: 200 })
        ),
    ],
    okBehavior(1)
  );
  outcome = await serveNearbySearch(validBody(), { budgetMs: 5000 });
  check(outcome.status === 502, "8c. malformed upstream maps to 502");
  check(stub.calls() === 1, "8d. malformed never falls back");

  globalThis.fetch = originalFetch;

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main();
