/**
 * Stage 3B — search retry + fallback verification (run: `npx tsx lib/services/travel/places.verify.ts`).
 *
 * Deterministic: global fetch is stubbed per test and the client-side
 * timeout budget is shrunk via setSearchTimeoutBudgetForTests. No live
 * Overpass calls, no quota use.
 *
 * Covers: primary success (no fallback), primary failure → fallback
 * success (timeout, 429, 5xx), both endpoints failing (budget cap),
 * external abort / supersede (no fallback), 400/406 + malformed (no
 * fallback), empty result (success, no fallback), and the explicit total
 * request budget (OVERPASS_CONFIG.maxAttempts).
 */
import {
  abortNearbySearch,
  clearNearbyCache,
  searchNearbyMosques,
  searchNearbyViaProxy,
  setSearchTimeoutBudgetForTests,
} from "./places";
import { OVERPASS_CONFIG } from "./overpassConfig";
import { OverpassTimeoutError } from "./overpassError";

const PRIMARY: string = OVERPASS_CONFIG.endpoint;
const FALLBACK: string = OVERPASS_CONFIG.fallbackEndpoint;

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

interface Stub {
  calls: () => number;
  urls: () => string[];
}

function installFetchStub(behaviors: Behavior[], fallback: Behavior): Stub {
  let calls = 0;
  const urls: string[] = [];
  const queue = [...behaviors];
  globalThis.fetch = (async (
    ...args: Parameters<typeof fetch>
  ): Promise<Response> => {
    calls += 1;
    urls.push(String(args[0]));
    const signal = args[1]?.signal ?? null;
    const next = queue.shift() ?? fallback;
    return next(signal);
  }) as typeof fetch;
  return {
    calls: () => calls,
    urls: () => [...urls],
  };
}

function checkUrls(
  stub: Stub,
  expected: string[],
  name: string
): void {
  const actual = stub.urls();
  check(
    actual.length === expected.length &&
      actual.every((url, i) => url === expected[i]),
    name,
    `got [${actual.join(", ")}]`
  );
}

