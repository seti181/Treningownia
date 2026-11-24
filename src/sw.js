/* Service worker: aplikacja działa bez sieci. Strona: najpierw sieć (nowa wersja od razu, gdy jest połączenie),
   bez sieci albo przy bardzo wolnej sieci kopia z pamięci. Manifest i ikony: z pamięci. Fonty Google: z pamięci po pierwszym pobraniu.
   Build podmienia VERSION (skrót treści) i FILES. Synchronizacji z kontem (Firebase) nie dotyka. */
'use strict';
const VERSION = '__VERSION__';
const FILES = ['__FILES__'];
const CACHE = 'treningownia-' + VERSION;
const FONTS = 'treningownia-fonty';
const PAGE = new URL('./', self.location).href;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.indexOf('treningownia-') === 0 && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Sieć z limitem czasu; udana odpowiedź odświeża kopię strony.
function fresh(req) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 4000);
    fetch(req).then(res => {
      clearTimeout(t);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(PAGE, copy)); }
      resolve(res);
    }, err => { clearTimeout(t); reject(err); });
  });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(fresh(req).catch(() => caches.match(PAGE).then(m => m || fetch(req))));
    } else {
      e.respondWith(caches.match(req, { ignoreSearch: true }).then(m => m || fetch(req)));
    }
    return;
  }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(m => m || fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }))));
  }
});
