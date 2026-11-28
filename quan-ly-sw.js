/* Service worker cho app Lành Quản lý (phạm vi /quan-ly).
   Chỉ giữ khung trang (HTML, app.js, icon) để app mở nhanh và có trang dự phòng khi mất mạng.
   Không bao giờ đụng tới /api: đơn, chi phí, đăng nhập luôn đi thẳng lên máy chủ, không lưu trên máy. */
const V = 'lanh-ql-v2';
const SHELL = ['/quan-ly', '/quan-ly/app.js', '/quan-ly/manifest.webmanifest', '/quan-ly/icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('lanh-ql-') && k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith('/quan-ly')) return;
  // Luôn lấy bản mới trên mạng trước; chỉ dùng bản đã lưu khi mất mạng.
  e.respondWith(fetch(r).then(res => {
    if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(V).then(c => c.put(u.pathname, cp)); }
    return res;
  }).catch(() => caches.match(u.pathname).then(m => m || (r.mode === 'navigate' ? caches.match('/quan-ly') : Response.error()))));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(x => new URL(x.url).pathname.startsWith('/quan-ly'));
    return w ? w.focus() : self.clients.openWindow('/quan-ly#don');
  }));
});
