const CACHE = "presswell-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/bp.js",
  "./js/database.js",
  "./js/pulse-engine.js",
  "./js/camera.js",
  "./js/analytics.js",
  "./js/charts.js",
  "./js/export.js",
  "./js/reminders.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./public/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached)
    )
  );
});
