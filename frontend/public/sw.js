// Service worker minimal : cache l'app shell pour un accès hors-ligne rapide.
// Stratégie : network-first pour l'API, cache-first pour les assets statiques.
const CACHE = 'promodev-ete-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Ne jamais mettre en cache l'API : toujours réseau.
  if (url.pathname.startsWith('/api')) {
    e.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ error: 'Hors-ligne' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    return
  }

  // Navigation (SPA) : réseau puis repli sur le cache de l'app shell.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  // Assets : cache d'abord, sinon réseau (et on met en cache).
  e.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
    )
  )
})
