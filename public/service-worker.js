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

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-72.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/favicon.ico',
];

// ---------------------------------------------------------------
// INSTALL — precache the app shell. addAll() is atomic: if a
// single asset 404s, nothing gets cached, so you never end up
// with a half-populated cache (a very common source of "works on
// my device, broken on theirs" bugs).
// ---------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_ASSETS);
      // Deliberately NOT calling skipWaiting() here. Auto-skipping
      // is the #1 cause of update deadlocks: a tab with in-flight
      // fetches suddenly gets served by a SW with different caching
      // logic mid-request. We wait for explicit consent instead —
      // see the SKIP_WAITING message handler below.
    })()
  );
});

// ---------------------------------------------------------------
// ACTIVATE — drop any cache that doesn't match the current
// version, then take control of already-open clients.
// ---------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ---------------------------------------------------------------
// MESSAGE — the only way skipWaiting() gets called. The page
// decides when it's safe (usually: user clicked "Reload" on an
// update toast). This one message is the whole coordination
// protocol and it's enough to eliminate the race.
// ---------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------
// FETCH
//  - Navigations: network-first with cache/offline fallback, so
//    users don't get permanently stuck on a stale app shell if
//    they're offline on first load.
//  - Everything else: stale-while-revalidate.
//  - Never intercept non-GET requests — mutating requests must
//    always hit the network, or you'll silently "succeed" writes
//    that never happened.
// ---------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          return cached || caches.match('/index.html');
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);

      return cached || (await networkFetch) || Response.error();
    })()
  );
});
