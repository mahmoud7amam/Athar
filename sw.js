// استدعاء مكتبات فايربيز الخاصة بالـ Service Worker
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// إعدادات مشروعك
const firebaseConfig = {
    apiKey: "AIzaSyBzaEUrY6MX38n3s7KcIfcx2mhqQbOCfCY",
    projectId: "gootff-dcc2a",
    messagingSenderId: "1027459267887",
    appId: "1:1027459267887:android:ecb608f8a39f58e8bf75da"
};

// تهيئة فايربيز داخل الـ SW
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ده اللي ناقص - لازم تضيفه عشان PWA يشتغل
self.addEventListener('install', (event) => {
  console.log('Athar SW: Installed');
  self.skipWaiting(); // يخلي الـ SW الجديد يشتغل فوراً
});

self.addEventListener('activate', (event) => {
  console.log('Athar SW: Activated');
  event.waitUntil(clients.claim()); // يمسك الصفحات المفتوحة
});

// استقبال الإشعارات في الخلفية - ده بتاعك مظبوط
messaging.onBackgroundMessage(function(payload) {
  console.log('Athar SW: رسالة في الخلفية ', payload);
  
  const notificationTitle = payload.notification.title || 'إشعار من تطبيق أَثَر';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// كاش بسيط عشان الأوفلاين
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
