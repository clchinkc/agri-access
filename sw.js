// Service Worker for Agri-Access Offline PWA
const CACHE_NAME = 'agri-access-v1.0';
const STATIC_CACHE = 'agri-access-static-v1.0';
const DYNAMIC_CACHE = 'agri-access-dynamic-v1.0';

// Core files to cache for offline functionality
const CORE_FILES = [
  '/',
  '/index.html',
  '/mobile',
  '/index-mobile.html',
  '/shared.css',
  '/styles.css', 
  '/mobile.css',
  '/shared.js',
  '/manifest.json'
];

// API endpoints to cache responses
const API_CACHE_PATTERNS = [
  '/api/analyze',
  '/api/analyze/indonesian',
  '/api/slik'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching core files...');
        return cache.addAll(CORE_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle core files
  if (CORE_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request);
        })
    );
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      handleApiRequest(request)
    );
    return;
  }
  
  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then((fetchResponse) => {
            // Only cache successful responses
            if (fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return fetchResponse;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle API requests with offline fallback
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for analysis requests
    if (request.url.includes('/api/analyze')) {
      return new Response(JSON.stringify({
        success: false,
        offline: true,
        error: 'Network unavailable. Please try again when online.',
        message: 'Analisis akan tersedia ketika koneksi internet pulih.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw new Error('Network and cache unavailable');
    
  } catch (error) {
    // Try cache for all requests
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return generic offline response
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      error: 'Service unavailable offline'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      // Process any pending offline submissions
      processOfflineSubmissions()
    );
  }
});

// Process offline form submissions when back online
async function processOfflineSubmissions() {
  try {
    // Get offline submissions from IndexedDB
    const offlineData = await getOfflineSubmissions();
    
    for (const submission of offlineData) {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission.data)
        });
        
        if (response.ok) {
          // Remove successful submission from offline storage
          await removeOfflineSubmission(submission.id);
          console.log('Offline submission processed:', submission.id);
        }
      } catch (error) {
        console.log('Failed to process offline submission:', error);
      }
    }
  } catch (error) {
    console.log('Error processing offline submissions:', error);
  }
}

// Helper functions for offline storage (would use IndexedDB in production)
async function getOfflineSubmissions() {
  // Placeholder - would implement IndexedDB storage
  return [];
}

async function removeOfflineSubmission(id) {
  // Placeholder - would implement IndexedDB removal
  console.log('Would remove offline submission:', id);
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});