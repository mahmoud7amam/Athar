/* أَثَر — Service Worker موحّد: كاش للتطبيق + إشعارات Firebase (بدون أي إعلانات) */
const VERSION = 'athar-v3';
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';
const QURAN_CACHE = 'quran-cache-v1'; // لا يُحذف أبداً (مصحف الأوفلاين)
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// Firebase للإشعارات — لو الإنترنت مقطوع وقت التثبيت ما نفشلش التثبيت
let messaging = null;
try {
  importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
  importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');
  firebase.initializeApp({
    apiKey: "AIzaSyBzaEUrY6MX38n3s7KcIfcx2mhqQbOCfCY",
    authDomain: "gootff-dcc2a.firebaseapp.com",
    projectId: "gootff-dcc2a",
    storageBucket: "gootff-dcc2a.firebasestorage.app",
    messagingSenderId: "1027459267887",
    appId: "1:1027459267887:android:ecb608f8a39f58e8bf75da"
  });
  messaging = firebase.messaging();
} catch (e) { /* غير مدعوم أو أوفلاين */ }

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE && k !== QURAN_CACHE)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'i.postimg.cc', 'www.gstatic.com'];

function cacheable(res) { return res && (res.ok || res.type === 'opaque'); }

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // الصفحة نفسها: الشبكة أولاً (عشان التحديثات توصل) ثم الكاش
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
        ]);
        if (net && net.ok) { const c = await caches.open(SHELL_CACHE); c.put('./index.html', net.clone()); }
        return net;
      } catch (e) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // ملفات التطبيق + الخطوط + الصور + سكريبتات Firebase: من الكاش فوراً وتتحدث في الخلفية
  if (url.origin === self.location.origin || RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      const fetching = fetch(req).then((res) => { if (cacheable(res)) cache.put(req, res.clone()); return res; }).catch(() => null);
      return cached || (await fetching) || Response.error();
    })());
  }
  // باقي الطلبات (قاعدة البيانات، المواقيت، API المصحف) تمر عادي
});

// إشعارات الخلفية
if (messaging) {
  messaging.setBackgroundMessageHandler
    ? messaging.setBackgroundMessageHandler(showFromPayload)
    : messaging.onBackgroundMessage(showFromPayload);
}
function showFromPayload(payload) {
  const n = (payload && payload.notification) || {};
  const d = (payload && payload.data) || {};
  return self.registration.showNotification(n.title || d.title || 'أَثَر - Athar', {
    body: n.body || d.body || d.message || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'athar-notif',
    renotify: true,
    data: { url: self.registration.scope }
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow(target);
    })
  );
});
