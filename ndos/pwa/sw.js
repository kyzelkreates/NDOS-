// NDOS — Service Worker
// Offline-first caching for daily structure support

const CACHE_NAME = "ndos-v2";

const PRECACHE = [
  "/",
  "/index.html",
  "/ui/ndos.css",
  "/index.js",
  "/ui/dashboard.js",
  "/core/storage.js",
  "/core/state.js",
  "/core/tasks.js",
  "/core/routines.js",
  "/engine/cognitive-engine.js",
  "/engine/routine-engine.js",
  "/pwa/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
