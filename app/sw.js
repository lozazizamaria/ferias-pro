/* ===== Service Worker PWA — Férias Pro ===== */
const CACHE = "ferias-pro-v16";
const SHELL = [
  "/",
  "/index.html",
  "/como-usar.html",
  "/styles.css?v=16",
  "/sobre.css?v=16",
  "/vehicles.js?v=16",
  "/countries.js?v=16",
  "/data.js?v=16",
  "/maps.js?v=16",
  "/calendar.js?v=16",
  "/report.js?v=16",
  "/api.js?v=16",
  "/app.js?v=16",
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
