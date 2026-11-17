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
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const nextTimes = $('countrySelect') && $('citySelect') ? (ptLookup($('countrySelect').value, $('citySelect').value, tomorrow) || prayerTimings) : prayerTimings;
    const hm = parseHM(nextTimes && nextTimes.Fajr); if (!hm) return null;
    const d = new Date(tomorrow); d.setHours(hm[0], hm[1], 0, 0);
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
    prayerTimings = t || {};
    const np = nextPrayer();
    $('prayerList').innerHTML = Object.keys(PRAYERS).map(k => {
        const at = prayerDate(k, new Date());
        const iqama = at ? new Date(at.getTime() + iqamaDelay(k) * 60000) : null;
        const next = np && np.k === k;
        return `<article class="s-card prayer-time-card${next ? ' is-next' : ''}">
            <div class="pt-name-wrap">${typeof adBellHTML === 'function' ? adBellHTML(k) : ''}<div class="pt-name">${PRAYERS[k]}${next ? '<small>الصلاة القادمة</small>' : ''}</div></div>
            <div class="pt-times"><div><small>الأذان</small><b>${esc(formatTime12(prayerTimings[k]))}</b></div><div><small>الإقامة المقدّرة</small><b>${iqama ? esc(formatDateTime12(iqama)) : '—'}</b></div></div>
        </article>`;
    }).join('');
    updateNextPrayer();
    updatePrayerClock();
    updateIqamaClock();
    if (typeof adhanSchedule === 'function') { adhanSchedule(); if (typeof nativeSync === 'function') nativeSync(); }
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
        saveCityCoords(country, city, d.data.meta);
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
    if (!prayerTimings || !prayerTimings.Fajr) return;
    const np = nextPrayer(); if (!np) return;
    $('nextPrayerDisplay').innerText = `باقي على ${np.name}: ${formatDuration(np.date - new Date())}`;
}

function formatTime12(s) {
    const hm = parseHM(s); if (!hm) return s || '';
    const h = hm[0];
    return `${h % 12 || 12}:${String(hm[1]).padStart(2, '0')} ${h >= 12 ? 'م' : 'ص'}`;
}

/* ---------- ساعة الصلاة ومواعيد الإقامة المحلية ----------
   الأذان مصدره خدمة المواقيت، أما الإقامة فتختلف بين المساجد؛ لذلك نخزّن مددًا قابلة للتعديل لكل مدينة. */
