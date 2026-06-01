const CACHE_NAME = 'tracker-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/employee/tracking',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});

// Background Sync for location data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-location') {
    event.waitUntil(syncLocations());
  }
});

async function syncLocations() {
  // This would ideally access IndexedDB to sync locations
  // Standard localStorage is not available in Service Workers
  console.log('Background Sync triggered');
}
