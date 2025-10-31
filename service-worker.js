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
  // Provide navigation fallback for SPA / PWA start_url
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/mrd0x.html');
      })
    );
    return;
  }

  if (event.request.url.endsWith('index.html')) {
    // Don't cache index.html
    event.respondWith(fetch(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(fetchResponse => {
          return caches.open('v1').then(cache => {
            // Only cache successful responses
            try {
              cache.put(event.request, fetchResponse.clone()).catch(error => {
                console.error('Failed to cache fetch response:', error);
              });
            } catch (e) {
              // Some responses (opaque) may throw on put; ignore
            }
            return fetchResponse;
          });
        });
      }).catch(error => {
        console.error('Fetch event failed:', error);
      })
    );
  }
});
