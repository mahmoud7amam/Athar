/* أَثَر — الأذان: عند دخول وقت الصلاة يظهر "صلاة كذا الآن" ويُرفع الأذان + إشعار */

const ADHAN_FILE = 'adhan.m4a';
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const AD = { audio: null, url: null, playing: false, k: null, unlocked: false, closeT: 0, timer: 0, ended: false };

const adOn = () => store.get('adhan_on') !== '0';
const adPrayerOn = k => store.get('adhan_p_' + k) !== '0';
const adVol = () => { const v = parseFloat(store.get('adhan_vol')); return isFinite(v) ? Math.min(1, Math.max(0.05, v)) : 0.9; };
const adDay = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const adCity = () => { const s = $('citySelect'); return s && s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : ''; };

/* ---------- الصوت ---------- */
function adAudio() {
    if (!AD.audio) {
        const a = new Audio(); a.preload = 'auto';
        a.addEventListener('ended', () => { AD.playing = false; AD.ended = true; adUI(); clearTimeout(AD.closeT); AD.closeT = setTimeout(adhanClose, 60000); });
        a.addEventListener('pause', () => { if (!a.ended) { AD.playing = false; adUI(); } });
        a.addEventListener('play', () => { AD.playing = true; AD.ended = false; adUI(); });
        a.addEventListener('error', () => { if (a.getAttribute('src') && a.src !== SILENT_WAV) { AD.playing = false; adUI(); toast('تعذر تشغيل الأذان'); } });
        AD.audio = a;
    }
    return AD.audio;
}
// الملف بيتحفظ في الكاش عشان الأذان يشتغل بدون إنترنت
async function adhanEnsureCached() {
    try {
        const c = await openCache(ASSETS_CACHE); if (!c) return;
        if (await c.match(ADHAN_FILE)) return;
        if (!isOnline()) return;
        await fetchAndCache(c, ADHAN_FILE, { tries: 2, timeout: 60000, validate: async b => b.size > 50000, type: 'audio/mp4' });
    } catch (e) {}
}
async function adhanSrc() {
    try {
        const c = await caches.open(ASSETS_CACHE), hit = await c.match(ADHAN_FILE);
        if (hit) { const b = await hit.blob(); if (b.size > 50000) { if (AD.url) URL.revokeObjectURL(AD.url); AD.url = URL.createObjectURL(new Blob([b], { type: 'audio/mp4' })); return AD.url; } }
    } catch (e) {}
    return ADHAN_FILE;
}
// المتصفحات بتمنع الصوت التلقائي قبل أول لمسة؛ بنفتح العنصر بلمسة واحدة بصوت صامت
function adhanUnlock() {
    if (AD.unlocked) return; AD.unlocked = true;
    try {
        const a = adAudio(); a.src = SILENT_WAV; a.muted = true;
        // لو الأذان بدأ فعلاً في الأثناء (src اتغيّر) ما نلمسش العنصر
        const p = a.play(); const done = () => { if (a.getAttribute('src') !== SILENT_WAV) return; try { a.pause(); } catch (e) {} a.muted = false; a.removeAttribute('src'); };
        if (p && p.then) p.then(done, done); else done();
    } catch (e) {}
}
async function adhanPlay(k) {
    const a = adAudio();
    try { if (typeof aud !== 'undefined' && !aud.paused) { aud.pause(); if (typeof setPlayUI === 'function') setPlayUI(false); } } catch (e) {}
    clearTimeout(AD.closeT); AD.ended = false;
    a.muted = false; a.volume = adVol();
    a.src = await adhanSrc(); a.currentTime = 0;
    try {
        await a.play(); AD.playing = true;
        if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({ title: `أذان ${PRAYERS[k] || ''}`, artist: 'أَثَر', album: 'مواقيت الصلاة', artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] });
                navigator.mediaSession.setActionHandler('play', () => adhanToggle());
                navigator.mediaSession.setActionHandler('pause', () => adhanStop());
                navigator.mediaSession.setActionHandler('stop', () => adhanStop());
            } catch (e) {}
        }
    } catch (e) { AD.playing = false; }
    adUI();
}
function adhanStop() {
    const a = AD.audio; if (a) { try { a.pause(); a.currentTime = 0; } catch (e) {} }
    AD.playing = false; AD.ended = true; adUI();
}
function adhanToggle() {
    if (nativeOk() && (AD.native || !AD.audio || !AD.audio.getAttribute('src'))) {
        if (AD.playing) { nativeGo('stop'); adNativeEnd(); }
        else { nativeGo('test', 'i=' + Math.max(0, PT_KEYS.indexOf(AD.k || 'Dhuhr'))); adNativeMode(AD.k); }
        return;
    }
    if (AD.playing) adhanStop(); else adhanPlay(AD.k || 'Dhuhr');
}
// الصوت بيشتغل من الطبقة الأصلية: الشاشة بس بتعكس الحالة (مدة الأذان ≈ 3:43)
function adNativeMode(k) {
    AD.native = true; AD.playing = true; AD.ended = false; clearTimeout(AD.nt);
    AD.nt = setTimeout(adNativeEnd, 235000); adUI();
}
function adNativeEnd() { clearTimeout(AD.nt); AD.playing = false; AD.ended = true; adUI(); clearTimeout(AD.closeT); AD.closeT = setTimeout(adhanClose, 60000); }

