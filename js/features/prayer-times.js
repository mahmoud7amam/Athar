/* أَثَر — مواقيت الصلاة: الحساب والعرض والحفظ للأوفلاين */

function parseHM(s) {
    const m = /(\d{1,2}):(\d{2})/.exec(s || '');
    return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}
function prayerDate(k, base) {
    const hm = parseHM(prayerTimings[k]); if (!hm) return null;
    const d = new Date(base); d.setHours(hm[0], hm[1], 0, 0); return d;
}
function nextPrayer(now = new Date()) {
    for (const k in PRAYERS) {
        const d = prayerDate(k, now);
        if (d && d > now) return { k, name: PRAYERS[k], date: d };
    }
    const d = prayerDate('Fajr', now); if (!d) return null;
    d.setDate(d.getDate() + 1);
    return { k: 'Fajr', name: PRAYERS.Fajr, date: d };
}

function updateCities(savedCity = null, isManualChange = false) {
    const countryKey = $('countrySelect').value;
    store.set('saved_country', countryKey);
    const citySelect = $('citySelect');
    citySelect.innerHTML = '';
    if (arabCountries[countryKey]) {
        const frag = document.createDocumentFragment();
        arabCountries[countryKey].cities.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.en; opt.innerText = c.ar;
            if (savedCity && c.en === savedCity) opt.selected = true;
            frag.appendChild(opt);
        });
        citySelect.appendChild(frag);
    }
    getPrayers(isManualChange);
}

