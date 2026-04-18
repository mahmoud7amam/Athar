const CACHE_NAME = 'athar-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
  // يمكنك إضافة المزيد من الملفات هنا لتعمل بدون إنترنت
];

// 1. التثبيت وتخزين الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Athar SW: تم تخزين الملفات');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. التفعيل وحذف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. جلب البيانات (العمل أوفلاين)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 4. استقبال إشعارات الـ Push (في الخلفية)
self.addEventListener('push', (event) => {
  let data = { title: 'أَثَر', body: 'تنبيه جديد!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: './index.html' // الصفحة التي ستفتح عند الضغط على الإشعار
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. التفاعل عند الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
