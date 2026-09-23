// Minimal service worker — just enough for "Add to Home Screen" installability.
// The app is online-only (it needs Firestore), so this does no offline caching.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => { /* pass-through */ });
