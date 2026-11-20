/* أَثَر — Service Worker موحّد: كاش للتطبيق + إشعارات Firebase (بدون أي إعلانات) */
const VERSION = 'athar-v16';
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';
const TAFSIR_CACHE = 'tafsir-cache-v1';
const ASSETS_CACHE = 'athar-assets-v1'; // خطوط وصور محفوظة من زر التنزيل
const AUDIO_CACHE = 'quran-audio-v1';
const QURAN_CACHE = 'quran-cache-v1'; // لا يُحذف أبداً (مصحف الأوفلاين)
// ملفات الواجهة (CSS/JS) — لازم تتسجل هنا عشان التطبيق يفتح أوفلاين من أول زيارة
const APP_ASSETS = [
  './css/splash.css',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './css/mushaf.css',
  './css/feedback.css',
  './css/theme.css',
  './css/reader.css',
  './css/tasbih.css',
  './css/nav-cards.css',
  './css/tafsir.css',
  './css/hadith.css',
  './css/reader-bar.css',
  './css/player.css',
  './css/sheets.css',
  './css/storage.css',
  './css/settings.css',
  './css/qibla.css',
  './css/adhan.css',
  './css/prayer-ui.css',
  './css/audio-downloads.css',
  './css/tutorial.css',
  './css/nav-glass.css',
  './css/experience-glass.css',
  './css/perf.css',
  './js/config.js',
  './js/core/utils.js',
  './js/core/firebase.js',
  './js/core/device.js',
  './js/data/countries.js',
  './js/data/quran-meta.js',
  './js/data/azkar.js',
  './js/data/hadith.js',
  './js/data/reciters.js',
  './js/core/state.js',
  './js/ui/toast.js',
  './js/ui/theme.js',
  './js/ui/navigation.js',
  './js/features/notifications.js',
  './js/features/prayer-times.js',
  './js/features/qibla.js',
  './js/features/adhan.js',
  './js/features/search.js',
  './js/features/admin.js',
  './js/features/quran-api.js',
  './js/features/quran-offline.js',
  './js/features/reader.js',
  './js/features/quran-lists.js',
  './js/features/duas.js',
  './js/features/tafsir.js',
  './js/features/hadith.js',
  './js/features/tasbih.js',
  './js/features/audio.js',
  './js/features/storage.js',
  './js/features/audio-downloads.js',
  './js/features/tutorial.js',
  './js/app.js'
];
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', ...APP_ASSETS];

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
      .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE && k !== QURAN_CACHE && k !== TAFSIR_CACHE && k !== ASSETS_CACHE && k !== AUDIO_CACHE)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const IMMUTABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'i.postimg.cc', 'www.gstatic.com'];

function cacheable(res) { return res && (res.ok || res.type === 'opaque'); }

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // الصفحة نفسها: من الكاش فورًا (فتح لحظي) وتتحدّث في الخلفية للمرة الجاية.
  // قبل كده كانت بتستنى الشبكة لحد 4 ثواني قبل ما تفتح لو النت بطيء.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = (await caches.match('./index.html')) || (await caches.match('./'));
      const refresh = fetch(req).then(async (net) => {
        if (net && net.ok) { const c = await caches.open(SHELL_CACHE); await c.put('./index.html', net.clone()); }
        return net;
      }).catch(() => null);
      if (cached) { event.waitUntil(refresh); return cached; }       // فتح فوري من الكاش
      return (await refresh) || Response.error();                      // أول زيارة: من الشبكة
    })());
    return;
  }

  // ملف الأذان: من الكاش أولاً بدون تحديث في الخلفية (3.6MB) وإلا من الشبكة
  if (url.origin === self.location.origin && url.pathname.endsWith('/adhan.m4a')) {
    event.respondWith((async () => {
      const hit = await caches.match(req.url, { ignoreVary: true });
      return hit || fetch(req);
    })());
    return;
  }

  // التلاوات المحفوظة: من الكاش أولاً (ضروري للملفات المحفوظة بوضع no-cors) وإلا من الشبكة
  if (url.hostname === 'everyayah.com') {
    event.respondWith((async () => {
      try { const c = await caches.open(AUDIO_CACHE); const hit = await c.match(req.url, { ignoreVary: true }); if (hit) return hit; } catch (e) {}
      return fetch(req);
    })());
    return;
  }

  // خطوط وصور وسكربتات خارجية ثابتة (بتتغيّر نادرًا): من الكاش مباشرة بدون طلب شبكة في كل مرة
  if (IMMUTABLE_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = (await cache.match(req)) || (await caches.match(req, { ignoreVary: true }));
      if (cached) return cached;
      try { const res = await fetch(req); if (cacheable(res)) cache.put(req, res.clone()); return res; }
      catch (e) { return Response.error(); }
    })());
    return;
  }

  // ملفات التطبيق نفسها: من الكاش فورًا وتتحدّث في الخلفية (وبـ waitUntil عشان ما تتقطعش)
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = (await cache.match(req)) || (await caches.match(req, { ignoreVary: true }));
      const fetching = fetch(req).then((res) => { if (cacheable(res)) cache.put(req, res.clone()); return res; }).catch(() => null);
      if (cached) { event.waitUntil(fetching); return cached; }
      return (await fetching) || Response.error();
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
    data: { url: self.registration.scope, prayer: d.prayer || '' }
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const base = data.url || self.registration.scope;
  const prayer = data.prayer || '';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          if (prayer) c.postMessage({ type: 'prayer', k: prayer });   // التطبيق يعرض شاشة "صلاة كذا الآن"
          return c.focus();
        }
      }
      return self.clients.openWindow(prayer ? base + (base.includes('?') ? '&' : '?') + 'prayer=' + prayer : base);
    })
  );
});
