// public/sw.js
// Minimal service worker for UCC IPO PWA — enables installability
// Uses network-only strategy to prevent stale/cached data issues.
// No Supabase requests, API calls, or auth pages are cached.

const CACHE_NAME = 'ucc-ipo-sw-v1';

self.addEventListener('install', () => {
  // Activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Take control of all open clients immediately
      self.clients.claim(),
      // Remove any old cache versions if they exist
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

// Network-only fetch handler — all requests go directly to the network.
// This ensures no stale content is ever served, which is critical for
// a live authenticated system like UCC IPO.
self.addEventListener('fetch', (event) => {
  // Only handle GET requests; skip non-GET (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (Supabase API, CDN, etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Pass everything through to the network
  event.respondWith(fetch(event.request));
});
