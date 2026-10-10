/* أَثَر — الأذان: ضبط كل صلاة + شاشة الأذان + زر الإيقاف.
   - داخل تطبيق الأندرويد (window.AtharNative): الجدول بيتبعت للتطبيق وهو اللي بيشغّل الأذان في الخلفية حتى والتطبيق مقفول.
   - في المتصفح/PWA: بيشتغل طول ما الصفحة شغّالة (حتى في الخلفية). */

const ADHAN_URL = 'videoplayback.m4a';
const ADHAN_WINDOW = 90 * 1000;                 // لو الصفحة صحيت متأخر أكتر من كده الأذان بيتفوّت وبييجي إشعار بس
const AN = window.AtharNative || null;

// تعريف Notification بسيط داخل التطبيق (الـ WebView مش بيدعمه) بيوصّل للإشعارات الأصلية
if (AN && typeof window.Notification === 'undefined') {
    window.Notification = function (title, o) { try { AN.notify(String(title || ''), String((o && o.body) || '')); } catch (e) {} };
    window.Notification.permission = 'granted';
    window.Notification.requestPermission = () => Promise.resolve('granted');
}

const adhanOn = () => store.get('adhan_on') === '1';
const adhanPrayerOn = k => store.get('adhan_' + k) !== '0';
let adhanAud = null, adhanTimer = null, adhanPlaying = false, adhanObjUrl = null, adhanWake = null, adhanDay = '';

/* ---------- الجدول: الأذانات الجاية للصلوات المفعّلة ---------- */
function adhanCityName() {
    const s = $('citySelect'); return s ? ((s.options[s.selectedIndex] || {}).text || s.value || '') : '';
}
function adhanOccurrences(days, withinWindow) {
    const out = [], now = Date.now(), country = $('countrySelect').value, city = $('citySelect').value, cityAr = adhanCityName();
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const base = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        let t = i === 0 && prayerTimings && prayerTimings.Fajr ? prayerTimings : ptLookup(country, city, base);
        if (!t && i === 0) t = ptLookup(country, city, base);
        if (!t && i === 1 && prayerTimings && prayerTimings.Fajr) t = prayerTimings;   // بكرة بدون بيانات محفوظة: نفس مواعيد النهارده تقريباً
        if (!t) break;
        for (const k in PRAYERS) {
            if (!adhanPrayerOn(k)) continue;
            const hm = parseHM(t[k]); if (!hm) continue;
            const d = new Date(base); d.setHours(hm[0], hm[1], 0, 0);
            if (d.getTime() + (withinWindow ? ADHAN_WINDOW : 0) > now) out.push({ t: d.getTime(), k, n: PRAYERS[k], c: cityAr });
        }
    }
    return out.sort((a, b) => a.t - b.t);
}
const adhanKey = o => o.k + '_' + new Date(o.t).toDateString();

function adhanReschedule() {
    adhanDay = new Date().toDateString();
    if (AN) {
        // لو مفيش مواقيت متاحة دلوقتي (أوفلاين من غير بيانات) منمسحش الجدول اللي عند التطبيق
        const occ = adhanOn() ? adhanOccurrences(45, false) : [];
        if (adhanOn() && !occ.length) return;
        try { AN.setAdhanSchedule(JSON.stringify(occ)); } catch (e) {}
        return;
    }
    adhanArm();
}

/* ---------- المتصفح: مؤقّت بيتأكد كل ٣٠ ثانية ---------- */
function adhanArm() {
    clearTimeout(adhanTimer);
    if (AN || !adhanOn() || !$('countrySelect').value) return;
    const now = Date.now(), last = store.get('adhan_last') || '';
    const next = adhanOccurrences(2, true).find(o => adhanKey(o) !== last);
    if (!next) { adhanTimer = setTimeout(adhanArm, 30000); return; }
    const wait = next.t - now;
    if (wait <= 0) {
        store.set('adhan_last', adhanKey(next));
        if (now - next.t <= ADHAN_WINDOW) playAdhan(next.k);
        adhanTimer = setTimeout(adhanArm, 1000);
    } else adhanTimer = setTimeout(adhanArm, Math.min(wait, 30000));
}

