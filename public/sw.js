/*
 * Verdict service worker: keeps the app shell, build files, icons and sample
 * images available offline. API calls always go to the network, so scan
 * results are never stale and nothing that spends units is cached.
 */
const CACHE = 'verdict-v1';

/** How a GET request is served: 'cache-first', 'network-first' or 'network-only'. */
function cacheRule(url, mode) {
  const u = new URL(url);
  if (u.origin !== self.location.origin) return 'network-only';
  if (u.pathname.startsWith('/api/')) return 'network-only';
  if (/^\/(_next\/static|sample|icons|fixtures)\//.test(u.pathname)) return 'cache-first';
  if (mode === 'navigate') return 'network-first';
  return 'network-only';
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  } catch {
    // Offline: the page itself, or the shelf as a fallback (all data lives in the browser).
    return (await caches.match(request)) || (await caches.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const rule = cacheRule(request.url, request.mode);
  if (rule === 'cache-first') event.respondWith(cacheFirst(request));
  else if (rule === 'network-first') event.respondWith(networkFirst(request));
});
