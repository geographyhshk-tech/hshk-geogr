const CACHE_NAME = "geo-edu-v8";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/modules/ui-theme.js",
  "./js/modules/auth-gate.js",
  "./js/modules/confessions.js",
  "./js/modules/posts.js",
  "./js/modules/docs.js",
  "./js/modules/exams.js",
  "./js/modules/admin.js",
  "./js/data.js",
  "./js/auth.js",
  "./js/i18n.js",
  "./js/dino-game.js",
  "./js/ai-chat.js",
  "./js/firebase-config.js",
  "./js/topojson-client.min.js",
  "./js/globe-data.js",
  "./js/globe-3d.js",
  "./assets/bg.png",
  "./assets/logo.png",
  "./assets/earth_day.jpg",
  "./assets/earth_night.jpg",
  "./assets/world_map.jpg",
  "./assets/world_map_dark.jpg",
  "./assets/countries-50m.json"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network First with Cache Fallback)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("firestore.googleapis.com") || e.request.url.includes("generativelanguage.googleapis.com")) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, resClone);
        });
        return res;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
