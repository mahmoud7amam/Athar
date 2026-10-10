/* أَثَر — اتجاه القبلة: حساب الزاوية من موقعك + بوصلة الجهاز */

const KAABA = { lat: 21.422487, lng: 39.826206 };
const QIBLA_LOC_KEY = 'qibla_loc';
const qRad = d => d * Math.PI / 180;
const qDeg = r => r * 180 / Math.PI;
const qNorm = a => ((a % 360) + 360) % 360;

// زاوية القبلة من الشمال الحقيقي (الدائرة الكبرى)
function qiblaBearing(lat, lng) {
    const p1 = qRad(lat), p2 = qRad(KAABA.lat), dl = qRad(KAABA.lng - lng);
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return qNorm(qDeg(Math.atan2(y, x)));
}
// المسافة للكعبة بالكيلو (هافرسين)
function qiblaDistanceKm(lat, lng) {
    const R = 6371, p1 = qRad(lat), p2 = qRad(KAABA.lat);
    const dp = p2 - p1, dl = qRad(KAABA.lng - lng);
    const a = Math.pow(Math.sin(dp / 2), 2) + Math.cos(p1) * Math.cos(p2) * Math.pow(Math.sin(dl / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(a));
}

let qLoc = null, qHeading = null, qListening = false, qAligned = false, qCompassTimer = null, qGotSensor = false;
const qBearing = () => (qLoc ? qiblaBearing(qLoc.lat, qLoc.lng) : null);

/* ---------- الموقع ---------- */
function qSavedLoc() { try { return JSON.parse(store.get(QIBLA_LOC_KEY)) || null; } catch (e) { return null; } }
function qRequestLoc(cb) {
    if (!navigator.geolocation) { cb(qSavedLoc(), 'المتصفح لا يدعم تحديد الموقع'); return; }
    navigator.geolocation.getCurrentPosition(
        p => {
            const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
            store.set(QIBLA_LOC_KEY, JSON.stringify(loc));
            cb(loc, null);
        },
        err => cb(qSavedLoc(), err && err.code === 1 ? 'فعّل إذن الموقع من إعدادات المتصفح' : 'تعذر تحديد موقعك الآن'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 600000 }
    );
}

/* ---------- البوصلة ---------- */
function qOnOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) h = e.webkitCompassHeading; // iOS
    else if (e.absolute && typeof e.alpha === 'number') h = qNorm(360 - e.alpha);                              // Android
    if (h == null) return;
    qGotSensor = true;
    if (qHeading == null) qHeading = h;
    else { // تنعيم دائري عشان الإبرة ما تقفزش
        const d = ((h - qHeading + 540) % 360) - 180;
        qHeading = qNorm(qHeading + d * 0.25);
    }
    qDraw();
}
function qStartCompass() {
    if (qListening) return;
    qListening = true;
    window.addEventListener('deviceorientationabsolute', qOnOrient, true);
    window.addEventListener('deviceorientation', qOnOrient, true);
    const btn = $('qbBtn'); if (btn) btn.style.display = 'none';
    clearTimeout(qCompassTimer);
    qCompassTimer = setTimeout(() => {
        if (!qGotSensor && $('qbInfo') && qLoc) {
            $('qbInfo').textContent = `جهازك ما بيدعمش البوصلة. اتجاه القبلة من الشمال: ${A(Math.round(qBearing()))}°`;
        }
    }, 2000);
}
async function qEnableCompass() {
    try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            const r = await DeviceOrientationEvent.requestPermission();
            if (r !== 'granted') { toast('لازم تسمح بالحساس عشان البوصلة'); return; }
        }
    } catch (e) {}
    qStartCompass();
}
function qStopCompass() {
    if (!qListening) return;
    window.removeEventListener('deviceorientationabsolute', qOnOrient, true);
    window.removeEventListener('deviceorientation', qOnOrient, true);
    qListening = false; qHeading = null; qGotSensor = false; qAligned = false;
    clearTimeout(qCompassTimer);
}

