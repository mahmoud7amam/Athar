/* أَثَر — المصحف بدون إنترنت: تنزيل الكاش والبحث المحلي */

/* ---------- حفظ الخطوط والصور (للأوفلاين الكامل) ---------- */
async function cacheAppAssets() {
    const c = await openCache(ASSETS_CACHE); if (!c) return;
    const urls = new Set();
    document.querySelectorAll('img[src^="http"]').forEach(i => urls.add(i.src));
    ['https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js', 'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js', 'https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js'].forEach(u => urls.add(u));
    const fonts = [];
    for (const l of document.querySelectorAll('link[rel="stylesheet"][href^="http"]')) {
        try {
            const r = await fetch(l.href); const t = await r.clone().text();
            await c.put(l.href, r);
            (t.match(/https:\/\/fonts\.gstatic\.com[^)'"\s]+/g) || []).forEach(u => fonts.push(u));
        } catch (e) {}
    }
    await pool([...urls], 4, async u => {
        if (await c.match(u)) return;
        try { await c.put(u, await fetch(u)); }
        catch (e) { try { await c.put(u, await fetch(u, { mode: 'no-cors' })); } catch (e2) {} }
    });
    await pool([...new Set(fonts)], 4, async u => {
        try { if (!(await c.match(u))) await c.put(u, await fetch(u)); } catch (e) {}
    });
}

/* ---------- تحميل المصحف كاملاً (سور • أجزاء • أحزاب • صفحات) ---------- */
async function countSurahsCached() {
    const c = await openCache(QCACHE); if (!c) return 0;
    const keys = await c.keys();
    return keys.filter(r => /\/surah\/\d+\//.test(r.url)).length;
}
async function downloadQuranOffline(silent = false) {
    const btn = $('dlBtn'), bar = $('dlBar'), txt = $('dlText'), wrap = $('dlBarWrap');
    if (btn.dataset.busy) return;
    if (!isOnline()) { if (!silent) toast('محتاج إنترنت للتنزيل'); return; }
    const cache = await openCache(QCACHE);
    if (!cache) { if (!silent) toast('المتصفح لا يدعم الحفظ'); return; }
    btn.dataset.busy = '1'; persistStorage();
    if (!silent) { wrap.style.display = 'block'; bar.style.width = '0%'; txt.innerText = 'جاري حفظ الخطوط والصور...'; }
    await cacheAppAssets();
    let done = 0, failed = 0;
    const ids = Array.from({ length: 114 }, (_, i) => i + 1);
    await pool(ids, 4, async i => {
        const url = qurl('surah', i);
        try {
            if (!(await cache.match(url))) {
                const res = await fetch(url);
                if (!res.ok) throw new Error('bad');
                await cache.put(url, res);
            }
        } catch (e) { failed++; }
        done++;
        if (!silent) { bar.style.width = (done / 114 * 100) + '%'; txt.innerText = `جاري حفظ المصحف... ${A(done)}/${A(114)}`; }
    });
    delete btn.dataset.busy;
    if (!failed) {
        store.set('quran_downloaded', 'true');
        if (silent) toast('تم حفظ المصحف تلقائياً للاستخدام بدون إنترنت ✓');
    } else if (!silent) toast(`تعذر حفظ ${A(failed)} سورة — اضغط للمحاولة مرة أخرى`);
    setTimeout(() => { wrap.style.display = 'none'; }, 900);
    checkOfflineState(); renderStorageInfo();
}

async function checkOfflineState() {
    const btn = $('dlBtn'), txt = $('dlText'); if (!btn || btn.dataset.busy) return;
    const n = await countSurahsCached();
    if (n >= 114) {
        store.set('quran_downloaded', 'true');
        btn.classList.add('done');
        txt.innerHTML = '✅ المصحف محفوظ كاملاً على هاتفك<br><small>114 سورة • 30 جزءاً • 60 حزباً • 604 صفحات + الخطوط والصور — يعمل بدون إنترنت</small>';
    } else {
        try { localStorage.removeItem('quran_downloaded'); } catch (e) {}
        btn.classList.remove('done');
        txt.innerHTML = n ? `📥 أكمل تنزيل المصحف (${A(n)}/${A(114)})<br><small>سور • أجزاء • أحزاب • صفحات + الخطوط والصور</small>`
                          : '📥 تنزيل المصحف كاملاً للاستخدام بدون إنترنت<br><small>سور • أجزاء • أحزاب • صفحات + الخطوط والصور</small>';
    }
}

// تنزيل تلقائي هادئ (النص صغير الحجم) لما يكون في إنترنت وتوفير البيانات مقفول
function scheduleAutoDownload() {
    if (store.get('quran_downloaded') === 'true') return;
    if (navigator.connection && navigator.connection.saveData) return;
    setTimeout(async () => { if (isOnline() && (await countSurahsCached()) < 114) downloadQuranOffline(true); }, 9000);
}

/* ---------- بحث وقراءة محلية (بدون إنترنت) ---------- */
let allSurahsMem = null, normMem = null;
async function loadAllSurahs() {
    if (allSurahsMem) return allSurahsMem;
    const c = await openCache(QCACHE); if (!c) return null;
    const out = [];
    for (let n = 1; n <= 114; n++) {
        let d = surahMem.get(n);
        if (!d) { const hit = await c.match(qurl('surah', n)); if (!hit) return null; d = (await hit.json()).data; surahMem.set(n, d); }
        out.push(d);
    }
    return (allSurahsMem = out);
}
async function searchLocal(keyword) {
    const all = await loadAllSurahs(); if (!all) return null;
    const kw = normAr(keyword).trim(); if (!kw) return { count: 0, matches: [] };
    if (!normMem) normMem = all.map(d => d.ayahs.map(a => normAr(a.numberInSurah === 1 && d.number !== 1 ? stripBasmala(a.text) : a.text)));
    const matches = []; let count = 0;
    all.forEach((d, si) => d.ayahs.forEach((a, ai) => {
        if (normMem[si][ai].includes(kw)) {
            count++;
            if (matches.length < 100) matches.push({ number: a.number, numberInSurah: a.numberInSurah, surah: { number: d.number }, text: a.numberInSurah === 1 && d.number !== 1 ? stripBasmala(a.text) : a.text });
        }
    }));
    return { count, matches };
}
