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
    const ask = event => {
        if (Notification.permission !== 'default') { document.removeEventListener('click', ask); return; }
        if (event && event.target && event.target.closest && event.target.closest('[data-permission-action]')) return;
        document.removeEventListener('click', ask);
        Notification.requestPermission().then(p => { if (p === 'granted') initNotifications(); }).catch(() => {});
    };
    document.addEventListener('click', ask);
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
    const citySelect = $('citySelect');
    const cityNameAr = citySelect ? ((citySelect.options[citySelect.selectedIndex] || {}).text || '') : '';
    for (const k in PRAYERS) {
        const d = prayerDate(k, now); if (!d) continue;
        const diff = now - d;
        // مهلة قصيرة للأذان حتى لا يعمل متأخرًا، ومهلة أطول قليلًا لإشعار النظام عند تقييد مؤقتات الخلفية.
        if (diff < 0 || diff > 180000) continue;
        const key = `prayer_alert_${store.get('saved_country', '')}_${store.get('saved_city', '')}_${k}_${now.toDateString()}`;
        if (store.get(key) === '1' || notifiedPrayers[key]) continue;
        notifiedPrayers[key] = true;
        store.set(key, '1');
        if (hasNotif() && Notification.permission === 'granted') {
            showNotify(`حان الآن موعد صلاة ${PRAYERS[k]}`, {
                body: `صلاة ${PRAYERS[k]} الآن${cityNameAr ? ` حسب توقيت ${cityNameAr}` : ''} — حيّ على الصلاة`,
                tag: 'prayer-' + k,
                renotify: false
            });
        }
        if (store.get('adhan_enabled') === '1' && diff <= 65000) playAdhan(k);
    }
}

/* ---------- الأذان الصوتي والتحكم في الإشعارات ---------- */
const ADHAN_URL = 'https://cdn.aladhan.com/audio/adhans/a9.mp3';
let adhanObjectUrl = null, adhanPlayingKey = null;
function initAdhanControls() {
    const toggle = $('adhanToggle'), audio = $('adhanAudio');
    const enabled = store.get('adhan_enabled') === '1';
    if (toggle) toggle.checked = enabled;
    if (audio) audio.volume = Math.min(1, Math.max(0, Number(store.get('adhan_volume', '1')) || 1));
    updateAdhanStatus();
}
function updateAdhanStatus(message) {
    const status = $('adhanStatus'); if (!status) return;
    if (message) { status.textContent = message; return; }
    const enabled = store.get('adhan_enabled') === '1';
    const permission = !hasNotif() ? 'هذا المتصفح لا يدعم إشعارات النظام.'
        : Notification.permission === 'granted' ? 'إشعارات النظام مفعّلة.'
        : Notification.permission === 'denied' ? 'الإشعارات محظورة من إعدادات المتصفح؛ يمكن تجربة الصوت داخل التطبيق.'
        : 'اسمح بالإشعارات عند ظهور الطلب ليصلك تنبيه الصلاة.';
    status.textContent = (enabled ? 'الأذان التلقائي مفعّل. ' : 'الأذان التلقائي متوقف. ') + permission;
}
function setAdhanEnabled(enabled) {
    store.set('adhan_enabled', enabled ? '1' : '0');
    const toggle = $('adhanToggle'); if (toggle) toggle.checked = !!enabled;
    updateAdhanStatus(enabled ? 'تم تفعيل الأذان التلقائي. اختبر الصوت الآن للتأكد أن جهازك يسمح بالتشغيل.' : 'تم إيقاف تشغيل صوت الأذان التلقائي؛ ستظل المواقيت ظاهرة في التطبيق.');
    if (enabled) toast('تم تفعيل الأذان التلقائي');
}
async function enableAdhan() {
    const toggle = $('adhanToggle');
    setAdhanEnabled(true);
    // نبدأ محاولة فكّ قيد تشغيل الوسائط من داخل ضغطة المستخدم.
    const audio = $('adhanAudio');
    if (audio) {
        try {
            audio.muted = true; audio.currentTime = 0;
            const unlock = audio.play();
            if (unlock && typeof unlock.then === 'function') {
                unlock.then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false; }).catch(() => { audio.muted = false; });
            } else { audio.pause(); audio.muted = false; }
        } catch (e) { audio.muted = false; }
    }
    if (hasNotif() && Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') await initNotifications();
        } catch (e) {}
    } else if (hasNotif() && Notification.permission === 'granted') {
        initNotifications();
    }
    if (toggle) toggle.checked = true;
    updateAdhanStatus();
    toast('تم تفعيل الإعدادات؛ اضغط «تجربة صوت الأذان» للتأكد من الصوت');
}
async function testAdhan() {
    const audio = $('adhanAudio');
    if (!audio) { toast('مشغل الأذان غير متاح'); return; }
    try {
        audio.muted = false; audio.currentTime = 0;
        await audio.play();
        updateAdhanStatus('يتم تشغيل تجربة الأذان الآن. يلزم اتصال بالإنترنت لتحميل الصوت لأول مرة.');
    } catch (e) {
        updateAdhanStatus('تعذر تشغيل الصوت. تأكد من الإنترنت وارفع صوت الوسائط وجرّب الضغط مرة أخرى.');
        toast('تعذر تشغيل الأذان؛ تأكد من الإنترنت وصوت الوسائط');
    }
}
async function playAdhan(prayerKey) {
    const audio = $('adhanAudio'); if (!audio) return;
    adhanPlayingKey = prayerKey;
    // نعطي الأذان أولوية الصوت بدل تداخل تلاوة القرآن معه.
    try { if (typeof aud !== 'undefined' && aud && !aud.paused) { aud.pause(); if (typeof setPlayUI === 'function') setPlayUI(false); } } catch (e) {}
    try {
        audio.muted = false; audio.currentTime = 0;
        await audio.play();
        updateAdhanStatus(`حان الآن موعد صلاة ${PRAYERS[prayerKey]} — يتم تشغيل الأذان.`);
    } catch (e) {
        updateAdhanStatus(`حان موعد صلاة ${PRAYERS[prayerKey]}، لكن الجهاز منع التشغيل التلقائي. افتح التطبيق واضغط تجربة صوت الأذان.`);
        showNotify(`حان الآن موعد صلاة ${PRAYERS[prayerKey]}`, { body: 'افتح تطبيق أَثَر لتشغيل صوت الأذان.' });
    }
}



document.addEventListener('visibilitychange', () => { if (!document.hidden) checkPrayerNotifications(); });
window.addEventListener('focus', () => checkPrayerNotifications());
