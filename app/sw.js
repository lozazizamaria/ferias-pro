/* ===== Service Worker PWA — Férias Pro ===== */
const CACHE = "ferias-pro-v14";
const SHELL = [
  "/",
  "/index.html",
  "/styles.css?v=14",
  "/vehicles.js?v=14",
  "/countries.js?v=14",
  "/data.js?v=14",
  "/maps.js?v=14",
  "/calendar.js?v=14",
  "/report.js?v=14",
  "/api.js?v=14",
  "/app.js?v=14",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return; // Sempre online para sincronização e anexos
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
