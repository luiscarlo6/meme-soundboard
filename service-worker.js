const CACHE_NAME = "meme-soundboard-v1";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/memes.js",
  "./public/icons/icon-192.svg",
  "./public/icons/icon-512.svg",
  "./public/media/airhorn.svg",
  "./public/media/bonk.svg",
  "./public/media/dramatic.svg",
  "./public/media/fail.svg",
  "./public/media/goat.svg",
  "./public/media/sus.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
