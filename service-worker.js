// Service Worker for Trace Classroom CRM
// Works with both custom domain and GitHub Pages subpath

const CACHE_NAME = "trace-classroom-crm-v1";

// Get base path from current location
const getBasePath = () => {
  // For custom domain, base path is "/"
  // For GitHub Pages subpath, it's "/trace-classroom-crm/"
  const pathname = self.location.pathname;
  if (pathname.startsWith("/trace-classroom-crm/")) {
    return "/trace-classroom-crm/";
  }
  return "/";
};

const BASE_PATH = getBasePath();

const urlsToCache = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}favicon.png`,
  `${BASE_PATH}manifest.json`,
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching files", urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Service Worker: Cache failed", error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Deleting old cache", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return (
        response ||
        fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (
              !response ||
              response.status !== 200 ||
              response.type !== "basic"
            ) {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // Return offline page if available
            if (event.request.destination === "document") {
              return caches.match(`${BASE_PATH}index.html`);
            }
          })
      );
    })
  );
});
