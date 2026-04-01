// ملف Service Worker للتعامل مع الإشعارات في الخلفية
self.addEventListener('push', function(event) {
    const data = event.data.json();
    const options = {
        body: data.message,
        icon: 'icon.png',
        badge: 'icon.png'
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow('/')); // يفتح التطبيق عند الضغط على الإشعار
});
