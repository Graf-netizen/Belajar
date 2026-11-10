// Service worker BELAJAR. Naikkan VERSION setiap kali index.html diperbarui agar cache lama dibuang.
const VERSION = 'belajar-v2';
const LOCAL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
const LIBS = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(LOCAL);
    // Library eksternal disimpan saat pertama dibuka online; jika gagal, akan disimpan saat dipakai.
    await Promise.allSettled(LIBS.map(async u => { const r = await fetch(new Request(u, { mode: 'no-cors' })); await cache.put(u, r); }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // File sendiri: utamakan versi terbaru dari jaringan, cadangan dari cache saat offline.
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
  } else {
    // Library eksternal: pakai cache dulu, perbarui di latar belakang.
    e.respondWith(caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached || Response.error());
      return cached || net;
    }));
  }
});
