const CACHE_NAME = "gabi-catalog-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/style.css",
    "/script.js",
    "/products.json",
    "/images/fav.png"
    // אפשר להוסיף את כל הקבצים/תמונות שתרצה שיהיו זמינים גם באופליין
];

// התקנה (install)
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

// שליפה מהמטמון (fetch)
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
