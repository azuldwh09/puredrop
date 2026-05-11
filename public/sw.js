// PureDrop Service Worker
// Bump this version string on every deploy to force cache invalidation
const CACHE_VERSION = 'v' + Date.now();
const CACHE_NAME = 'puredrop-' + CACHE_VERSION;

// On install: skip waiting immediately so the new SW takes over right away
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// On activate: delete ALL old caches and claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first strategy: always try network, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin API requests entirely
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache valid same-origin responses
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