/* ---------- الشاشة ---------- */
const ADHAN_DUA = 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ';
function adUI() {
    const ov = $('adhanOv'); if (!ov || !ov.classList.contains('open')) return;
    const b = $('adhPlay');
    b.innerHTML = AD.playing ? '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> إيقاف الأذان' : '<svg viewBox="0 0 24 24"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z"/></svg> ' + (AD.ended ? 'إعادة الأذان' : 'تشغيل الأذان');
    ov.classList.toggle('playing', AD.playing);
    $('adhDua').hidden = !AD.ended;
    $('adhPhrase').hidden = AD.ended;
}
function adhanOverlay(k, opts = {}) {
    const ov = $('adhanOv'); if (!ov) return;
    AD.k = k; AD.ended = false; clearTimeout(AD.closeT);
    const d = prayerDate(k, new Date());
    $('adhTitle').textContent = `صلاة ${PRAYERS[k] || ''} الآن`;
    $('adhSub').textContent = `حسب توقيت ${adCity() || 'مدينتك'}` + (d ? ` • ${formatTime12(prayerTimings[k])}` : '');
    $('adhPhrase').textContent = k === 'Fajr' ? 'الصلاة خير من النوم' : 'حيّ على الصلاة، حيّ على الفلاح';
    $('adhDua').textContent = ADHAN_DUA;
    ov.classList.add('open'); document.body.classList.add('adhan-open');
    adUI();
}
function adhanClose() {
    clearTimeout(AD.closeT);
    if (AD.native) { if (AD.playing) nativeGo('stop'); AD.native = false; clearTimeout(AD.nt); AD.playing = false; }
    adhanStop();
    const ov = $('adhanOv'); if (ov) ov.classList.remove('open');
    document.body.classList.remove('adhan-open');
}

/* ---------- الإشعار ---------- */
function adhanNotify(k) {
    const name = PRAYERS[k], city = adCity();
    showNotify(`🕌 صلاة ${name} الآن`, {
        body: `حان الآن موعد صلاة ${name}${city ? ' حسب توقيت ' + city : ''}.\n${k === 'Fajr' ? 'الصلاة خير من النوم' : 'حيّ على الصلاة، حيّ على الفلاح'}`,
        tag: 'prayer-' + k, renotify: true, requireInteraction: true, vibrate: [300, 150, 300, 150, 600], data: { url: location.href.split('?')[0], prayer: k }
    });
}

