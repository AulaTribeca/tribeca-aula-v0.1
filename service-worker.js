/* Tribeca Aula · Service worker v151 · PWA, caché, push y badge */
const TRIBECA_CACHE = 'tribeca-aula-static-v151';
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
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }
  if (/\.(?:html|css|js|webmanifest|png|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
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
    body: 'Tienes una novedad en Tribeca Aula.',
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
    tag: data.tag || `tribeca-${data.type || 'notice'}`,
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
