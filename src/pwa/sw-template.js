// The service worker of the installed game (the PWA). vite.config's `serviceWorker` plugin
// writes it to dist/sw.js on every build with BUILD (that build's id) and FILES (every file of
// it but the sounds) filled in — so each deploy is a byte-different sw.js, which is how a
// browser notices an update: it installs this one in the background, it takes the whole new
// build into its own cache, takes over, and the page reloads into it at the next menu
// (src/pwa/register.js). Nobody has to reinstall anything.
//   • code, pages, icons: from this build's cache (fast, and offline after the first visit)
//   • the page itself: the network first when online, so a new deploy is found at once
//   • sounds: cached as they are first played, kept across builds (the bank is 14 MB and
//     rarely changes — they're refreshed in the background)
const BUILD = '__BUILD__';
const FILES = __FILES__;
const CODE = `cold-steel-${BUILD}`;
const SOUNDS = 'cold-steel-sounds';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CODE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // older builds go, but the one before this stays: a battle still running on it may yet load a
    // chunk of its code (build ids sort by time)
    const builds = (await caches.keys()).filter((k) => k.startsWith('cold-steel-') && k !== SOUNDS).sort();
    for (const key of builds.slice(0, -2)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // the multiplayer broker and the like: straight through
  if (req.mode === 'navigate') {
    // the page: fresh from the network when it can be, this build's copy when offline
    e.respondWith(fetch(req).catch(() => caches.match('./index.html', { cacheName: CODE }).then((r) => r ?? caches.match('./'))));
    return;
  }
  if (url.pathname.includes('/sounds/')) {
    e.respondWith(caches.open(SOUNDS).then(async (c) => {
      const hit = await c.match(req);
      const fresh = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit ?? fresh;
    }));
    return;
  }
  e.respondWith(caches.match(req, { cacheName: CODE }).then((hit) => hit ?? fetch(req)));
});