/* ---------- التوقيت ---------- */
function adhanFire(k, when, age) {
    store.set('adhan_last_' + k, adDay(when));
    const wantSound = adOn() && adPrayerOn(k) && age < 180000;
    if (nativeOk()) {                         // تطبيق أندرويد: الصوت والإشعار من الطبقة الأصلية، والصفحة بتعرض الشاشة بس
        if (!document.hidden && age < 180000) { adhanOverlay(k); if (wantSound) adNativeMode(k); }
        return;
    }
    if (document.hidden) { if (age < 600000) adhanNotify(k); }
    else if (age < 180000) adhanOverlay(k);
    if (wantSound) adhanPlay(k);
}
// بيتنادى كل 20 ثانية + عند الرجوع للتطبيق (احتياطي للمؤقّت الدقيق)
function adhanTick() {
    if (!prayerTimings || !prayerTimings.Fajr) return;
    const now = new Date();
    for (const k in PRAYERS) {
        const d = prayerDate(k, now); if (!d) continue;
        const age = now - d;
        if (age >= 0 && age < 600000 && store.get('adhan_last_' + k) !== adDay(d)) adhanFire(k, d, age);
    }
}
// أقرب صلاة قادمة (وفجر بكرة من مواقيت بكرة المحفوظة لو متاحة)
function adhanNextTime() {
    const now = new Date(), np = nextPrayer(now); if (!np) return null;
    if (np.date.getDate() !== now.getDate()) {
        const t = new Date(now); t.setDate(t.getDate() + 1);
        const tm = ptLookup($('countrySelect').value, $('citySelect').value, t);
        const hm = tm && parseHM(tm.Fajr);
        if (hm) { const d = new Date(t); d.setHours(hm[0], hm[1], 0, 0); return d; }
    }
    return np.date;
}
// مؤقّت دقيق على ثانية دخول الوقت (مش بانتظار الـ 20 ثانية)
function adhanSchedule() {
    clearTimeout(AD.timer);
    const t = adhanNextTime(); if (!t) return;
    const ms = Math.min(t - Date.now(), 2147000000);
    AD.timer = setTimeout(() => { adhanTick(); adhanSchedule(); }, Math.max(ms, 0) + 250);
}

/* ---------- جسر تطبيق أندرويد (APK) ----------
   الويب لوحده ما يقدرش يشغّل أذان والتطبيق مقفول، فالـ APK فيه منبّه نظام + خدمة صوت + شاشة أذان أصلية.
   الصفحة بتبعتلها المواقيت (40 يوم) عبر رابط intent:// مع أول لمسة، وبعدها الأذان بيشتغل بدون ما التطبيق يكون مفتوح ولا فيه نت. */
