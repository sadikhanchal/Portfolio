const CACHE = 'oza-staffs-shell-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('oza-staffs-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  const scope = new URL(self.registration.scope);
  const isShell = url.origin === scope.origin && url.pathname.startsWith(scope.pathname) && (event.request.mode === 'navigate' || /\/(index\.html|manifest\.json|icon-(192|512)\.png)$/.test(url.pathname));
  const isSdk = url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/10.12.2/');
  if (!isShell && !isSdk) return; // Never cache Firestore/auth requests here.
  const key = event.request.mode === 'navigate' ? new URL('index.html', scope).href : event.request;
  const update = caches.open(CACHE).then(async cache => {
    const response = await fetch(event.request);
    if (response.ok) await cache.put(key, response.clone());
    return response;
  });
  event.waitUntil(update.catch(() => {}));
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(key)) || update));
});
