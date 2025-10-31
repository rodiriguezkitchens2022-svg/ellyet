self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/mrd0x.html',
        '/index.html',
        '/manifest.json',
        '/styles.css',
        '/images/icons-192.png'
      ]).catch(error => {
        console.error('Failed to cache resources during install:', error);
      });
    }).then(() => {
      // Activate this SW immediately
      return self.skipWaiting();
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
        caches.open('v1').then(cache => {
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