const TWA = { is: false, armed: false, waiting: null, sawHidden: false, tries: 0 };
const NATIVE_PKG = 'com.atharqurani.app';
function detectTWA() {
    try { if (/[?&]twa=1/.test(location.search) || (document.referrer || '').indexOf('android-app://' + NATIVE_PKG) === 0) store.set('athar_twa', '1'); } catch (e) {}
    TWA.is = store.get('athar_twa') === '1' && /Android/i.test(navigator.userAgent);
    return TWA.is;
}
const nativeOk = () => TWA.is && store.get('adhan_native_ok') === '1';
const intentUrl = (host, q) => `intent://${host}${q ? '?' + q : ''}#Intent;scheme=athar-adhan;package=${NATIVE_PKG};end`;
function nativePayload() {
    const country = $('countrySelect').value, city = $('citySelect').value, ent = [], d0 = new Date();
    for (let i = 0; i < 40; i++) {
        const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i);
        let tm = ptLookup(country, city, d);
        if (!tm && i === 0 && prayerTimings && prayerTimings.Fajr) tm = prayerTimings;
        if (!tm) continue;
        const hm = PT_KEYS.map(k => { const p = parseHM(tm[k]); return p ? pad2(p[0]) + pad2(p[1]) : ''; });
        if (hm.some(x => !x)) continue;
        ent.push(adDay(d).replace(/-/g, '') + ',' + hm.join(','));
    }
    const q = new URLSearchParams();
    q.set('on', adOn() ? '1' : '0'); q.set('p', PT_KEYS.map(k => adPrayerOn(k) ? '1' : '0').join('')); q.set('v', String(Math.round(adVol() * 100)));
    q.set('c', adCity()); q.set('t', ent.join('~'));
    return q.toString();
}
const hashStr = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); };
function nativeGo(host, q) { try { location.href = intentUrl(host, q); } catch (e) {} }
// لازم لمسة من المستخدم لفتح intent:// — فبنجهّز الإرسال ونطلقه عند أول لمسة
function nativeSync(force) {
    if (!TWA.is || !$('countrySelect')) return;
    const q = nativePayload(), h = hashStr(q);
    if (!force && h === store.get('adhan_native_hash') && Date.now() - (+store.get('adhan_native_t') || 0) < 20 * 3600e3) return;
    TWA.pending = { q, h };
    if (navigator.userActivation && navigator.userActivation.isActive) nativeFire();
    else if (!TWA.armed) {
        TWA.armed = true;
        const go = () => { document.removeEventListener('touchend', go, true); document.removeEventListener('click', go, true); TWA.armed = false; nativeFire(); };
        document.addEventListener('touchend', go, true); document.addEventListener('click', go, true);
    }
}
function nativeFire() {
    const p = TWA.pending; if (!p || TWA.waiting) return;
    TWA.pending = null; TWA.waiting = p.h; TWA.sawHidden = false; TWA.tries++;
    nativeGo('sync', p.q);
    // لو الصفحة ما اختفتش (يعني الـ APK ما استقبلش الرابط) نعتبر الجسر مش شغال ونرجع لأذان الويب
    setTimeout(() => { if (TWA.waiting === p.h) { TWA.waiting = null; if (!TWA.sawHidden) { store.set('adhan_native_ok', '0'); adRenderSettings(); } } }, 25000);
}
function nativeAckWatch() {
    document.addEventListener('visibilitychange', () => {
        if (!TWA.waiting) return;
        if (document.hidden) TWA.sawHidden = true;
        else if (TWA.sawHidden) {
            store.set('adhan_native_ok', '1'); store.set('adhan_native_hash', TWA.waiting); store.set('adhan_native_t', String(Date.now()));
            TWA.waiting = null; adRenderSettings();
        }
    });
}

