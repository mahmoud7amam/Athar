/* أَثَر — القبلة: بوصلة حية بحساسات الجهاز + حساب الاتجاه من إحداثيات المدينة أو GPS */

const KAABA = { lat: 21.422487, lng: 39.826206 };
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const norm360 = a => ((a % 360) + 360) % 360;
const angDiff = (a, b) => ((a - b + 540) % 360) - 180;   // أقصر فرق موقّع بين زاويتين (-180..180)

/* اتجاه القبلة من الشمال الحقيقي (0..360) والمسافة بالكيلومتر */
function qiblaBearing(lat, lng) {
    const p1 = rad(lat), p2 = rad(KAABA.lat), dl = rad(KAABA.lng - lng);
    return norm360(deg(Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl))));
}
function distanceKm(lat, lng) {
    const p1 = rad(lat), p2 = rad(KAABA.lat), dp = p2 - p1, dl = rad(KAABA.lng - lng);
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* الانحراف المغناطيسي: حساسات الجوال بتدّي الشمال المغناطيسي، والقبلة محسوبة على الشمال الحقيقي.
   نقاط مرجعية تقريبية (درجات شرقاً) للمنطقة العربية + استيفاء بالمسافة العكسية — الدقة ≈ ±1°. */
const DECL_PTS = [
    [33.6, -7.6, -1.0], [36.7, 3.1, 1.7], [36.8, 10.2, 3.0], [32.9, 13.2, 3.4], [30.0, 31.2, 5.0], [31.2, 29.9, 4.8],
    [24.1, 32.9, 4.2], [15.6, 32.5, 3.3], [19.6, 37.2, 3.6], [2.0, 45.3, 0.5], [11.6, 43.1, 2.2], [15.4, 44.2, 2.5],
    [21.4, 39.8, 4.5], [24.7, 46.7, 4.6], [26.4, 50.1, 4.2], [29.4, 48.0, 5.0], [33.3, 44.4, 5.6], [31.9, 35.9, 5.3],
    [33.5, 36.3, 5.6], [25.3, 51.5, 3.8], [24.5, 54.4, 2.8], [23.6, 58.6, 2.3], [18.1, -15.9, -7.6], [-11.7, 43.3, -8.0]
];
function declination(lat, lng) {
    let sw = 0, sv = 0;
    for (const [la, ln, d] of DECL_PTS) {
        const dist = Math.hypot((la - lat), (ln - lng) * Math.cos(rad((la + lat) / 2)));
        if (dist < 0.05) return d;
        const w = 1 / (dist * dist); sw += w; sv += w * d;
    }
    return sv / sw;
}

/* موقع احتياطي (عاصمة الدولة) لو مفيش إحداثيات محفوظة للمدينة */
const COUNTRY_LL = {
    'Egypt': [30.04, 31.24], 'Saudi Arabia': [24.71, 46.68], 'UAE': [24.45, 54.38], 'Kuwait': [29.38, 47.99], 'Qatar': [25.29, 51.53],
    'Bahrain': [26.23, 50.59], 'Oman': [23.59, 58.41], 'Yemen': [15.37, 44.19], 'Jordan': [31.95, 35.93], 'Palestine': [31.77, 35.22],
    'Syria': [33.51, 36.29], 'Lebanon': [33.89, 35.50], 'Iraq': [33.31, 44.37], 'Algeria': [36.75, 3.06], 'Morocco': [34.02, -6.83],
    'Tunisia': [36.81, 10.18], 'Libya': [32.89, 13.19], 'Sudan': [15.50, 32.56], 'Mauritania': [18.08, -15.98], 'Somalia': [2.05, 45.32],
    'Djibouti': [11.59, 43.15], 'Comoros': [-11.70, 43.26]
};

/* ---------- الحالة ---------- */
const Q = { lat: null, lng: null, src: '', bearing: 0, dist: 0, decl: 0, heading: null, disp: 0, sensor: 'idle', aligned: false, listening: false, raf: 0, lastEv: 0, gps: null };
try { Q.gps = JSON.parse(store.get('qibla_gps')); } catch (e) {}
let qibMode = store.get('qibla_src') === 'gps' && Q.gps ? 'gps' : 'city';

function qibResolveLocation() {
    if (qibMode === 'gps' && Q.gps) { Q.lat = Q.gps.lat; Q.lng = Q.gps.lng; Q.src = 'gps'; return; }
    const country = ($('countrySelect') || {}).value, city = ($('citySelect') || {}).value;
    const c = cityCoords(country, city);
    if (c) { Q.lat = c.lat; Q.lng = c.lng; Q.src = 'city'; return; }
    const f = COUNTRY_LL[country];
    if (f) { Q.lat = f[0]; Q.lng = f[1]; Q.src = 'country'; return; }
    Q.lat = Q.lng = null; Q.src = '';
}
function qibRecalc() {
    qibResolveLocation();
    if (Q.lat == null) return;
    Q.bearing = qiblaBearing(Q.lat, Q.lng); Q.dist = distanceKm(Q.lat, Q.lng); Q.decl = declination(Q.lat, Q.lng);
}
function onCityCoordsChanged() { if (document.body && $('p-qibla') && $('p-qibla').classList.contains('active')) { qibRecalc(); qibDrawStatic(); qibRender(); } }

/* ---------- رسم البوصلة ---------- */
const COMPASS_DIRS = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];
const dirName = a => COMPASS_DIRS[Math.round(norm360(a) / 45) % 8];