let prayersSeq = 0;
function showPrayers(t) {
    prayerTimings = t;
    $('prayerList').innerHTML = Object.keys(PRAYERS).map(k => `<div class="s-card"><b>${PRAYERS[k]}</b><span>${formatTime12(prayerTimings[k])}</span></div>`).join('');
    updateNextPrayer();
    if (typeof adhanReschedule === 'function') adhanReschedule();
    if (typeof renderAdhanSettings === 'function') renderAdhanSettings();
}
async function getPrayers(isManualChange = false) {
    const country = $('countrySelect').value, city = $('citySelect').value;
    const seq = ++prayersSeq;
    store.set('saved_city', city);
    const cacheKey = `pt_${country}_${city}_${new Date().toDateString()}`;
    let timings = ptLookup(country, city), fromNet = false;
    if (!timings) { try { timings = JSON.parse(store.get(cacheKey)); } catch (e) {} }
    if (timings) showPrayers(timings);
    try {
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`);
        const d = await res.json();
        if (!d.data || !d.data.timings) throw new Error('bad');
        timings = d.data.timings; fromNet = true;
        store.set(cacheKey, JSON.stringify(timings));
    } catch (e) {}
    if (seq !== prayersSeq) return;
    if (!timings) {
        $('prayerList').innerHTML = `<div class="state-msg err">تعذر تحميل المواقيت. تحقق من الإنترنت.<br><button class="retry-btn" onclick="getPrayers(false)">إعادة المحاولة</button></div>`;
        $('nextPrayerDisplay').innerText = "تعذر حساب موعد الصلاة";
        return;
    }
    showPrayers(timings);
    refreshPrayerDlState();
    if (fromNet) autoSavePrayers(country, city);

    if (isManualChange) {
        const citySelect = $('citySelect');
        const cityNameAr = (citySelect.options[citySelect.selectedIndex] || {}).text || city;
        const np = nextPrayer();
        if (np) {
            showNotify("🕌 أَثَر | تم تحديث الموقع بنجاح", {
                body: `تم ضبط المواقيت لمدينة ${cityNameAr}.\nالصلاة القادمة: ${np.name} (${formatTime12(prayerTimings[np.k])}).\nتقبل الله منا ومنكم.`
            });
        }
    }
}

function updateNextPrayer() {
    if (!prayerTimings.Fajr) return;
    const np = nextPrayer(); if (!np) return;
    const diff = np.date - new Date();
    const hours = Math.floor(diff / 3600000), mins = Math.floor((diff % 3600000) / 60000);
    $('nextPrayerDisplay').innerText = `باقي على ${np.name}: ${hours}س و ${mins}د`;
}

function formatTime12(s) {
    const hm = parseHM(s); if (!hm) return s || '';
    const h = hm[0];
    return `${h % 12 || 12}:${String(hm[1]).padStart(2, '0')} ${h >= 12 ? 'م' : 'ص'}`;
}

/* ---------- حفظ المواقيت (تلقائي + تنزيل السنة) ---------- */
const PT_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const ptKey = (c, ci, y) => `pt_year_${c}_${ci}_${y}`;
function ptLoad(country, city, y) { try { return JSON.parse(store.get(ptKey(country, city, y))) || {}; } catch (e) { return {}; } }
function ptLookup(country, city, date = new Date()) {
    const m = ptLoad(country, city, date.getFullYear())[pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())];
    if (!m) return null;
    const o = {}; PT_KEYS.forEach((k, i) => o[k] = m[i]); return o;
}
async function ptFetchMonth(country, city, y, m) {
    const res = await fetch(`https://api.aladhan.com/v1/calendarByCity/${y}/${m}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    if (!j || !Array.isArray(j.data)) throw new Error('bad');
    const out = {};
    j.data.forEach(d => {
        const [dd, mm] = d.date.gregorian.date.split('-');
        out[`${mm}-${dd}`] = PT_KEYS.map(k => ((d.timings[k] || '').match(/\d{1,2}:\d{2}/) || [''])[0]);
    });
    return out;
}
async function ptSaveMonths(country, city, months, onStep) {
    const byYear = {}; let failed = 0;
    for (const [y, m] of months) {
        try {
            const o = await ptFetchMonth(country, city, y, m);
            byYear[y] = Object.assign(byYear[y] || ptLoad(country, city, y), o);
        } catch (e) { failed++; }
        if (onStep) onStep();
    }
    for (const y in byYear) store.set(ptKey(country, city, y), JSON.stringify(byYear[y]));
    return failed;
}
function nextMonths(count) {
    const d = new Date(), out = [];
    for (let i = 0; i < count; i++) { out.push([d.getFullYear(), d.getMonth() + 1]); d.setDate(1); d.setMonth(d.getMonth() + 1); }
    return out;
}
// حفظ تلقائي: الشهر الحالي والقادم لأي مدينة تُفتح
async function autoSavePrayers(country, city) {
    const key = `pt_auto_${country}_${city}`, today = new Date().toDateString();
    if (store.get(key) === today) return;
    const need = nextMonths(2).filter(([y, m]) => {
        const days = Object.keys(ptLoad(country, city, y)).filter(k => k.startsWith(pad2(m) + '-')).length;
        return days < 28;
    });
    if (!need.length) { store.set(key, today); return; }
    const failed = await ptSaveMonths(country, city, need);
    if (!failed) store.set(key, today);
    refreshPrayerDlState();
}
function ptSavedUntil(country, city) {
    let last = null;
    for (const [y, m] of nextMonths(14)) {
        const days = Object.keys(ptLoad(country, city, y)).filter(k => k.startsWith(pad2(m) + '-')).length;
        if (days >= 28) last = [y, m]; else break;
    }
    return last;
}
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
function refreshPrayerDlState() {
    const btn = $('ptDlBtn'); if (!btn) return;
    const country = $('countrySelect').value, city = $('citySelect').value;
    const until = ptSavedUntil(country, city);
    const cityName = ($('citySelect').options[$('citySelect').selectedIndex] || {}).text || city;
    if (until && !btn.dataset.busy) {
        $('ptDlText').innerHTML = `✅ مواقيت ${esc(cityName)} محفوظة حتى ${MONTHS_AR[until[1] - 1]} ${A(until[0])}<br><small>اضغط لتنزيل 12 شهراً كاملة وتحديثها</small>`;
        btn.classList.add('done');
    } else if (!btn.dataset.busy) {
        $('ptDlText').innerHTML = `📥 تنزيل مواقيت ${esc(cityName)} لـ 12 شهراً<br><small>تُحفظ تلقائياً أيضاً، وتعمل بدون إنترنت</small>`;
        btn.classList.remove('done');
    }
}
async function downloadPrayerYear() {
    const btn = $('ptDlBtn'); if (btn.dataset.busy) return;
    if (!isOnline()) { toast('محتاج إنترنت للتنزيل'); return; }
    btn.dataset.busy = '1';
    const country = $('countrySelect').value, city = $('citySelect').value;
    const months = nextMonths(12), wrap = $('ptBarWrap'), bar = $('ptBar'); let done = 0;
    wrap.style.display = 'block'; bar.style.width = '0%';
    $('ptDlText').innerText = 'جاري تنزيل المواقيت...';
    const failed = await ptSaveMonths(country, city, months, () => { done++; bar.style.width = (done / months.length * 100) + '%'; $('ptDlText').innerText = `جاري التنزيل... ${A(done)}/${A(months.length)}`; });
    delete btn.dataset.busy;
    setTimeout(() => { wrap.style.display = 'none'; }, 800);
    if (failed) toast(`تعذر تنزيل ${A(failed)} شهر — حاول مرة أخرى`); else toast('تم حفظ مواقيت 12 شهراً ✓');
    refreshPrayerDlState(); renderStorageInfo();
}
