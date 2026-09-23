// Al Abbar POS — offline service worker
const CACHE = "alabbar-v14";
// Icons deliberately NOT precached so a logo swap picks up on next load.
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Icons: network-first, never let SW pin an old version.
  if (url.pathname.includes("/icons/")) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // Network-first for the HTML page (so updates land quickly), cache-first for the rest.
  if (req.mode === "navigate" || (req.destination === "document")) {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(r => {
      if (r && r.ok && url.origin === self.location.origin) {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return r;
    }).catch(() => cached))
  );
});
