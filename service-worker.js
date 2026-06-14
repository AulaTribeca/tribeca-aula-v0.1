/* Tribeca Aula · Service worker v166 · PWA, caché ligera, push con payload cifrado y badge */
const TRIBECA_CACHE = 'tribeca-aula-static-v166';
const TRIBECA_STATIC_MATCH = /\.(?:html|css|js|webmanifest|png|webp|svg|ico)$/i;
const TRIBECA_INSTALL_ASSETS = [
  './manifest.webmanifest',
  './assets/tribeca-pwa-icon-192.png',
  './assets/tribeca-pwa-icon-512.png',
  './assets/favicon.png',
  './assets/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(TRIBECA_CACHE);
    await Promise.allSettled(TRIBECA_INSTALL_ASSETS.map(async url => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response && response.ok) await cache.put(url, response.clone());
      } catch (_error) {}
    }));
    await self.skipWaiting();
  })());
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

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('network-timeout')), ms));
}

async function networkFirst(request, fallbackUrl, maxWait = 3500) {
  const cache = await caches.open(TRIBECA_CACHE);
  try {
    const fresh = await Promise.race([fetch(request), timeout(maxWait)]);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (_error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    try {
      const fresh = await fetch(request);
      if (fresh && fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    } catch (_finalError) {
      return new Response('Tribeca Aula no está disponible sin conexión en este momento.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(TRIBECA_CACHE);
  const cached = await caches.match(request);
  const freshPromise = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || freshPromise || new Response('', { status: 504 });
}

async function setTribecaBadge(count = 0) {
  const safeCount = Math.max(0, Math.min(Number(count || 0), 99));
  try {
    if (self.navigator?.setAppBadge && self.navigator?.clearAppBadge) {
      if (safeCount > 0) await self.navigator.setAppBadge(safeCount);
      else await self.navigator.clearAppBadge();
    }
  } catch (_error) {}
}

self.addEventListener('fetch', event => {
  if (!shouldHandle(event.request)) return;
  const request = event.request;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html', 3000));
    return;
  }
  if (TRIBECA_STATIC_MATCH.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'TRIBECA_BADGE_COUNT') {
    event.waitUntil?.(setTribecaBadge(event.data.count || 0));
  }
});

self.addEventListener('push', event => {
  const fallback = {
    title: 'Tribeca Aula',
    body: 'Tienes una novedad en Tribeca Aula. Abre la app para verla.',
    url: './',
    icon: './assets/tribeca-pwa-icon-192.png',
    badge: './assets/tribeca-pwa-icon-192.png',
    badgeCount: 1
  };
  let data = fallback;
  try {
    data = { ...fallback, ...(event.data ? event.data.json() : {}) };
  } catch (_error) {
    data = fallback;
  }
  const options = {
    body: data.body || fallback.body,
    icon: data.icon || fallback.icon,
    badge: data.badge || fallback.badge,
    tag: data.tag || `tribeca-${data.type || 'notice'}-${Date.now()}`,
    renotify: true,
    vibrate: [80, 40, 80],
    data: {
      url: data.url || './',
      type: data.type || 'notice'
    }
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title || fallback.title, options),
    setTribecaBadge(data.badgeCount || 1),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'TRIBECA_PUSH_RECEIVED', notification: data }));
    })
  ]));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification?.data?.url || './';
  event.waitUntil((async () => {
    const absolute = new URL(target, self.location.origin + self.location.pathname).href;
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client && new URL(client.url).origin === self.location.origin) {
        await client.focus();
        client.postMessage({ type: 'TRIBECA_NOTIFICATION_OPEN', url: absolute });
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(absolute);
  })());
});
