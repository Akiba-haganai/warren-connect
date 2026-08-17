/**
 * service-worker.js
 * -----------------------------------------------------------------
 * Versioned caching + a lifecycle that avoids the classic PWA
 * "deadlock": a new SW taking control while old tabs are still
 * mid-flight on assumptions baked into the old SW.
 *
 * Bump CACHE_VERSION on every deploy. Everything else is derived
 * from it, so stale caches get cleaned up automatically.
 */

const CACHE_VERSION = "v1.0.1";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Helper: safe cache.put that never throws or breaks navigation
async function safeCachePut(cacheName, request, response) {
  try {
    if (
      response &&
      response.status === 200 &&
      (response.type === "basic" || response.type === "cors") &&
      request.url.startsWith("http") &&
      !request.url.includes("supabase.co") &&
      !request.url.includes("/api/")
    ) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
  } catch {
    // Ignore cache put errors safely
  }
}

// ---------------------------------------------------------------
// INSTALL — precache app shell safely without failing on missing assets
// ---------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await Promise.allSettled(
          PRECACHE_ASSETS.map(async (asset) => {
            try {
              const res = await fetch(asset);
              if (res.ok) await cache.put(asset, res);
            } catch {
              // Ignore single asset fetch failure
            }
          })
        );
      } catch {
        // Safe fallback
      }
    })()
  );
});

// ---------------------------------------------------------------
// ACTIVATE — drop old caches and claim clients
// ---------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        );
        await self.clients.claim();
      } catch {
        // Safe fallback
      }
    })()
  );
});

// ---------------------------------------------------------------
// MESSAGE — listen for SKIP_WAITING
// ---------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------
// FETCH — safe handling for navigation and static assets
// ---------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Only handle GET requests from http/https
  if (request.method !== "GET" || !request.url.startsWith("http")) return;

  // 2. Bypass API calls, Supabase endpoints, and auth
  if (request.url.includes("supabase.co") || request.url.includes("/api/")) return;

  // 3. Navigation requests (Page loads)
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200) {
            safeCachePut(RUNTIME_CACHE, request, fresh);
            return fresh;
          }
          const cached = await caches.match(request);
          return cached || (await caches.match("/index.html")) || fresh;
        } catch {
          const cached = await caches.match(request);
          return (
            cached ||
            (await caches.match("/index.html")) ||
            new Response("Offline", { status: 503, headers: { "Content-Type": "text/html" } })
          );
        }
      })()
    );
    return;
  }

  // 4. Static assets (stale-while-revalidate)
  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              safeCachePut(RUNTIME_CACHE, request, response);
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          // Trigger background fetch refresh
          networkFetch.catch(() => {});
          return cached;
        }

        const freshResponse = await networkFetch;
        if (freshResponse) return freshResponse;

        return Response.error();
      } catch {
        return fetch(request);
      }
    })()
  );
});