/* ---------- الإعدادات ---------- */
function adBellHTML(k) {
    const on = adOn() && adPrayerOn(k);
    return `<button class="ad-bell${on ? ' on' : ''}" data-k="${k}" onclick="toggleAdhanFor('${k}',event)" aria-label="الأذان" title="${on ? 'الأذان مفعّل' : 'الأذان متوقف'}"><svg viewBox="0 0 24 24">${on ? '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21a2 2 0 0 0 4 0"/>' : '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21a2 2 0 0 0 4 0M4 4l16 16"/>'}</svg></button>`;
}
function adRefreshBells() {
    document.querySelectorAll('.ad-bell').forEach(b => { b.outerHTML = adBellHTML(b.dataset.k); });
}
function toggleAdhanFor(k, ev) {
    if (ev) ev.stopPropagation();
    const nowOn = !(adOn() && adPrayerOn(k));
    if (nowOn) { store.set('adhan_on', '1'); adhanUnlock(); }
    store.set('adhan_p_' + k, nowOn ? '1' : '0'); nativeSync(true);
    adRefreshBells(); adRenderSettings();
    toast(`أذان ${PRAYERS[k]}: ${nowOn ? 'مفعّل' : 'متوقف'}`);
}
function setAdhanOn(v) {
    store.set('adhan_on', v ? '1' : '0'); nativeSync(true);
    if (v) { adhanUnlock(); adhanEnsureCached(); if (hasNotif() && Notification.permission === 'default') Notification.requestPermission().then(p => { if (p === 'granted') initNotifications(); adRenderSettings(); }).catch(() => {}); }
    adRefreshBells(); adRenderSettings();
}
function setAdhanPrayer(k, v) { store.set('adhan_p_' + k, v ? '1' : '0'); nativeSync(true); adRefreshBells(); adRenderSettings(); }
function setAdhanVol(v) { store.set('adhan_vol', String(v / 100)); if (AD.audio) AD.audio.volume = adVol(); }
function testAdhan() {
    const k = (nextPrayer() || {}).k || 'Dhuhr';
    if (nativeOk()) { adhanOverlay(k); nativeGo('test', 'i=' + Math.max(0, PT_KEYS.indexOf(k))); adNativeMode(k); return; }
    adhanUnlock(); adhanOverlay(k); adhanPlay(k);
}
async function enableAdhanNotif() {
    if (!hasNotif()) { toast('المتصفح لا يدعم الإشعارات'); return; }
    if (Notification.permission === 'denied') { toast('الإشعارات محظورة — فعّلها من إعدادات الموقع'); return; }
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (p === 'granted') { initNotifications(); toast('تم تفعيل الإشعارات ✓'); } else toast('لم يتم السماح بالإشعارات');
    adRenderSettings();
}
function adRenderSettings() {
    if (!$('adOn')) return;
    $('adOn').checked = adOn();
    $('adPrayers').innerHTML = Object.keys(PRAYERS).map(k => `<label class="ad-chip${adPrayerOn(k) ? ' on' : ''}"><input type="checkbox" ${adPrayerOn(k) ? 'checked' : ''} onchange="setAdhanPrayer('${k}',this.checked)"><span>${PRAYERS[k]}</span></label>`).join('');
    $('adPrayers').classList.toggle('off', !adOn());
    $('adVol').value = Math.round(adVol() * 100);
    const perm = hasNotif() ? Notification.permission : 'unsupported';
    $('adStatus').innerHTML = TWA.is ? (nativeOk() ? '✅ الأذان يعمل تلقائياً حتى والتطبيق مغلق وبدون إنترنت.' : '⏳ جاري تفعيل الأذان في التطبيق… المس الشاشة مرة وسيتفعّل تلقائياً.')
        : perm === 'granted' ? '🔔 الإشعارات مفعّلة — ستصلك إشعارة «صلاة كذا الآن» عند كل صلاة.'
        : perm === 'denied' ? '🔕 الإشعارات محظورة من إعدادات المتصفح؛ الأذان سيعمل داخل التطبيق فقط.'
        : perm === 'unsupported' ? 'هذا المتصفح لا يدعم الإشعارات.' : '🔔 فعّل الإشعارات ليصلك تنبيه الصلاة حتى والتطبيق في الخلفية.';
    $('adNotifBtn').style.display = perm === 'granted' || perm === 'unsupported' ? 'none' : '';
}

function adhanInit() {
    detectTWA(); nativeAckWatch();
    adRenderSettings();
    const unlock = () => adhanUnlock();
    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { once: true, passive: true }));
    if (adOn()) setTimeout(adhanEnsureCached, 3000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { adhanTick(); adhanSchedule(); } });
    window.addEventListener('focus', () => { adhanTick(); adhanSchedule(); });
    window.addEventListener('pageshow', () => { adhanTick(); adhanSchedule(); });
    // لمّا المستخدم يضغط على إشعار الصلاة
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => {
        const d = e.data || {}; if (d.type === 'prayer' && PRAYERS[d.k]) adhanOverlay(d.k);
    });
    const q = new URLSearchParams(location.search).get('prayer');
    if (q && PRAYERS[q]) { setTimeout(() => adhanOverlay(q), 800); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
    adhanSchedule();
    nativeSync();
}