/* ---------- الصوت ---------- */
async function adhanSrc() {
    try {
        const hit = await caches.match(ADHAN_URL, { ignoreVary: true });
        if (hit) { const b = await hit.blob(); if (b.size > 100000) { if (adhanObjUrl) URL.revokeObjectURL(adhanObjUrl); adhanObjUrl = URL.createObjectURL(b); return adhanObjUrl; } }
    } catch (e) {}
    return ADHAN_URL;
}
async function adhanPrefetch() {            // يحفظ ملف الأذان عشان يشتغل بدون إنترنت
    try {
        const c = await openCache(ASSETS_CACHE); if (!c || await c.match(ADHAN_URL)) return;
        if (isOnline()) await fetchAndCache(c, ADHAN_URL, { tries: 2, timeout: 60000, validate: async b => b.size > 100000, type: 'audio/mp4' });
    } catch (e) {}
}

/* ---------- شاشة الأذان ---------- */
function showAdhanScreen(k, test) {
    const name = PRAYERS[k] || '';
    $('adhanTitle').textContent = test ? 'تجربة الأذان' : `حان الآن موعد أذان ${name}`;
    $('adhanSub').textContent = test ? 'ده أذان تجريبي' : (adhanCityName() ? `حسب توقيت ${adhanCityName()}` : '');
    $('adhanTap').style.display = 'none';
    tickAdhanClock();
    $('adhanScreen').classList.add('show');
    document.body.classList.add('adhan-open');
}
function tickAdhanClock() {
    const d = new Date(), h = d.getHours();
    const el = $('adhanClock'); if (el) el.textContent = `${h % 12 || 12}:${pad2(d.getMinutes())} ${h >= 12 ? 'PM' : 'AM'}`;
}
setInterval(() => { if (adhanPlaying) tickAdhanClock(); }, 5000);

function setAdhanMedia(k) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: `أذان ${PRAYERS[k] || ''}`, artist: 'أَثَر', album: 'الأذان', artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] });
        navigator.mediaSession.setActionHandler('stop', () => stopAdhan());
        navigator.mediaSession.setActionHandler('pause', () => stopAdhan());
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
    } catch (e) {}
}

async function playAdhan(k, opts = {}) {
    if (AN && opts.test) { try { AN.testAdhan(); } catch (e) {} return; }
    if (adhanPlaying) return;
    adhanPlaying = true;
    try { if (typeof aud !== 'undefined' && !aud.paused) { aud.pause(); setPlayUI(false); } } catch (e) {}
    showAdhanScreen(k, !!opts.test);
    if (document.hidden && !opts.test) showNotify(`حان الآن موعد أذان ${PRAYERS[k]}`, { body: 'الله أكبر الله أكبر', tag: 'adhan', requireInteraction: true });
    try { if (navigator.wakeLock) adhanWake = await navigator.wakeLock.request('screen'); } catch (e) {}
    try {
        adhanAud.src = await adhanSrc(); adhanAud.currentTime = 0; adhanAud.volume = 1;
        await adhanAud.play();
        setAdhanMedia(k);
    } catch (e) { $('adhanTap').style.display = 'inline-block'; }      // المتصفح منع التشغيل التلقائي: زر يدوي
}
function adhanTapPlay() {
    adhanAud.play().then(() => { $('adhanTap').style.display = 'none'; }).catch(() => toast('تعذر تشغيل الأذان'));
}
function stopAdhan() {
    if (AN) { try { AN.stopAdhan(); } catch (e) {} }
    try { adhanAud.pause(); adhanAud.currentTime = 0; } catch (e) {}
    try { if (adhanWake) { adhanWake.release(); adhanWake = null; } } catch (e) {}
    try { if ('mediaSession' in navigator) { navigator.mediaSession.metadata = null; navigator.mediaSession.setActionHandler('stop', null); navigator.mediaSession.setActionHandler('pause', null); } } catch (e) {}
    $('adhanScreen').classList.remove('show');
    document.body.classList.remove('adhan-open');
    adhanPlaying = false;
}
function testAdhan() {
    if (AN) { try { AN.testAdhan(); } catch (e) {} return; }
    playAdhan('Dhuhr', { test: true });
}

