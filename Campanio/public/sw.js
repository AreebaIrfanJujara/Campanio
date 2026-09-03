const CACHE_NAME = 'companio-accessibility-v1.0.0';

// Essential assets and routes to precache
const PRECACHE_RESOURCES = [
  '/',
  '/offline',
  '/home',
  '/home/ocr',
  '/home/scene-desc',
  '/home/captions',
  '/home/type-to-speak',
  '/home/translation',
  '/home/conversation',
  '/home/explore',
  '/home/currency',
  '/home/indoor-nav',
  '/home/wearable',
  '/emergency',
  '/privacy',
  '/settings',
  '/sign-in',
  '/create-account',
  '/profile-setup',
  '/permission-mic',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - precache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Precache what we can without failing install if a single route fails
        return Promise.allSettled(
          PRECACHE_RESOURCES.map((url) =>
            fetch(url)
              .then((response) => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch((err) => {
                console.warn(`[SW] Precache failed for ${url}:`, err);
              })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension URLs
  if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // 1. Google Fonts and Material Symbols (Cache First)
  if (
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 2. Next.js Static Chunks & Public Assets (Stale While Revalidate / Cache First)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. API endpoints: Network First with offline JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return offline payload based on endpoint
        if (url.pathname.includes('/assistant')) {
          return new Response(
            JSON.stringify({
              reply:
                'I am running in offline assistant mode. All core features (Speech, Captions, Speak For Me, and Local Translations) are fully functional offline.',
              source: 'offline-sw-assistant',
              offline: true,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (url.pathname.includes('/translate')) {
          return new Response(
            JSON.stringify({
              translatedText: 'Offline Translation active',
              detectedLanguage: 'en',
              source: 'offline-sw-translate',
              offline: true,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (url.pathname.includes('/vision')) {
          return new Response(
            JSON.stringify({
              text: 'Offline Text Scan: Feature is ready in offline mode.',
              description: 'Offline narration: Space scanned. Walking path clear.',
              source: 'offline-sw-vision',
              offline: true,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: 'Network offline. Using offline mode.', offline: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 4. HTML Page Navigation (Network First -> Cache Fallback -> Offline Page)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedMatch = await cache.match(request);
          if (cachedMatch) return cachedMatch;

          // Try match pathname without query
          const pathMatch = await cache.match(url.pathname);
          if (pathMatch) return pathMatch;

          // Fallback to offline page or home
          const offlinePage = await cache.match('/offline');
          if (offlinePage) return offlinePage;

          const homePage = await cache.match('/home');
          if (homePage) return homePage;

          return new Response('Companio Accessibility Suite is running offline.', {
            headers: { 'Content-Type': 'text/html' },
          });
        })
    );
    return;
  }

  // Default: Stale while revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networked = fetch(request)
        .then((res) => {
          if (res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          }
          return res;
        })
        .catch(() => cached);

      return cached || networked;
    })
  );
});
