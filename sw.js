// Offline support for PANDABUCKS (only active on https, e.g. GitHub Pages).
// - Game files: try the network first (so updates arrive), fall back to the saved copy.
// - Voice clips: saved copy first (they never change), and all of them are
//   downloaded quietly in the background after the first visit.
const VERSION = 'v3';
const CORE = `pandabucks-core-${VERSION}`;
const VOICE = 'pandabucks-voice-v1';

const CORE_FILES = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/main.js', './js/world.js', './js/avatar.js', './js/catalog.js', './js/lessons.js', './js/lessons2.js', './js/lines.js',
  './js/money.js', './js/parent.js', './js/progress.js', './js/runner.js', './js/shop.js', './js/ui.js', './js/audio.js',
  './js/vendor/three.module.js', './voice/manifest.json',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  ...['quarter', 'penny', 'nickel', 'dime'].flatMap((n) => [`./img/${n}-heads.png`, `./img/${n}-tails.png`]),
  ...[1, 5, 10, 20].map((n) => `./img/bill-${n}.png`),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CORE).then((c) => c.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('pandabucks-core-') && k !== CORE) await caches.delete(k);
    await self.clients.claim();
    warmVoices(); // not awaited: runs in the background
  })());
});

async function warmVoices() {
  try {
    const manifest = await (await fetch('./voice/manifest.json', { cache: 'no-cache' })).json();
    const files = [...new Set(Object.values(manifest).flatMap((m) => Object.values(m)))];
    const cache = await caches.open(VOICE);
    for (let i = 0; i < files.length; i += 8) {
      await Promise.all(files.slice(i, i + 8).map(async (f) => {
        const url = new URL(`./voice/${f}`, self.registration.scope).href;
        if (!(await cache.match(url))) {
          try { const r = await fetch(url); if (r.ok) await cache.put(url, r); } catch { /* try again next visit */ }
        }
      }));
    }
  } catch { /* offline right now */ }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.pathname.includes('/voice/') && url.pathname.endsWith('.m4a')) {
    e.respondWith(caches.open(VOICE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CORE);
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req, { ignoreSearch: true })) || (await caches.match(req)) || Response.error();
    }
  })());
});
