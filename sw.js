// استدعاء مكتبات فايربيز
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const firebaseConfig = {
    apiKey: "AIzaSyBzaEUrY6MX38n3s7KcIfcx2mhqQbOCfCY",
    projectId: "gootff-dcc2a",
    messagingSenderId: "1027459267887",
    appId: "1:1027459267887:android:ecb608f8a39f58e8bf75da"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 1. تثبيت الـ Service Worker وتفعيل الكاش الأولي
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 2. معالجة الطلبات (Fetch) - دي اللي بتخلي زرار التثبيت يظهر
self.addEventListener('fetch', (event) => {
  // بنخليه يمرر الطلبات عادي، وكروم بيتأكد إن الـ SW نشط
  event.respondWith(fetch(event.request).catch(() => {
      return caches.match(event.request);
  }));
});

// 3. استقبال إشعارات الخلفية
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title || 'أَثَر - Athar';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png', 
    badge: '/icon-192.png', // لو عملت الأيقونة المفرغة غير الاسم هنا
    vibrate: [200, 100, 200],
    tag: 'athar-notif',
    renotify: true,
    data: {
      url: '/' // اللينك اللي هيفتحه لما يضغط على الإشعار
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 4. برمجة "الضغط على الإشعار" (عشان يفتح الموقع)
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // يقفل الإشعار
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/'); // يفتح الموقع لو مقفول
    })
  );
});
