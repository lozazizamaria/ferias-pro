/* ===== Service Worker PWA — My Plan (Network-First Shell + Leituras Offline) ===== */
const CACHE = "my-plan-v57";
const DATA_CACHE = "my-plan-data-v57";
const SHELL = [
  "/",
  "/index.html",
  "/como-usar.html",
  "/styles.css?v=57",
  "/sobre.css?v=57",
  "/vehicles.js?v=57",
  "/countries.js?v=57",
  "/data.js?v=57",
  "/maps.js?v=57",
  "/calendar.js?v=57",
  "/drive.js?v=57",
  "/report.js?v=57",
  "/api.js?v=57",
  "/minutes.js?v=57",
  "/pro.js?v=57",
  "/app.js?v=57",
  "/manifest.webmanifest?v=57",
  "/icons/icon-192.png?v=57",
  "/icons/icon-512.png?v=57",
  "/icons/icon.svg?v=57"
];

/* Apenas leituras essenciais GET ficam disponíveis em fallback offline read-only. */
const OFFLINE_API = [
  "/api/auth/me",
  "/api/auth/config",
  "/api/trips",
  "/api/crossings"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE && k !== DATA_CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

async function networkFirstApi(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(DATA_CACHE).then(c => c.put(request, copy)).catch(() => {});
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Offline-Cache", "1");
      return new Response(await cached.blob(), { status: cached.status, headers });
    }
    return new Response(
      JSON.stringify({ ok: false, offline: true, error: "Sem conexão e sem dados em cache offline para esta consulta." }),
      { status: 503, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.includes("/attachments/") || url.pathname.includes("/download") || url.pathname.includes("/pkpass")) return;
    if (!OFFLINE_API.some(p => url.pathname === p || url.pathname.startsWith(p + "/"))) return;
    event.respondWith(networkFirstApi(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const fallback = await caches.match("/index.html");
          if (fallback) return fallback;
        }
        throw new Error("offline");
      })
  );
});
