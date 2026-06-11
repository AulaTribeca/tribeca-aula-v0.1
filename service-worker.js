/* Tribeca Aula · Service worker v150 */
const TRIBECA_CACHE = 'tribeca-aula-static-v150';
const TRIBECA_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './supabase-auth.js',
  './supabase-config.js',
  './manifest.webmanifest',
  './assets/tribeca-pwa-icon-192.png',
  './assets/tribeca-pwa-icon-512.png',
  './assets/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(TRIBECA_CACHE)
      .then(cache => Promise.allSettled(TRIBECA_ASSETS.map(url => fetch(url, { cache: 'reload' }).then(response => {
        if (response && response.ok) return cache.put(url, response.clone());
        return null;
      }).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('tribeca-aula-static-') && key !== TRIBECA_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function shouldHandle(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return true;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(TRIBECA_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (_error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response('Tribeca Aula no está disponible sin conexión en este momento.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

self.addEventListener('fetch', event => {
  if (!shouldHandle(event.request)) return;
  const request = event.request;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }
  if (/\.(?:html|css|js|webmanifest|png|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
  }
});
