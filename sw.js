// استدعاء مكتبات فايربيز الخاصة بالـ Service Worker
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// إعدادات مشروعك
const firebaseConfig = {
    projectId: "gootff-dcc2a",
    messagingSenderId: "1027459267887",
    appId: "1:1027459267887:android:ecb608f8a39f58e8bf75da"
    // ملاحظة: إذا واجهت خطأ، قد تحتاج لإضافة apiKey الخاص بالويب هنا
};

// تهيئة فايربيز داخل الـ SW
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// استقبال الإشعارات في الخلفية
messaging.onBackgroundMessage(function(payload) {
  console.log('Athar SW: رسالة في الخلفية ', payload);
  
  const notificationTitle = payload.notification.title || 'إشعار من تطبيق أَثَر';
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'icon-192.png',
    badge: 'icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
