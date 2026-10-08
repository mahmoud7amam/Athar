/* ---------- التفسير ---------- */

let tfEd = store.get('tf_ed') || 'ar.muyassar', tfSurah = null, tfSeq = 0;
function surahCardHTML(i, onclick) {
    const si = surahInfoMem[i + 1], name = surahs[i].replace('سورة ', '').trim();
    return `<div class="sr-card" role="button" onclick="${onclick}"><span class="sr-num"><i>${toArabicDigits(i + 1)}</i></span><div class="sr-info"><b>${name}</b><small>${si.type === 'Meccan' ? 'مكية' : 'مدنية'} • ${toArabicDigits(si.count)} آية</small></div><span class="sr-chev">‹</span></div>`;
}
function renderTafsirList() {
    const f = normAr($('tfSearch').value).trim(); let h = '';
    surahs.forEach((n, i) => { if (!f || normAr(n).includes(f) || String(i + 1) === f) h += surahCardHTML(i, `openTafsir(${i + 1})`); });
    $('tfList').innerHTML = h || '<div class="state-msg">لا توجد نتائج</div>';
}
async function fetchTafsir(n, ed) {
    const url = `https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,${ed}`;
    const cache = await openCache(TF_CACHE);
    if (cache) { try { const hit = await cache.match(url, { ignoreVary: true }); if (hit) { const j = await hit.json(); if (j && j.data) return j.data; } } catch (e) {} }
    let last;
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetchWithTimeout(url, 20000); if (!res.ok) throw new Error('HTTP');
            const blob = await res.blob(); const j = JSON.parse(await blob.text()); if (!j || !j.data) throw new Error('bad');
            if (cache) putRebuilt(cache, url, blob, 'application/json').catch(() => {});
            return j.data;
        } catch (e) { last = e; if (i < 2) await sleep(600 * (i + 1)); }
    }
    throw last;
}
async function openTafsir(n) {
    tfSurah = n; const seq = ++tfSeq;
    $('tfListWrap').style.display = 'none'; $('tfView').style.display = 'block';
    document.querySelectorAll('.tf-chip').forEach(c => c.classList.toggle('on', c.dataset.e === tfEd));
    $('tfBody').innerHTML = '<div class="state-msg gold">جاري التحميل...</div>';
    $('mainScroll').scrollTop = 0;
    try {
        const d = await fetchTafsir(n, tfEd); if (seq !== tfSeq) return;
        const q = d[0].ayahs, t = d[1].ayahs;
        let h = surahBanner(n, d[0]);
        q.forEach((a, i) => {
            let txt = a.text; if (a.numberInSurah === 1 && n !== 1) txt = stripBasmala(txt);
            h += `<div class="tf-ayah"><div class="tf-q">${txt} ${marker(a.numberInSurah)}</div><div class="tf-t">${esc((t[i] || {}).text || '')}</div></div>`;
        });
        $('tfBody').innerHTML = h;
    } catch (e) {
        if (seq === tfSeq) $('tfBody').innerHTML = `<div class="state-msg err">تعذر تحميل التفسير. تحقق من الإنترنت.<br><button class="retry-btn" onclick="openTafsir(${n})">إعادة المحاولة</button></div>`;
    }
}
function setTafsirEd(ed) { tfEd = ed; store.set('tf_ed', ed); if (tfSurah) openTafsir(tfSurah); }
function closeTafsir() { tfSeq++; $('tfView').style.display = 'none'; $('tfListWrap').style.display = 'block'; $('mainScroll').scrollTop = 0; }

/* ---------- تنزيل التفسير ---------- */
const TF_EDITIONS = ['ar.muyassar', 'ar.jalalayn'];
const TF_TOTAL = TF_EDITIONS.length * 114;
const tfUrl = (n, ed) => `https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,${ed}`;
async function tafsirCachedCount() {
    const c = await openCache(TF_CACHE); if (!c) return 0;
    const keys = await c.keys();
    return keys.filter(r => /\/surah\/\d+\/editions\/quran-uthmani,ar\.(muyassar|jalalayn)$/.test(r.url)).length;
}
async function downloadTafsirOffline() {
    const btn = $('tfDlBtn'), bar = $('tfBar'), wrap = $('tfBarWrap'), txt = $('tfDlText');
    if (btn.dataset.busy) return;
    if (!isOnline()) { toast('محتاج إنترنت للتنزيل'); return; }
    const c = await openCache(TF_CACHE); if (!c) { toast('المتصفح لا يدعم الحفظ'); return; }
    btn.dataset.busy = '1'; persistStorage(); wrap.style.display = 'block'; bar.style.width = '0%';
    const jobs = []; TF_EDITIONS.forEach(ed => { for (let n = 1; n <= 114; n++) jobs.push([n, ed]); });
    let done = 0, failed = [];
    const run = async list => {
        await pool(list, 3, async ([n, ed]) => {
            const url = tfUrl(n, ed);
            try { if (!(await c.match(url, { ignoreVary: true }))) await fetchAndCache(c, url, { tries: 3, timeout: 25000, validate: validJsonData, type: 'application/json' }); }
            catch (e) { failed.push([n, ed]); }
            done++; bar.style.width = Math.min(100, done / jobs.length * 100) + '%'; txt.innerText = `جاري حفظ التفسير... ${A(Math.min(done, jobs.length))}/${A(jobs.length)}`;
        });
    };
    await run(jobs);
    if (failed.length && isOnline()) {            // جولة تانية للي فشل، بعد راحة قصيرة
        const again = failed.splice(0); await sleep(1500); done = jobs.length - again.length; await run(again);
    }
    delete btn.dataset.busy; setTimeout(() => { wrap.style.display = 'none'; }, 900);
    if (failed.length) toast(`تعذر حفظ ${A(failed.length)} — اضغط تاني للإكمال`); else toast('تم حفظ التفسير كاملاً ✓');
    checkTafsirState(); renderStorageInfo();
}
async function checkTafsirState() {
    const btn = $('tfDlBtn'); if (!btn || btn.dataset.busy) return;
    const n = await tafsirCachedCount();
    if (n >= TF_TOTAL) { btn.classList.add('done'); $('tfDlText').innerHTML = '✅ التفسير محفوظ كاملاً (الميسّر + الجلالين)'; }
    else { btn.classList.remove('done'); $('tfDlText').innerHTML = `📥 ${n ? 'أكمل تنزيل التفسير' : 'تنزيل التفسير كاملاً للاستخدام بدون إنترنت'}${n ? ` (${A(n)}/${A(TF_TOTAL)})` : ''}`; }
}
