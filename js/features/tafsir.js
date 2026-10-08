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
    let cache = null; try { cache = await caches.open(TF_CACHE); } catch (e) {}
    if (cache) { const hit = await cache.match(url); if (hit) { const j = await hit.json(); if (j && j.data) return j.data; } }
    const res = await fetch(url); if (!res.ok) throw new Error('HTTP');
    const copy = res.clone(), j = await res.json(); if (!j || !j.data) throw new Error('bad');
    if (cache) cache.put(url, copy).catch(() => {});
    return j.data;
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
async function downloadTafsirOffline() {
    const btn = $('tfDlBtn'), bar = $('tfBar'), wrap = $('tfBarWrap'), txt = $('tfDlText');
    if (btn.dataset.busy) return;
    if (!isOnline()) { toast('محتاج إنترنت للتنزيل'); return; }
    const c = await openCache(TF_CACHE); if (!c) { toast('المتصفح لا يدعم الحفظ'); return; }
    btn.dataset.busy = '1'; persistStorage(); wrap.style.display = 'block';
    const jobs = []; ['ar.muyassar', 'ar.jalalayn'].forEach(ed => { for (let n = 1; n <= 114; n++) jobs.push([n, ed]); });
    let done = 0, failed = 0;
    await pool(jobs, 4, async ([n, ed]) => {
        const url = `https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,${ed}`;
        try { if (!(await c.match(url))) { const r = await fetch(url); if (!r.ok) throw new Error('bad'); await c.put(url, r); } } catch (e) { failed++; }
        done++; bar.style.width = (done / jobs.length * 100) + '%'; txt.innerText = `جاري حفظ التفسير... ${A(done)}/${A(jobs.length)}`;
    });
    delete btn.dataset.busy; setTimeout(() => { wrap.style.display = 'none'; }, 900);
    if (failed) toast(`تعذر حفظ ${A(failed)} — حاول مرة أخرى`); else toast('تم حفظ التفسير كاملاً ✓');
    checkTafsirState(); renderStorageInfo();
}
async function checkTafsirState() {
    const btn = $('tfDlBtn'); if (!btn || btn.dataset.busy) return;
    const c = await openCache(TF_CACHE); const n = c ? (await c.keys()).length : 0;
    if (n >= 228) { btn.classList.add('done'); $('tfDlText').innerHTML = '✅ التفسير محفوظ كاملاً (الميسّر + الجلالين)'; }
    else { btn.classList.remove('done'); $('tfDlText').innerHTML = `📥 تنزيل التفسير كاملاً للاستخدام بدون إنترنت${n ? ` (${A(n)}/${A(228)})` : ''}`; }
}
