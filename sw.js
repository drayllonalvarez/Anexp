// Service Worker para Anexp by Ayydoc
// Versión: 2.2 — cache bust forzado por cambio de nombre

const CACHE_NAME = 'expediente-anestesico-v2-2';

// SOLO cachear el shell mínimo; app-content.html siempre desde red
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE: borrar cachés anteriores =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(n => n !== CACHE_NAME)
          .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo requests del mismo origen
  if (url.origin !== location.origin) return;

  // app-content.html → SIEMPRE red (nunca caché)
  if (url.pathname.endsWith('app-content.html')) {
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Navegación HTML → red primero, caché de respaldo
  if (event.request.mode === 'navigate' ||
      (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request)
          .then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Otros assets (íconos, manifest) → caché primero
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
  );
});

// ===== MENSAJES =====
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
    );
  }
});