function qibBuildDial() {
    const g = $('qbTicks'); if (!g || g.childNodes.length) return;
    let h = '';
    for (let a = 0; a < 360; a += 5) {
        const major = a % 90 === 0, mid = a % 30 === 0, len = major ? 14 : mid ? 10 : 5;
        h += `<line x1="0" y1="${-124}" x2="0" y2="${-124 + len}" transform="rotate(${a})" class="${major ? 'tk-m' : mid ? 'tk-d' : 'tk'}"/>`;
    }
    const L = [['ش', 0], ['ق', 90], ['ج', 180], ['غ', 270]];   // شمال، شرق، جنوب، غرب
    L.forEach(([t, a]) => { h += `<text x="0" y="-98" transform="rotate(${a})" class="tk-l${a === 0 ? ' n' : ''}" text-anchor="middle">${t}</text>`; });
    for (let a = 30; a < 360; a += 30) if (a % 90) h += `<text x="0" y="-100" transform="rotate(${a})" class="tk-n" text-anchor="middle">${A(a)}</text>`;
    g.innerHTML = h;
}
function qibDrawStatic() {
    const k = $('qbKaaba'); if (k) k.setAttribute('transform', `rotate(${Q.bearing})`);
    $('qbLoc').textContent = Q.src === 'gps' ? '📍 موقعك الحالي (GPS)' : Q.src === 'city' ? '🏙️ ' + cityLabel() : Q.src === 'country' ? '🌍 عاصمة الدولة (تقريبي)' : 'لم يتم تحديد الموقع';
    if (Q.lat == null) { $('qbDeg').textContent = '—'; $('qbDir').textContent = 'اختر مدينتك من صفحة المواقيت أو فعّل GPS'; $('qbDist').textContent = ''; return; }
    $('qbDeg').textContent = A(Math.round(Q.bearing)) + '°';
    $('qbDir').textContent = 'القبلة ' + dirName(Q.bearing) + ' من الشمال الحقيقي';
    $('qbDist').textContent = Q.dist < 1 ? 'أنت بجوار الكعبة المشرفة' : 'المسافة إلى الكعبة المشرفة: ' + A(Math.round(Q.dist).toLocaleString('en')) + ' كم';
    $('qbSrcCity').classList.toggle('on', qibMode === 'city');
    $('qbSrcGps').classList.toggle('on', qibMode === 'gps');
}
function cityLabel() {
    const s = $('citySelect'); return s && s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : '';
}

function qibRender() {
    Q.raf = 0;
    const ring = $('qbRing'), box = $('qbCompass'); if (!ring) return;
    const live = Q.sensor === 'live' && Q.heading != null && Q.lat != null;
    box.classList.toggle('live', live);
    if (!live) {
        ring.style.transform = 'rotate(0deg)';
        box.classList.remove('aligned');
        $('qbHint').textContent = qibHintIdle();
        return;
    }
    const trueH = norm360(Q.heading + Q.decl);
    // نفك الزاوية عشان الدوران ما يعملش لفّة كاملة عند عبور 0/360
    Q.disp += angDiff(-trueH, Q.disp);
    ring.style.transform = `rotate(${Q.disp.toFixed(1)}deg)`;
    const err = angDiff(Q.bearing, trueH);               // موجب = القبلة يمين
    const was = Q.aligned;
    Q.aligned = was ? Math.abs(err) <= 6 : Math.abs(err) <= 3;
    box.classList.toggle('aligned', Q.aligned);
    if (Q.aligned && !was) { try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {} }
    $('qbHint').textContent = Q.aligned ? '✓ أنت متجه نحو القبلة' : (err > 0 ? `لفّ يميناً ${A(Math.round(Math.abs(err)))}°` : `لفّ يساراً ${A(Math.round(Math.abs(err)))}°`);
}
function qibHintIdle() {
    if (Q.lat == null) return 'حدد موقعك أولاً';
    if (Q.sensor === 'unsupported') return `جهازك لا يدعم البوصلة — واجه الشمال ثم اتجه ${A(Math.round(Q.bearing))}° نحو الشرق`;
    if (Q.sensor === 'denied') return 'تم رفض إذن الحساسات — فعّله من إعدادات المتصفح';
    if (Q.sensor === 'wait') return 'جاري تشغيل البوصلة…';
    return 'اضغط «تشغيل البوصلة»';
}
const qibSchedule = () => { if (!Q.raf) Q.raf = requestAnimationFrame(qibRender); };

