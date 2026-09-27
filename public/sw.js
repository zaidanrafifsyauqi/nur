/**
 * Stage 5C — NUR service worker (vanilla, zero dependencies).
 *
 * Strategy (deliberately conservative):
 * - Navigation: NETWORK FIRST → cached page → /offline fallback.
 *   Online responses stay the source of truth; cached pages are only a
 *   fallback and must never be presented as fresh data.
 * - Same-origin static assets (/_next/static/*, /icons/*, /maplibre/*,
 *   top-level SVGs): CACHE FIRST (versioned/hash-based upstream).
 * - Everything else (external tiles, APIs, fonts, non-GET): NETWORK ONLY.
 *   No API responses, no coordinates, no user data are ever cached here.
 *   Browser key-value storage stays exactly that — this cache is not an
 *   app database.
 *
 * Lifecycle: versioned cache names, old nur-* caches purged on activate,
 * skipWaiting + clients.claim for prompt updates. No reload logic anywhere
 * (no infinite-reload risk by construction).
 *
 * NOTE: served from /sw.js (public/). Registered production-only by
 * ServiceWorkerRegister. Never imported by app code.
 */

/// <reference lib="webworker" />

const STATIC_CACHE = "nur-static-v1";
const PAGES_CACHE = "nur-pages-v1";
const OFFLINE_URL = "/offline";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(PAGES_CACHE);
        await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      } catch {
        // Offline page caching is best-effort; activation proceeds anyway.
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              name.startsWith("nur-") && name !== STATIC_CACHE && name !== PAGES_CACHE
          )
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

function isSameOriginStaticAsset(url: URL): boolean {
  if (url.origin !== self.location.origin) return false;
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/maplibre/")
  ) {
    return true;
  }
  // Top-level static files (favicon, svg illustrations).
  return /^\/[^/]+\.(svg|png|ico|woff2?)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // external: network only

  // Navigation: network first, cached page, then /offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        } catch {
          const cached =
            (await caches.match(request, { cacheName: PAGES_CACHE }).catch(() => null)) ??
            (await caches.match(OFFLINE_URL, { cacheName: PAGES_CACHE }).catch(() => null));
          if (cached) return cached;
          throw new Error("offline without fallback");
        }
      })()
    );
    return;
  }

  // Versioned same-origin statics: cache first.
  if (isSameOriginStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request, { cacheName: STATIC_CACHE }).catch(() => null);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      })()
    );
  }
});