const IQAMA_DEFAULTS = { Fajr: 20, Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 10 };
const iqamaKey = k => `iqama_${$('countrySelect') ? $('countrySelect').value : 'Egypt'}_${$('citySelect') ? $('citySelect').value : 'Cairo'}_${k}`;
function iqamaDelay(k) {
    const saved = parseInt(store.get(iqamaKey(k)), 10);
    return Number.isFinite(saved) ? Math.max(0, Math.min(180, saved)) : IQAMA_DEFAULTS[k];
}
function formatDateTime12(d) {
    if (!d || !Number.isFinite(d.getTime())) return '—';
    return formatTime12(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
}
function formatDuration(ms) {
    const seconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return `${A(pad2(h))}:${A(pad2(m))}:${A(pad2(s))}`;
}
function prayerClockProgress(np, now) {
    if (!np || !np.date) return 0;
    const order = PT_KEYS;
    const idx = order.indexOf(np.k);
    let prev;
    if (idx > 0) prev = prayerDate(order[idx - 1], now);
    else {
        prev = prayerDate('Isha', now);
        if (prev && prev > now) prev.setDate(prev.getDate() - 1);
    }
    const span = prev ? np.date - prev : 0;
    return span > 0 ? Math.max(0, Math.min(1, (now - prev) / span)) : 0;
}
function setRing(circle, progress, radius) {
    if (!circle) return;
    const length = 2 * Math.PI * radius;
    circle.style.strokeDasharray = String(length);
    circle.style.strokeDashoffset = String(length * (1 - Math.max(0, Math.min(1, progress || 0))));
}
function updatePrayerClock() {
    const card = $('prayerClockCard'); if (!card) return;
    const now = new Date(), np = prayerTimings && prayerTimings.Fajr ? nextPrayer(now) : null;
    if (!np) {
        $('pcCountdown').textContent = '--:--:--';
        $('pcPrayerName').textContent = 'تعذر حساب الصلاة القادمة';
        $('pcPrayerAt').textContent = '—'; $('pcIqamaAt').textContent = '—';
        setRing($('pcProgress'), 0, 78); return;
    }
    $('pcCountdown').textContent = formatDuration(np.date - now);
    $('pcPrayerName').textContent = np.name;
    $('pcPrayerAt').textContent = formatDateTime12(np.date);
    const expectedIqama = new Date(np.date.getTime() + iqamaDelay(np.k) * 60000);
    $('pcIqamaAt').textContent = expectedIqama ? formatDateTime12(expectedIqama) : '—';
    const citySelect = $('citySelect');
    $('pcLocation').textContent = citySelect && citySelect.options[citySelect.selectedIndex] ? citySelect.options[citySelect.selectedIndex].text : '';
    setRing($('pcProgress'), prayerClockProgress(np, now), 78);
}
function nextIqamaTarget(now = new Date()) {
    if (!$('countrySelect') || !$('citySelect')) return null;
    const country = $('countrySelect').value, city = $('citySelect').value, candidates = [];
    for (let offset = 0; offset < 3; offset++) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        const timings = offset === 0 && prayerTimings && prayerTimings.Fajr ? prayerTimings : (ptLookup(country, city, day) || prayerTimings);
        if (!timings) continue;
        PT_KEYS.forEach(k => {
            const hm = parseHM(timings[k]); if (!hm) return;
            const prayerAt = new Date(day); prayerAt.setHours(hm[0], hm[1], 0, 0);
            const iqamaAt = new Date(prayerAt.getTime() + iqamaDelay(k) * 60000);
            if (iqamaAt > now) candidates.push({ k, prayerAt, date: iqamaAt, delay: iqamaDelay(k) });
        });
    }
    candidates.sort((a, b) => a.date - b.date);
    return candidates[0] || null;
}
function updateIqamaClock() {
    if (!$('iqamaCountdown')) return;
    const target = nextIqamaTarget(), now = new Date();
    const citySelect = $('citySelect');
    $('iqamaCityLabel').textContent = citySelect && citySelect.options[citySelect.selectedIndex] ? citySelect.options[citySelect.selectedIndex].text : 'حسب المدينة المختارة';
    if (!target) {
        $('iqamaCountdown').textContent = '--:--:--';
        $('iqamaCountdownLabel').textContent = 'لا توجد مواقيت قادمة محفوظة';
        $('iqamaNextName').textContent = '—'; $('iqamaNextAt').textContent = '—';
        setRing($('iqamaProgress'), 0, 82); return;
    }
    $('iqamaCountdown').textContent = formatDuration(target.date - now);
    $('iqamaCountdownLabel').textContent = 'متبقي حتى الإقامة';
    $('iqamaNextName').textContent = `إقامة صلاة ${PRAYERS[target.k]}`;
    $('iqamaNextAt').textContent = formatDateTime12(target.date);
    const total = target.delay * 60000;
    const progress = total > 0 ? (now - target.prayerAt) / total : 1;
    setRing($('iqamaProgress'), progress, 82);
}
function openIqamaScreen() {
    nav('p-iqama');
}
function setIqamaDelay(k, value) {
    if (!PT_KEYS.includes(k)) return;
    const mins = Math.max(0, Math.min(180, parseInt(value, 10) || 0));
    store.set(iqamaKey(k), String(mins));
    renderIqamaScreen(); updatePrayerClock(); updateIqamaClock();
    const card = $('prayerList');
    if (card && prayerTimings && prayerTimings.Fajr) showPrayers(prayerTimings);
}
function renderIqamaScreen() {
    const host = $('iqamaPrayerSettings'); if (!host) return;
    const citySelect = $('citySelect');
    $('iqamaCityLabel').textContent = citySelect && citySelect.options[citySelect.selectedIndex] ? citySelect.options[citySelect.selectedIndex].text : 'حسب المدينة المختارة';
    host.innerHTML = PT_KEYS.map(k => {
        const at = prayerDate(k, new Date());
        const iq = at ? new Date(at.getTime() + iqamaDelay(k) * 60000) : null;
        return `<label class="iqama-setting-row"><span class="iqama-setting-name">${PRAYERS[k]}<small>الإقامة ${iq ? esc(formatDateTime12(iq)) : '—'}</small></span><span class="iqama-mins"><input type="number" inputmode="numeric" min="0" max="180" step="1" value="${iqamaDelay(k)}" aria-label="دقائق إقامة ${PRAYERS[k]}" onchange="setIqamaDelay('${k}',this.value)"><em>دقيقة</em></span></label>`;
    }).join('');
    updateIqamaClock();
}
function resetIqamaDefaults() {
    PT_KEYS.forEach(k => store.set(iqamaKey(k), String(IQAMA_DEFAULTS[k])));
    renderIqamaScreen(); updatePrayerClock(); updateIqamaClock();
    if (prayerTimings && prayerTimings.Fajr) showPrayers(prayerTimings);
    toast('تمت استعادة المدد المقترحة، ويمكنك تعديلها حسب مسجدك');
}

/* إحداثيات المدينة (بتيجي مع رد المواقيت) — بنحفظها عشان القبلة تشتغل أوفلاين */
const cityLLKey = (c, ci) => `ll_${c}_${ci}`;
function saveCityCoords(country, city, meta) {
    const lat = meta && parseFloat(meta.latitude), lng = meta && parseFloat(meta.longitude);
    if (isFinite(lat) && isFinite(lng)) { store.set(cityLLKey(country, city), JSON.stringify([lat, lng])); if (typeof onCityCoordsChanged === 'function') onCityCoordsChanged(); }
}
function cityCoords(country, city) {
    try { const a = JSON.parse(store.get(cityLLKey(country, city))); if (a && isFinite(a[0]) && isFinite(a[1])) return { lat: a[0], lng: a[1], exact: true }; } catch (e) {}
    return null;
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
    if (j.data[0]) saveCityCoords(country, city, j.data[0].meta);
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
    if (typeof nativeSync === 'function') nativeSync();
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
    if (typeof nativeSync === 'function') nativeSync();
}
