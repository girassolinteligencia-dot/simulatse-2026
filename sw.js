// Service Worker Desativador para Forçar Atualização Imediata (Clean Cache)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Sempre busca da rede para garantir visualização em tempo real
  event.respondWith(fetch(event.request));
});
