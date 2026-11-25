/* 幕间 MUJIAN · Service Worker（离线壳 + 静态缓存） */
const CACHE = 'mujian-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* 构建信息：网络优先，保证云构建号实时 */
  if (url.pathname.endsWith('/version.json')) {
    e.respondWith(
      fetch(req).then(r => {
        const c = r.clone();
        caches.open(CACHE).then(x => x.put(req, c));
        return r;
      }).catch(() => caches.match(req).then(r => r || Response.error()))
    );
    return;
  }

  /* 页面导航：网络优先，离线回退壳 */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html').then(r => r || Response.error())));
    return;
  }

  /* 其余静态资源：缓存优先 */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      const c = r.clone();
      caches.open(CACHE).then(x => x.put(req, c));
      return r;
    }).catch(() => Response.error()))
  );
});