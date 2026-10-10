/* أَثَر — الإشعارات والـ Service Worker */

/* ---------- Service Worker ---------- */
function registerSW() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register('firebase-messaging-sw.js')
        .then(r => { swReg = r; return r; })
        .catch(e => { console.warn('SW registration failed:', e); return null; });
}

/* ---------- الإشعارات ---------- */
async function showNotify(title, opts = {}) {
    if (!hasNotif() || Notification.permission !== 'granted') return;
    const o = Object.assign({ icon: ICON, badge: ICON, dir: 'rtl', lang: 'ar' }, opts);
    try {
        const reg = swReg || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration());
        if (reg && reg.showNotification) return await reg.showNotification(title, o);
    } catch (e) {}
    try { new Notification(title, o); } catch (e) {}
}

async function initNotifications() {
    try {
        const reg = swReg || await registerSW();
        if (messaging && reg) {
            await navigator.serviceWorker.ready;
            const token = await messaging.getToken({
                vapidKey: 'BCnVK9Yqt6EwwWJpW4GRQQetASsKOJqa_oTDIruAjIGGWLYWc4Yw9jGFyj-KndtKVcjrOp8ZMAMXG64RKPpI7Ok',
                serviceWorkerRegistration: reg
            });
            if (token && database) {
                database.ref('fcm_tokens/' + getBrowserUid()).set({
                    token: token, lastSeen: Date.now(), deviceName: getDeviceName()
                });
            }
        }
    } catch (error) { console.warn('FCM Initialization Error:', error); }
    initRandomAzkarNotifications();
}

// نطلب إذن الإشعارات عند أول لمسة (متصفحات كتير بتمنع الطلب التلقائي)
function setupNotificationPrompt() {
    if (!hasNotif()) return;
    if (Notification.permission === 'granted') { initNotifications(); return; }
    if (Notification.permission !== 'default') return;
    const ask = () => {
        Notification.requestPermission().then(p => { if (p === 'granted') initNotifications(); }).catch(() => {});
    };
    document.addEventListener('click', ask, { once: true });
}

let azkarTimer = null;
function initRandomAzkarNotifications() {
    if (azkarTimer) return;
    const INTERVAL_MS = 4 * 60 * 60 * 1000;
    const sendRandomZikr = () => {
        showNotify("ذكر الله", { body: dbAzkar[Math.floor(Math.random() * dbAzkar.length)] });
        store.set('last_zikr_time', Date.now());
    };
    const lastSent = parseInt(store.get('last_zikr_time')) || 0;
    if (Date.now() - lastSent >= INTERVAL_MS) sendRandomZikr();
    azkarTimer = setInterval(sendRandomZikr, INTERVAL_MS);
}

function sendNotify(title, body) { showNotify(title, { body: body }); }

function checkPrayerNotifications() {
    if (!prayerTimings || !prayerTimings.Fajr) return;
    const now = new Date();
    for (const k in PRAYERS) {
        const d = prayerDate(k, now); if (!d) continue;
        const diff = now - d;
        if (diff >= 0 && diff < 3 * 60 * 1000) triggerAzan(k, now);   // الأذان الصوتي + الإشعار (azan.js)
    }
}
