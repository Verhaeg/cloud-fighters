// Offline support: the page itself is network-first (so updates show up when online),
// everything else (icons, manifest, bundled font) is served from cache and refreshed in the background.
const CACHE = 'cloud-fighters-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png',
  './fonts/silkscreen-latin.woff2', './fonts/silkscreen-latin-ext.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { // network first, cached page when offline
    e.respondWith(fetch(req).then(r => { caches.open(CACHE).then(c => c.put('./index.html', r.clone())); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => { // stale-while-revalidate
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