/* ---------- الحساسات ---------- */
// الاتجاه من alpha/beta/gamma: لو الجوال مفرود بنستخدم اتجاه الحافة العلوية، ولو مرفوع بنستخدم اتجاه الظهر (الكاميرا)
function headingFromEuler(alpha, beta, gamma) {
    const a = rad(alpha || 0), b = rad(beta || 0), g = rad(gamma || 0);
    const cA = Math.cos(a), sA = Math.sin(a), cB = Math.cos(b), sB = Math.sin(b), cG = Math.cos(g), sG = Math.sin(g);
    const tx = -sA * cB, ty = cA * cB;                              // الحافة العلوية للجوال (شرق، شمال)
    const bx = -cA * sG - sA * sB * cG, by = -sA * sG + cA * sB * cG; // ظهر الجوال
    const useTop = Math.hypot(tx, ty) >= Math.hypot(bx, by);
    return norm360(deg(useTop ? Math.atan2(tx, ty) : Math.atan2(bx, by)));
}
function onOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number' && isFinite(e.webkitCompassHeading)) h = e.webkitCompassHeading;       // iOS
    else if (e.alpha != null && (e.absolute || e.type === 'deviceorientationabsolute')) h = headingFromEuler(e.alpha, e.beta, e.gamma); // Android
    if (h == null) return;
    const ang = (screen.orientation && screen.orientation.angle) || 0;
    h = norm360(h + ang);
    Q.lastEv = Date.now();
    if (Q.heading == null) Q.heading = h;
    else Q.heading = norm360(Q.heading + angDiff(h, Q.heading) * 0.22);     // تنعيم دائري
    if (Q.sensor !== 'live') { Q.sensor = 'live'; $('qbStart').style.display = 'none'; }
    qibSchedule();
}
function qibAttach() {
    if (Q.listening) return;
    Q.listening = true; Q.sensor = 'wait'; Q.heading = null; qibSchedule();
    const abs = 'ondeviceorientationabsolute' in window;
    window.addEventListener(abs ? 'deviceorientationabsolute' : 'deviceorientation', onOrient, true);
    Q.evName = abs ? 'deviceorientationabsolute' : 'deviceorientation';
    setTimeout(() => { if (Q.listening && Q.sensor === 'wait') { Q.sensor = 'unsupported'; qibSchedule(); } }, 2500);
}
function qibDetach() {
    if (!Q.listening) return;
    window.removeEventListener(Q.evName, onOrient, true);
    Q.listening = false; Q.sensor = 'idle'; Q.heading = null; Q.aligned = false;
}
async function startCompass() {
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) { Q.sensor = 'unsupported'; qibSchedule(); return; }
    if (typeof DOE.requestPermission === 'function') {                       // iOS: لازم لمسة من المستخدم
        try { const r = await DOE.requestPermission(); if (r !== 'granted') { Q.sensor = 'denied'; qibSchedule(); return; } }
        catch (e) { Q.sensor = 'denied'; qibSchedule(); return; }
    }
    Q.granted = true; qibAttach();
}

/* ---------- GPS ---------- */
function useGps() {
    if (!navigator.geolocation) { toast('الجهاز لا يدعم تحديد الموقع'); return; }
    $('qbLoc').textContent = '⏳ جاري تحديد موقعك…';
    navigator.geolocation.getCurrentPosition(p => {
        Q.gps = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() };
        store.set('qibla_gps', JSON.stringify(Q.gps)); store.set('qibla_src', 'gps'); qibMode = 'gps';
        qibRecalc(); qibDrawStatic(); qibSchedule(); toast('تم تحديد موقعك ✓');
    }, err => {
        toast(err && err.code === 1 ? 'لم يتم السماح بالوصول للموقع' : 'تعذر تحديد الموقع — جرّب في مكان مفتوح');
        qibDrawStatic();
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}
function useCity() { qibMode = 'city'; store.set('qibla_src', 'city'); qibRecalc(); qibDrawStatic(); qibSchedule(); }

/* ---------- دخول/خروج الصفحة ---------- */
function qiblaEnter() {
    qibBuildDial(); qibRecalc(); qibDrawStatic(); qibSchedule();
    const DOE = window.DeviceOrientationEvent;
    const needsTap = DOE && typeof DOE.requestPermission === 'function';
    $('qbStart').style.display = needsTap ? 'flex' : 'none';
    if (!needsTap) startCompass();
}
function qiblaLeave() { qibDetach(); }
document.addEventListener('visibilitychange', () => {
    const p = $('p-qibla'); if (!p || !p.classList.contains('active')) return;
    if (document.hidden) qibDetach(); else if (Q.granted || !(window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission)) startCompass();
});
