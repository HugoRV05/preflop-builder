// Service Worker for Preflop Builder PWA
// Version 2.0.0

const CACHE_NAME = 'preflop-builder-v2.0.0';
const STATIC_CACHE_NAME = 'preflop-builder-static-v2.0.0';
const DYNAMIC_CACHE_NAME = 'preflop-builder-dynamic-v2.0.0';
const GOOGLE_FONTS_CACHE = 'google-fonts';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Essential files to cache for offline functionality
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/main.js',
  './assets/default-preflop-ranges-v1.json',
  // Add icon paths when they exist
  // './assets/icon-192.png',
  // './assets/icon-512.png'
];

// Network-first resources (try network, fallback to cache)
const NETWORK_FIRST_PATHS = [
  './assets/default-preflop-ranges-v1.json'
];

// Cache-first resources (serve from cache, update in background)
const CACHE_FIRST_PATHS = [
  './css/styles.css',
  './js/main.js'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches
              return cacheName.startsWith('preflop-builder-') && 
                     cacheName !== STATIC_CACHE_NAME && 
                     cacheName !== DYNAMIC_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Google Fonts (external) - handle with CacheFirst (1 year)
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(googleFontsCacheFirst(request));
    return;
  }
  
  // Skip external requests (fonts, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

// Main fetch handler with different strategies
async function handleFetch(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // Network-first strategy for dynamic content
    if (NETWORK_FIRST_PATHS.some(path => pathname.includes(path))) {
      return await networkFirst(request);
    }
    
    // Cache-first strategy for static assets
    if (CACHE_FIRST_PATHS.some(path => pathname.includes(path))) {
      return await cacheFirst(request);
    }
    
    // Default: Stale-while-revalidate for HTML pages
    return await staleWhileRevalidate(request);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    
    // Fallback for navigation requests
    if (request.mode === 'navigate') {
      return await caches.match('./index.html');
    }
    
    // Return error response for other requests
    return new Response('Network error', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// CacheFirst strategy for Google Fonts with manual 1-year expiration
async function googleFontsCacheFirst(request) {
  const cache = await caches.open(GOOGLE_FONTS_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const isExpired = await isGoogleFontEntryExpired(cache, request);
    if (!isExpired) {
      return cachedResponse;
    }
    // Try to refresh expired entry; fall back to stale cache on failure
    try {
      const networkResponse = await fetch(request, { cache: 'no-store' });
      if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
        await putWithTimestamp(cache, request, networkResponse.clone());
        return networkResponse;
      }
    } catch (e) {
      // Ignore and return stale cache
    }
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
      await putWithTimestamp(cache, request, networkResponse.clone());
    }
    return networkResponse;
  } catch (e) {
    return new Response('', { status: 504, statusText: 'Gateway Timeout' });
  }
}

async function isGoogleFontEntryExpired(cache, request) {
  try {
    const metaRequest = new Request(request.url + '::meta');
    const metaResponse = await cache.match(metaRequest);
    if (!metaResponse) {
      return true;
    }
    const meta = await metaResponse.json();
    return (Date.now() - (meta.timestamp || 0)) > ONE_YEAR_MS;
  } catch (e) {
    return false;
  }
}

async function putWithTimestamp(cache, request, response) {
  await cache.put(request, response);
  const meta = new Response(JSON.stringify({ timestamp: Date.now() }), {
    headers: { 'Content-Type': 'application/json' }
  });
  const metaRequest = new Request(request.url + '::meta');
  await cache.put(metaRequest, meta);
}

// Network-first strategy: try network, fallback to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache-first strategy: serve from cache, update in background
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  // If not in cache, fetch from network
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(STATIC_CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Stale-while-revalidate strategy: serve from cache, update in background
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // Always try to update from network in background
  const networkPromise = updateCacheInBackground(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, wait for network response
  return await networkPromise;
}

// Update cache in background
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Background update failed for:', request.url);
    return null;
  }
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background sync for future offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    // Add background sync logic here if needed
  }
});

// Push notification support (for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: './assets/icon-192.png',
      badge: './assets/icon-192.png',
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow('./')
  );
});

console.log('[SW] Service worker script loaded');
