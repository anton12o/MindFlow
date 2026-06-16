const CACHE_NAME = 'mindflow-v1.2.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
  self.clients.claim();
});

// Listen for skip-waiting message from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function networkFirst(event) {
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse.ok && event.request.url.startsWith('http')) {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then((cached) => {
        return cached || new Response('Offline', { status: 503 });
      });
    })
  );
}

function cacheFirst(event) {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok && event.request.url.startsWith('http')) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
}

// Fetch: network-first for navigation and JS chunks, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // Network-first for HTML navigation and JS/CSS chunks (avoids stale chunk errors)
  if (event.request.mode === 'navigate' || url.pathname.startsWith('/assets/')) {
    networkFirst(event);
    return;
  }

  // Cache-first for everything else (icons, manifest, etc.)
  cacheFirst(event);
});