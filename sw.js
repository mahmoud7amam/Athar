// Service Worker لـ تطبيق أَثر
const CACHE_NAME = 'athr-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// استلام المواقيت من الكود الرئيسي وبرمجتها
self.addEventListener('message', (event) => {
    if (event.data.type === 'SET_PRAYER_ALARMS') {
        const timings = event.data.timings;
        // تخزين المواقيت في الخلفية للتحقق منها كل دقيقة
        self.prayerData = timings;
        console.log("تم استلام المواقيت في الخلفية");
    }
});

// وظيفة فحص الوقت وإرسال التنبيه
function checkPrayers() {
    if (!self.prayerData) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const prayers = {
        "Fajr": "صلاة الفجر",
        "Dhuhr": "صلاة الظهر",
        "Asr": "صلاة العصر",
        "Maghrib": "صلاة المغرب",
        "Isha": "صلاة العشاء"
    };

    for (let key in prayers) {
        if (self.prayerData[key] === currentTime) {
            self.registration.showNotification('حان الآن موعد الأذان', {
                body: `الله أكبر، حان الآن موعد ${prayers[key]} حسب توقيتك المحلي.`,
                icon: 'https://i.postimg.cc/Y9b75ffx/1774194048534-ezremove-(1).png',
                vibrate: [200, 100, 200],
                badge: 'https://i.postimg.cc/Y9b75ffx/1774194048534-ezremove-(1).png'
            });
        }
    }
}

// فحص الوقت كل دقيقة لضمان التنبيه
setInterval(checkPrayers, 60000);
