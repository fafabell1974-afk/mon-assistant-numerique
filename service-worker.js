// service-worker.js
// Version du cache pour forcer la mise à jour si nécessaire
const CACHE_NAME = 'assistant-num-v1.0.1';

// Liste des ressources statiques à mettre en cache pour le fonctionnement hors ligne
const STATIC_ASSETS = [
  './',
  './index.html',
  'manifest.json',
  'css/style.css',
  'js/db.js',
  'js/clients.js',
  'js/devices.js',
  'js/interventions.js',
  'js/documentation.js',
  'js/checklists.js',
  'js/ai.js',
  'js/google-drive.js',
  'js/backup.js',
  'js/security.js',
  'js/settings.js',
  'js/app.js',
  // Ajoutez ici vos icônes si elles existent
  'assets/icons/icon-192x192.png',
  'assets/icons/icon-512x512.png'
];

// Installation du Service Worker et mise en cache des ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie Cache-First pour les ressources statiques, Network-First pour le reste
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Pour les requêtes d'API ou externes, stratégie Network-First
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Pour les ressources statiques de l'application, stratégie Cache-First
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourne la réponse du cache si elle existe
        if (response) {
          return response;
        }
        // Sinon, fetch sur le réseau et met en cache la réponse
        return fetch(event.request).then(networkResponse => {
          // Vérifie la validité de la réponse
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          // Clone la réponse car elle ne peut être lue qu'une fois
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return networkResponse;
        });
      })
  );
});