function mosquePayload(count: number, startId = 1000): string {
  const elements = Array.from({ length: count }, (_, i) => ({
    type: "node",
    id: startId + i,
    lat: -6.17,
    lon: 106.83,
    tags: { name: `Masjid T${i}` },
  }));
  return JSON.stringify({ version: 0.9, generator: "places.verify", elements });
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

function statusBehavior(code: number): Behavior {
  return () =>
    Promise.resolve(new Response("upstream error", { status: code }));
}

function invalidJsonBehavior(): Behavior {
  return () => Promise.resolve(new Response("not json", { status: 200 }));
}

function missingElementsBehavior(): Behavior {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify({ version: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
}

function hangBehavior(): Behavior {
  return (signal) =>
    new Promise<Response>((_resolve, reject) => {
      if (!signal) return; // No signal: hang forever (tests always pass one).
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

let testIndex = 0;
function coords(): { latitude: number; longitude: number } {
  testIndex += 1;
  return { latitude: -6.17 - testIndex * 0.01, longitude: 106.83 };
}

async function reset(): Promise<void> {
  abortNearbySearch();
  clearNearbyCache();
}

async function main(): Promise<void> {
  check(
    PRIMARY !== FALLBACK &&
      FALLBACK.length > 0 &&
      OVERPASS_CONFIG.maxAttempts === 2,
    "0. config: distinct fallback endpoint, explicit budget of 2"
  );

  // 1. Primary success → no fallback traffic at all.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  let stub = installFetchStub([okBehavior(2)], okBehavior(1));
  let res = await searchNearbyMosques({ ...coords() });
  check(res.places.length === 2, "1. primary success returns places");
  check(stub.calls() === 1, "1b. primary success uses 1 call", `got ${stub.calls()}`);
  checkUrls(stub, [PRIMARY], "1c. primary success never touches fallback");

  // 2. Primary timeout → fallback success.
  await reset();
  setSearchTimeoutBudgetForTests(60);
  stub = installFetchStub([hangBehavior(), okBehavior(2)], okBehavior(1));
  res = await searchNearbyMosques({ ...coords() });
  check(res.places.length === 2, "2. primary timeout falls back then succeeds");
  check(stub.calls() === 2, "2b. timeout fallback uses exactly 2 calls", `got ${stub.calls()}`);
  checkUrls(stub, [PRIMARY, FALLBACK], "2c. fallback tried after primary timeout");
  check(res.cached === false, "2d. fallback result not served from cache");

  // 3. Timeout on both → surfaces timeout error, budget capped at 2.
  await reset();
  setSearchTimeoutBudgetForTests(60);
  stub = installFetchStub([hangBehavior(), hangBehavior()], okBehavior(1));
  let thrown: unknown = null;
  try {
    await searchNearbyMosques({ ...coords() });
  } catch (error) {
    thrown = error;
  }
  check(
    thrown instanceof OverpassTimeoutError,
    "3. double timeout surfaces OverpassTimeoutError"
  );
  check(
    stub.calls() === OVERPASS_CONFIG.maxAttempts,
    "3b. total requests never exceed maxAttempts",
    `got ${stub.calls()}`
  );
  checkUrls(stub, [PRIMARY, FALLBACK], "3c. order is primary then fallback");

  // 4. External abort (unmount-style) → no retry, no fallback.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  stub = installFetchStub([hangBehavior()], okBehavior(1));
  const pending = searchNearbyMosques({ ...coords() });
  await sleep(30);
  abortNearbySearch();
  thrown = null;
  try {
    await pending;
  } catch (error) {
    thrown = error;
  }
  check(isAbortLike(thrown), "4. external abort rejects as abort");
  check(
    !(thrown instanceof OverpassTimeoutError),
    "4b. external abort is not misclassified as timeout"
  );
  check(stub.calls() === 1, "4c. external abort never retries", `got ${stub.calls()}`);
  checkUrls(stub, [PRIMARY], "4d. external abort never reaches fallback");

  // 5. HTTP 429 on primary → fallback success.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  stub = installFetchStub([statusBehavior(429), okBehavior(3)], okBehavior(1));
  res = await searchNearbyMosques({ ...coords() });
  check(res.places.length === 3, "5. 429 falls back then succeeds");
  check(stub.calls() === 2, "5b. 429 uses exactly 2 calls", `got ${stub.calls()}`);
  checkUrls(stub, [PRIMARY, FALLBACK], "5c. fallback tried after 429");

  // 6. HTTP 500 on both → error after exactly 2 calls.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  stub = installFetchStub(
    [statusBehavior(500), statusBehavior(503)],
    okBehavior(1)
  );
  thrown = null;
  try {
    await searchNearbyMosques({ ...coords() });
  } catch (error) {
    thrown = error;
  }
  check(thrown instanceof Error, "6. persistent 5xx surfaces an error");
  check(
    stub.calls() === OVERPASS_CONFIG.maxAttempts,
    "6b. 5xx total capped at maxAttempts",
    `got ${stub.calls()}`
  );
  checkUrls(stub, [PRIMARY, FALLBACK], "6c. order is primary then fallback");

  // 7. HTTP 400 → fatal, no fallback.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  stub = installFetchStub([statusBehavior(400)], okBehavior(1));
  thrown = null;
  try {
    await searchNearbyMosques({ ...coords() });
  } catch (error) {
    thrown = error;
  }
  check(thrown instanceof Error, "7. 400 surfaces an error");
  check(stub.calls() === 1, "7b. 400 never falls back", `got ${stub.calls()}`);
  checkUrls(stub, [PRIMARY], "7c. 400 stays on primary");

  // 8. HTTP 406 → fatal, no fallback.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  stub = installFetchStub([statusBehavior(406)], okBehavior(1));
  thrown = null;
  try {
    await searchNearbyMosques({ ...coords() });
  } catch (error) {
    thrown = error;
  }
  check(thrown instanceof Error, "8. 406 surfaces an error");
  check(stub.calls() === 1, "8b. 406 never falls back", `got ${stub.calls()}`);

  // 9. Non-JSON body → fatal, no fallback.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  stub = installFetchStub([invalidJsonBehavior()], okBehavior(1));
  thrown = null;
  try {
    await searchNearbyMosques({ ...coords() });
  } catch (error) {
    thrown = error;
  }
  check(thrown instanceof Error, "9. non-JSON surfaces an error");
  check(stub.calls() === 1, "9b. non-JSON never falls back", `got ${stub.calls()}`);

  // 10. Missing elements shape → fatal, no fallback.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  stub = installFetchStub([missingElementsBehavior()], okBehavior(1));
  thrown = null;
  try {
    await searchNearbyMosques({ ...coords() });
  } catch (error) {
    thrown = error;
  }
  check(thrown instanceof Error, "10. malformed shape surfaces an error");
  check(stub.calls() === 1, "10b. malformed shape never falls back", `got ${stub.calls()}`);

  // 11. Empty elements → success with [], no fallback.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  stub = installFetchStub([okBehavior(0)], okBehavior(1));
  res = await searchNearbyMosques({ ...coords() });
  check(
    res.places.length === 0 && res.cached === false,
    "11. empty result succeeds without fallback"
  );
  check(stub.calls() === 1, "11b. empty result uses 1 call", `got ${stub.calls()}`);
  checkUrls(stub, [PRIMARY], "11c. empty result stays on primary");

  // 12. Superseded search: newer search wins, older rejects as abort.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  stub = installFetchStub([hangBehavior(), okBehavior(1)], okBehavior(1));
  const first = searchNearbyMosques({ ...coords() });
  await sleep(30);
  const second = searchNearbyMosques({ ...coords() });
  const [s1, s2] = await Promise.allSettled([first, second]);
  check(
    s1.status === "rejected" && isAbortLike(s1.reason),
    "12. superseded search rejects as abort"
  );
  check(
    s2.status === "fulfilled" && s2.value.places.length === 1,
    "12b. newer search succeeds"
  );
  check(stub.calls() === 2, "12c. supersede issues no extra calls", `got ${stub.calls()}`);
  checkUrls(stub, [PRIMARY, PRIMARY], "12d. both attempts stay on primary");

  // --- Proxy mode (Stage Proxy-1): exactly one proxy call, no client retry.
  interface ProxyCall {
    url: string;
    body: string;
  }
  function installProxyStub(
    behaviors: Behavior[],
    fallback: Behavior
  ): { calls: () => number; proxyCalls: () => ProxyCall[] } {
    let proxyCallCount = 0;
    const proxyCalls: ProxyCall[] = [];
    const queue = [...behaviors];
    globalThis.fetch = (async (
      ...args: Parameters<typeof fetch>
    ): Promise<Response> => {
      proxyCallCount += 1;
      proxyCalls.push({
        url: String(args[0]),
        body: String(args[1]?.body ?? ""),
      });
      const signal = args[1]?.signal ?? null;
      const next = queue.shift() ?? fallback;
      return next(signal);
    }) as typeof fetch;
    return {
      calls: () => proxyCallCount,
      proxyCalls: () => [...proxyCalls],
    };
  }

  // 13. Proxy success → mapped places, single same-origin call.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  let proxyStub = installProxyStub([okBehavior(2)], okBehavior(1));
  const proxyCoords = coords();
  let proxyRes = await searchNearbyViaProxy({
    ...proxyCoords,
    category: "mosques",
  });
  check(proxyRes.places.length === 2, "13. proxy success returns places");
  check(proxyStub.calls() === 1, "13b. proxy success uses 1 call", `got ${proxyStub.calls()}`);
  {
    const only = proxyStub.proxyCalls()[0];
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(only.body) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    check(
      only.url === "/api/places" &&
        parsed.latitude === proxyCoords.latitude &&
        parsed.longitude === proxyCoords.longitude &&
        parsed.radiusMeters === 3000 &&
        parsed.category === "mosques" &&
        !("query" in parsed),
      "13c. proxy call sends coords+radius+category, never a raw query"
    );
  }

  // 14. Proxy 502 → surfaces once, never retried by the client.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  proxyStub = installProxyStub([statusBehavior(502)], okBehavior(1));
  thrown = null;
  try {
    await searchNearbyViaProxy({ ...coords() });
  } catch (error) {
    thrown = error;
  }
  check(thrown instanceof Error && !isAbortLike(thrown), "14. proxy error surfaces");
  check(
    proxyStub.calls() === 1,
    "14b. client never retries the proxy",
    `got ${proxyStub.calls()}`
  );

  // 15. Client abort during proxy call → abort-like, single call.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  proxyStub = installProxyStub([hangBehavior()], okBehavior(1));
  const proxyPending = searchNearbyViaProxy({ ...coords() });
  await sleep(30);
  abortNearbySearch();
  thrown = null;
  try {
    await proxyPending;
  } catch (error) {
    thrown = error;
  }
  check(isAbortLike(thrown), "15. proxy abort rejects as abort");
  check(proxyStub.calls() === 1, "15b. aborted proxy issues no retry");

  // 16. Proxy invalid JSON / malformed → error, single call each.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  proxyStub = installProxyStub([invalidJsonBehavior()], okBehavior(1));
  thrown = null;
  try {
    await searchNearbyViaProxy({ ...coords() });
  } catch (error) {
    thrown = error;
  }
  check(thrown instanceof Error, "16. proxy non-JSON surfaces an error");
  check(proxyStub.calls() === 1, "16b. proxy non-JSON never retried");
  await reset();
  proxyStub = installProxyStub([missingElementsBehavior()], okBehavior(1));
  thrown = null;
  try {
    await searchNearbyViaProxy({ ...coords() });
  } catch (error) {
    thrown = error;
  }
  check(thrown instanceof Error, "16c. proxy malformed surfaces an error");
  check(proxyStub.calls() === 1, "16d. proxy malformed never retried");

  // 17. Proxy empty → success; repeat served from client cache.
  await reset();
  setSearchTimeoutBudgetForTests(5000);
  proxyStub = installProxyStub([okBehavior(0)], okBehavior(1));
  const emptyCoords = coords();
  proxyRes = await searchNearbyViaProxy({ ...emptyCoords });
  check(
    proxyRes.places.length === 0 && proxyRes.cached === false,
    "17. proxy empty succeeds without retry"
  );
  proxyRes = await searchNearbyViaProxy({ ...emptyCoords });
  check(
    proxyRes.cached === true && proxyStub.calls() === 1,
    "17b. repeat proxy search served from client cache"
  );

  setSearchTimeoutBudgetForTests(null);
  globalThis.fetch = originalFetch;

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main();