/* ---------- الرسم ---------- */
function qBuildDial() {
    let ticks = '';
    for (let i = 0; i < 72; i++) {
        const a = i * 5, major = a % 30 === 0;
        ticks += `<line x1="150" y1="${major ? 14 : 20}" x2="150" y2="${major ? 32 : 26}" transform="rotate(${a} 150 150)" stroke="${major ? '#D4AF37' : '#6b5a22'}" stroke-width="${major ? 2.2 : 1}"/>`;
    }
    const L = (t, a, c) => `<text x="150" y="62" text-anchor="middle" font-size="18" font-weight="700" fill="${c}" transform="rotate(${a} 150 150)">${t}</text>`;
    return `<svg viewBox="0 0 300 300" class="qb-svg" aria-hidden="true">
        <defs><radialGradient id="qbG" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#2a2412"/><stop offset="1" stop-color="#0b0b0a"/></radialGradient></defs>
        <circle cx="150" cy="150" r="146" fill="url(#qbG)" stroke="#D4AF37" stroke-width="2.5"/>
        <circle cx="150" cy="150" r="118" fill="none" stroke="#D4AF37" stroke-opacity=".25"/>
        <g id="qbDialRot">${ticks}${L('N', 0, '#ff6b5b')}${L('E', 90, '#D4AF37')}${L('S', 180, '#D4AF37')}${L('W', 270, '#D4AF37')}</g>
        <g id="qbNeedle">
            <path d="M150 150 L142 100 L150 62 L158 100 Z" fill="#D4AF37"/>
            <path d="M150 150 L150 228" stroke="#D4AF37" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>
            <circle cx="150" cy="150" r="7" fill="#D4AF37"/>
            <g transform="translate(150 38)">
                <rect x="-16" y="-14" width="32" height="30" rx="3" fill="#111" stroke="#D4AF37" stroke-width="2"/>
                <rect x="-16" y="-3" width="32" height="5" fill="#D4AF37"/>
            </g>
        </g>
    </svg>`;
}
function qDraw() {
    const dial = $('qbDialRot'), needle = $('qbNeedle'), deg = $('qbDeg'), info = $('qbInfo');
    if (!needle) return;
    const b = qBearing();
    const h = qHeading;
    if (dial) dial.setAttribute('transform', `rotate(${h == null ? 0 : -h} 150 150)`);
    const needleAngle = b == null ? 0 : (h == null ? b : b - h);
    needle.setAttribute('transform', `rotate(${qNorm(needleAngle)} 150 150)`);
    if (b == null) { deg.textContent = '—'; return; }

    const diff = h == null ? 999 : Math.abs(((b - h + 540) % 360) - 180);
    const aligned = h != null && diff < 4;
    deg.textContent = aligned ? '✓ أنت على اتجاه القبلة' : `${A(Math.round(b))}°`;
    deg.classList.toggle('ok', aligned);
    if (aligned && !qAligned && navigator.vibrate) navigator.vibrate(40);
    qAligned = aligned;
}
function qRender(loc, err) {
    qLoc = loc;
    const info = $('qbInfo');
    if (info) {
        if (err) info.textContent = err;
        else if (loc) info.textContent = `المسافة للكعبة: ${A(Math.round(qiblaDistanceKm(loc.lat, loc.lng)))} كم`;
        else info.textContent = 'جاري تحديد موقعك...';
    }
    qDraw();
}

function openQibla() {
    let ov = $('qbOv');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'qbOv'; ov.className = 'qb-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'اتجاه القبلة');
        ov.innerHTML = `<div class="qb-card">
            <button class="qb-x" onclick="closeQibla()" aria-label="إغلاق">✕</button>
            <div class="qb-title"><svg viewBox="0 0 48 48" class="qb-ic" aria-hidden="true">${KAABA_SVG}</svg>اتجاه القبلة</div>
            <div class="qb-dial">${qBuildDial()}</div>
            <div class="qb-deg" id="qbDeg">—</div>
            <div class="qb-info" id="qbInfo"></div>
            <button class="qb-btn" id="qbBtn" onclick="qEnableCompass()" style="display:none">تفعيل البوصلة</button>
            <div class="qb-hint">امسك الموبايل مستوي وحرّكه في شكل رقم 8 لو البوصلة محتاجة معايرة.</div>
        </div>`;
        ov.addEventListener('click', e => { if (e.target === ov) closeQibla(); });
        document.body.appendChild(ov);
    }
    ov.classList.add('open');
    document.body.classList.add('qb-open');
    // iOS بيطلب إذن بضغطة زرار؛ Android بيشتغل تلقائي
    const needsTap = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
    $('qbBtn').style.display = needsTap ? 'block' : 'none';
    if (!needsTap) qStartCompass();
    qRender(null, null);
    qRequestLoc((loc, err) => {
        if (!loc) { qRender(null, err || 'تعذر تحديد موقعك'); return; }
        qRender(loc, err);
    });
    // لو فيه موقع محفوظ نعرضه فورًا لحد ما يتحدّث
    const saved = qSavedLoc(); if (saved && !qLoc) qRender(saved, null);
}
function closeQibla() {
    const ov = $('qbOv'); if (ov) ov.classList.remove('open');
    document.body.classList.remove('qb-open');
    qStopCompass();
}
const KAABA_SVG = `<rect x="6" y="8" width="36" height="34" rx="3" fill="#0d0d0c" stroke="#D4AF37" stroke-width="2.2"/><rect x="6" y="20" width="36" height="5" fill="#D4AF37"/><path d="M14 34h6v8h-6zM28 34h6v8h-6z" fill="#D4AF37" opacity=".7"/><path d="M24 2l3 4h-6z" fill="#D4AF37"/>`;
