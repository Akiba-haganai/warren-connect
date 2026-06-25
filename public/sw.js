// public/sw.js
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Pre‑cache all static assets injected by the build
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// Cache Supabase REST API calls (GET only)
workbox.routing.registerRoute(
  /^https:\/\/[a-z]+\.supabase\.co\/rest\/v1\/.*/i,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'supabase-api',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 5,
      }),
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache Supabase storage images
workbox.routing.registerRoute(
  /^https:\/\/[a-z]+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
  new workbox.strategies.CacheFirst({
    cacheName: 'supabase-images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  })
);

// =================== PUSH NOTIFICATIONS ===================
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    data: {
      url: data.url || '/',
    },
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Warren Connect', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});