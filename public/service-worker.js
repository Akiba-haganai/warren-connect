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

const CACHE_VERSION = "v1.0.3";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const SUPABASE_IMAGE_CACHE = "supabase-images";
const SUPABASE_IMAGE_MAX_ENTRIES = 200;

// Manifest injected by VitePWA with injectManifest strategy
const precacheManifest = self.__WB_MANIFEST || [];

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  ...precacheManifest.map((entry) => (typeof entry === "string" ? entry : entry.url)),
];

function isSupabaseImageRequest(url) {
  return (
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.includes("/storage/v1/object/public/")
  );
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
    await trimCache(cache, maxEntries);
  }
}

async function staleWhileRevalidateSupabaseImage(request) {
  const cache = await caches.open(SUPABASE_IMAGE_CACHE);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then(async (response) => {
      if (response && response.status === 200) {
        await cache.put(request, response.clone());
        await trimCache(cache, SUPABASE_IMAGE_MAX_ENTRIES);
      }
      return response;
    })
    .catch(() => cached);
  return cached || networkFetch;
}

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
            .filter(
              (key) =>
                key !== STATIC_CACHE &&
                key !== RUNTIME_CACHE &&
                key !== SUPABASE_IMAGE_CACHE
            )
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
// FETCH — resilient handling for navigation and static assets
// ---------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Only handle GET requests from http/https
  if (request.method !== "GET" || !request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // 2. Supabase Storage Public Images — Stale-While-Revalidate
  if (isSupabaseImageRequest(url)) {
    event.respondWith(staleWhileRevalidateSupabaseImage(request));
    return;
  }

  // 3. Bypass API calls, Supabase endpoints, version checks, and backend functions
  if (
    request.url.includes("/api/") ||
    request.url.includes("/version.json")
  ) {
    return;
  }

  // 4. Navigation requests (Page loads) — Network-first, fallback to index.html
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
          const fallbackShell = await caches.match("/index.html");
          if (cached) return cached;
          if (fallbackShell) return fallbackShell;
          // Return valid 200 offline fallback rather than throwing 503
          return new Response(
            `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>PLAWZA Offline</title><style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px;background:#0f172a;color:#fff}h1{color:#00897B;font-size:24px}p{color:#94a3b8;font-size:14px}button{background:#00897B;color:#fff;border:none;padding:10px 20px;border-radius:9999px;font-weight:bold;cursor:pointer;margin-top:16px}</style></head><body><h1>PLAWZA</h1><p>You appear to be offline. Please check your internet connection.</p><button onclick="window.location.reload()">Retry</button></body></html>`,
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
    return;
  }

  // 5. Static assets (JS, CSS, images) — Network-first with silent cache fallback
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          safeCachePut(RUNTIME_CACHE, request, networkResponse);
        }
        return networkResponse;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Network down and no cache — return a clean 503 so the
        // browser logs a normal failed-fetch, not an unhandled rejection.
        return new Response("Network error: offline", {
          status: 503,
          statusText: "Service Unavailable",
        });
      }
    })()
  );
});

// ---------------------------------------------------------------
// PUSH — handle incoming Web Push notifications in background
// ---------------------------------------------------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "PLAWZA Notification";
    const options = {
      body: payload.body || payload.message || "",
      icon: payload.icon || "/icons/icon-192.png",
      badge: "/icons/icon-72.png",
      data: payload.data || { url: payload.url || "/" },
      vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // Fallback for plain text push payloads
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("PLAWZA", {
        body: text,
        icon: "/icons/icon-192.png",
        data: { url: "/" },
      })
    );
  }
});

// ---------------------------------------------------------------
// NOTIFICATION CLICK — focus open tab or navigate to notification URL
// ---------------------------------------------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // If an existing tab is open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }

      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

