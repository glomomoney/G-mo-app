const STATIC_CACHE_NAME = 'wanda-static-cache-v3';
const DATA_CACHE_NAME = 'wanda-user-data-cache-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/wanda_logo.jpg'
];

// Endpoints for user ride history and wallet balance
const DATA_ENDPOINTS = [
  '/api/wallet',
  '/api/history',
  '/api/user-data'
];

// Install Event - Pre-cache critical static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching critical static assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper to create a JSON Response for cache storage
function createJsonResponse(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
      'X-Wanda-Offline-Source': 'service-worker-cache',
      'X-Wanda-Cached-At': new Date().toISOString()
    }
  });
}

// Handle Service Worker messages from the main application
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  const { type, payload } = event.data;

  if (type === 'CACHE_WALLET_BALANCE') {
    caches.open(DATA_CACHE_NAME).then((cache) => {
      const response = createJsonResponse({
        success: true,
        passengerWallet: payload.passengerWallet,
        driverWallet: payload.driverWallet,
        updatedAt: new Date().toISOString(),
        offlineCached: true
      });
      cache.put('/api/wallet', response);
      console.log('[Service Worker] Cached wallet balance successfully');
    });
  }

  if (type === 'CACHE_RIDE_HISTORY') {
    caches.open(DATA_CACHE_NAME).then((cache) => {
      const response = createJsonResponse({
        success: true,
        history: payload.history,
        totalRides: payload.history?.length || 0,
        updatedAt: new Date().toISOString(),
        offlineCached: true
      });
      cache.put('/api/history', response);
      console.log('[Service Worker] Cached ride history successfully');
    });
  }

  if (type === 'SYNC_ALL_USER_DATA') {
    caches.open(DATA_CACHE_NAME).then((cache) => {
      if (payload.passengerWallet !== undefined) {
        cache.put('/api/wallet', createJsonResponse({
          success: true,
          passengerWallet: payload.passengerWallet,
          driverWallet: payload.driverWallet,
          updatedAt: new Date().toISOString(),
          offlineCached: true
        }));
      }
      if (payload.history) {
        cache.put('/api/history', createJsonResponse({
          success: true,
          history: payload.history,
          totalRides: payload.history.length,
          updatedAt: new Date().toISOString(),
          offlineCached: true
        }));
      }
      console.log('[Service Worker] Full user data synced to offline cache');
    });
  }
});

// Fetch Event - Strategic Caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions/protocols
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. Intercept User Data API Endpoints (/api/wallet, /api/history) - Network-First with Cache Fallback
  if (DATA_ENDPOINTS.some((endpoint) => url.pathname.startsWith(endpoint))) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log(`[Service Worker] Offline fallback triggered for ${url.pathname}`);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If match by request fails, try matching by path endpoint
          const fallbackPath = url.pathname.includes('wallet') ? '/api/wallet' : '/api/history';
          const altCached = await caches.match(fallbackPath);
          if (altCached) {
            return altCached;
          }
          // Default offline JSON if nothing in cache yet
          return createJsonResponse({
            offlineCached: true,
            error: false,
            message: 'Served from Service Worker default offline state',
            history: [],
            passengerWallet: 0,
            driverWallet: 0
          });
        })
    );
    return;
  }

  // 2. Handle HTML navigation requests: Network-First falling back to Cache
  if (request.mode === 'navigate' || (request.headers.get('Accept') && request.headers.get('Accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // 3. Handle static assets: Stale-While-Revalidate
  const isStaticAsset = 
    url.pathname.includes('/assets/') || 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.json') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.jpeg') || 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.ico') || 
    url.host.includes('fonts.googleapis.com') || 
    url.host.includes('fonts.gstatic.com') || 
    url.host.includes('unpkg.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.log('[Service Worker] Asset fetch failed, using cached asset', err);
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default fallback: Network-First
  event.respondWith(
    fetch(request)
      .then((response) => response)
      .catch(() => caches.match(request))
  );
});
