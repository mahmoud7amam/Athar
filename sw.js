self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

let athkarInterval;
let quranInterval;
let prayerTimeouts = [];

self.addEventListener('message', (event) => {
    if (event.data.type === 'SETUP_NOTIFICATIONS') {
        setupDailyReminders();
    }
    if (event.data.type === 'SET_PRAYER_ALARMS') {
        schedulePrayers(event.data.timings);
    }
});

// إعداد تذكيرات الأذكار والقرآن
function setupDailyReminders() {
    clearInterval(athkarInterval);
    clearInterval(quranInterval);
    
    // 7 مرات في اليوم (تقريباً كل 3 ساعات و 25 دقيقة)
    const athkarDelay = Math.floor(24 / 7 * 60 * 60 * 1000); 
    athkarInterval = setInterval(() => {
        self.registration.showNotification('تذكير بالذكر 📿', {
            body: 'لا تنسَ نصيبك من ذكر الله الآن.',
            icon: 'https://i.postimg.cc/Y9b75ffx/1774194048534-ezremove-(1).png',
            vibrate: [200, 100, 200]
        });
    }, athkarDelay);

    // مرة واحدة في اليوم للقرآن (كل 24 ساعة)
    const quranDelay = 24 * 60 * 60 * 1000;
    quranInterval = setInterval(() => {
        self.registration.showNotification('ورد القرآن 📖', {
            body: 'هل قرأت وردك من القرآن اليوم؟ نور قلبك بآيات الله.',
            icon: 'https://i.postimg.cc/Y9b75ffx/1774194048534-ezremove-(1).png',
            vibrate: [200, 100, 200]
        });
    }, quranDelay);
}

// جدولة إشعارات مواقيت الصلاة
function schedulePrayers(timings) {
    prayerTimeouts.forEach(clearTimeout);
    prayerTimeouts = [];
    const now = new Date();
    const m = {"Fajr":"الفجر","Dhuhr":"الظهر","Asr":"العصر","Maghrib":"المغرب","Isha":"العشاء"};
    
    for (let k in m) {
        let [h, min] = timings[k].split(':');
        let pDate = new Date();
        pDate.setHours(h, min, 0);
        
        // إذا كان وقت الصلاة لم يأتِ بعد اليوم
        if (pDate > now) {
            let delay = pDate.getTime() - now.getTime();
            let t = setTimeout(() => {
                self.registration.showNotification('حان الآن موعد الصلاة 🕌', {
                    body: `حان الآن موعد أذان ${m[k]}، أرحنا بها يا بلال.`,
                    icon: 'https://i.postimg.cc/Y9b75ffx/1774194048534-ezremove-(1).png',
                    vibrate: [300, 100, 300, 100, 300]
                });
            }, delay);
            prayerTimeouts.push(t);
        }
    }
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});
