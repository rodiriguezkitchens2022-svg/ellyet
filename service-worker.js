self.addEventListener('install', (event) => {
  const CACHE_NAME = 'my-cache-v1';
  const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/icons-192.png',
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        urlsToCache.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Failed ${res.status} ${url}`);
            await cache.put(url, res.clone());
            return { url, status: 'fulfilled' };
          } catch (err) {
            return { url, status: 'rejected', reason: String(err) };
          }
        })
      );

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length) {
        console.warn('Some resources failed to cache during install:', failed);
      }
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Navigation fallback for PWA start_url
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/mrd0x.html'))
    );
    return;
  }

  // Only handle same-origin GET requests
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    // Let the network handle non-GET or cross-origin requests
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Only cache successful (status 200) same-origin responses
        if (!response || response.status !== 200) return response;

        // Clone and store safe responses
        const responseClone = response.clone();
        caches.open('my-cache-v1').then(cache => {
          cache.put(request, responseClone).catch(err => {
            console.error('Failed to cache fetch response:', err);
          });
        });

        return response;
      }).catch(err => {
        console.error('Fetch handling failed:', err);
        // Optional: return a fallback asset here
      });
    })
  );
});
