/**
 * sw.js - Service Worker Seguro para Simula Já MS 2026 (PWA Offline First)
 * Estratégia:
 * 1. Cache-First com Stale-While-Revalidate para ativos estáticos da aplicação.
 * 2. Bypass total de cache e isolamento para chamadas dinâmicas (/api/* e telemetria).
 * 3. Limpeza automática de versões obsoletas no evento de ativação.
 */

const CACHE_NAME = 'simulatse-pwa-v2.1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/interactive.css',
  './js/app.js',
  './js/cryptoStorage.js',
  './js/partyLogos.js',
  './js/telemetry.js',
  './js/data/candidateStore.js',
  './js/data/candidatos_2026.json',
  './js/data/partidos_2026.json',
  './js/engine/electoralRules.js',
  './js/engine/validator.js',
  './js/scenarios/scenarioManager.js',
  './js/scenarios/shareManager.js',
  './js/scenarios/comparisonDashboard.js',
  './js/interactive/interactiveSimulator.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache dos ativos estáticos principais (com fallback silencioso caso algum arquivo opcional não exista)
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[SW] Falha ao pré-cachear:', asset, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purgando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Não intercepta chamadas não GET (ex: POST para telemetria /api/telemetry)
  if (request.method !== 'GET') {
    return;
  }

  // Ignora completamente rotas de API da telemetria ou externas para isolamento estrito
  if (url.pathname.startsWith('/api/') || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Estratégia: Stale-While-Revalidate para os recursos locais do PWA
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);

      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // Em caso de offline, cachedResponse será retornado se existir
          return null;
        });

      return cachedResponse || (await fetchPromise) || caches.match('./index.html');
    })
  );
});
