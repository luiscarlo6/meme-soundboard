const CACHE_NAME = "meme-soundboard-v7";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./meme/",
  "./meme/index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/meme.js",
  "./data/memes.json",
  "./public/icons/icon-192.svg",
  "./public/icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isRuntimeAsset =
    isSameOrigin &&
    (requestUrl.pathname.startsWith("/public/media/") ||
      requestUrl.pathname.startsWith("/data/"));
  const isNavigationOrManifest =
    isSameOrigin &&
    (event.request.mode === "navigate" ||
      requestUrl.pathname.endsWith(".html") ||
      requestUrl.pathname.endsWith(".webmanifest") ||
      requestUrl.pathname === "/" ||
      requestUrl.pathname.endsWith("/"));

  if (isRuntimeAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);

        try {
          const response = await fetch(event.request);
          cache.put(event.request, response.clone());
          return response;
        } catch (error) {
          if (cached) {
            return cached;
          }

          throw error;
        }
      })
    );
    return;
  }

  if (isNavigationOrManifest) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (error) {
          const cached = await cache.match(event.request);
          if (cached) {
            return cached;
          }
          throw error;
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