/* ---------- الإعدادات ---------- */
const adhanStatus = () => { if (!AN) return null; try { return JSON.parse(AN.adhanStatus()); } catch (e) { return null; } };
function renderAdhanSettings() {
    if (!$('adOn')) return;
    const on = adhanOn();
    $('adOn').checked = on;
    $('adList').classList.toggle('off', !on);
    $('adList').innerHTML = Object.keys(PRAYERS).map(k => `<div class="ad-row"><span><b>${PRAYERS[k]}</b><small>${prayerTimings && prayerTimings[k] ? formatTime12(prayerTimings[k]) : '—'}</small></span>
        <label class="sw"><input type="checkbox" ${adhanPrayerOn(k) ? 'checked' : ''} onchange="adhanTogglePrayer('${k}', this.checked)"><i></i></label></div>`).join('');
    $('adSub').textContent = AN ? 'يؤذّن في موعد كل صلاة حتى لو التطبيق مقفول' : 'يؤذّن في موعد الصلاة طول ما التطبيق شغّال (حتى في الخلفية)';
    $('adNote').textContent = AN
        ? 'الصوت بيطلع على مستوى صوت المنبّه في الموبايل — اتأكد إنه مش صفر.'
        : 'عشان الأذان يشتغل والتطبيق مقفول لازم تستخدم نسخة التطبيق (APK) الجديدة.';
    renderAdhanPerm();
}
function renderAdhanPerm() {
    const box = $('adPerm'); if (!box) return;
    const s = adhanStatus();
    if (!s || !adhanOn()) { box.style.display = 'none'; return; }
    const row = (ok, t) => `<span class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'}</span> ${t}`;
    box.style.display = 'block';
    box.innerHTML = [row(s.notif, 'إذن الإشعارات'), row(s.fsi, 'ظهور شاشة الأذان فوق شاشة القفل'), row(s.battery, 'استثناء التطبيق من توفير البطارية (يُفضّل)')].join('<br>')
        + (s.notif && s.fsi && s.battery ? '' : '<br><button class="st-btn" style="margin-top:8px;width:100%" onclick="adhanPermissions()">ضبط الصلاحيات</button>');
}
function adhanPermissions() { if (AN) { try { AN.requestAdhanPermissions(); } catch (e) {} } setTimeout(renderAdhanPerm, 600); }

function adhanToggleMaster(on) {
    store.set('adhan_on', on ? '1' : '0');
    if (on) {
        if (!AN && hasNotif() && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
        if (AN) adhanPermissions();
        adhanPrefetch();
        toast('تم تفعيل الأذان ✓');
    } else toast('تم إيقاف الأذان');
    renderAdhanSettings(); adhanReschedule();
}
function adhanTogglePrayer(k, on) { store.set('adhan_' + k, on ? '1' : '0'); adhanReschedule(); }

function adhanInit() {
    adhanAud = new Audio(); adhanAud.preload = 'auto';
    adhanAud.addEventListener('ended', () => stopAdhan());
    adhanAud.addEventListener('error', () => { if (adhanPlaying && adhanAud.getAttribute('src')) { $('adhanTap').style.display = 'inline-block'; } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { adhanArm(); renderAdhanPerm(); if (AN && adhanDay !== new Date().toDateString()) adhanReschedule(); } });
    window.addEventListener('focus', () => { adhanArm(); renderAdhanPerm(); });
    window.addEventListener('online', adhanPrefetch);
    setInterval(() => { if (adhanDay !== new Date().toDateString()) adhanReschedule(); }, 10 * 60 * 1000);
    if (adhanOn()) adhanPrefetch();
    adhanReschedule();
    renderAdhanSettings();
}
