/* أَثَر — تنزيل تلاوات الشيوخ (ضمن التنزيلات): اختيار القارئ ثم السورة، أو جزء عمّ، أو المصحف كاملاً */

const ADL = { rec: null, idx: {}, busy: false, cancel: false, view: 'main', cur: 0, done: 0, total: 0, label: '', open: false, wake: null };
const TOTAL_AYAHS = AYAH_COUNTS.reduce((a, b) => a + b, 0);
const recObj = id => RECITERS.find(r => r.id === id) || RECITERS[0];
const recLabelFull = r => r.name + (r.sub ? ' — ' + r.sub : '');
// تقدير الحجم: متوسط الآية ≈ 6.6 ثانية × معدل البت المكتوب في اسم القارئ
const recKbps = id => { const m = /_(\d+)kbps/.exec(id); return m ? +m[1] : 64; };
const estBytes = (id, ayat) => ayat * 6.6 * recKbps(id) * 125;

// فهرس المحفوظ: القارئ → عدد الآيات المحفوظة في كل سورة
async function adlRefreshIndex() {
    const idx = {}, c = await openCache(AUD_CACHE);
    if (c) for (const r of await c.keys()) {
        const m = AYAH_URL_RE.exec(r.url); if (!m) continue;
        (idx[m[1]] = idx[m[1]] || new Array(115).fill(0))[+m[2]]++;
    }
    ADL.idx = idx;
}
const adlCount = (rec, s) => (ADL.idx[rec] || [])[s] || 0;
const adlTotalFor = rec => (ADL.idx[rec] || []).reduce((a, b) => a + (b || 0), 0);
function adlOnCacheChanged() { adlRefreshIndex().then(() => { if (ADL.open && !ADL.busy) adlRender(); }); }

/* ---------- الواجهة ---------- */
async function openAudioDl() {
    if (!ADL.rec) ADL.rec = recId;
    ADL.view = 'main'; ADL.open = true;
    $('dlSheet').classList.add('open'); $('dlBd').classList.add('open');
    await adlRefreshIndex(); adlRender();
}
function closeAudioDl() { ADL.open = false; $('dlSheet').classList.remove('open'); $('dlBd').classList.remove('open'); }
function adlPickView(v) { ADL.view = v; adlRender(); }
function adlPickReciter(id) { ADL.rec = id; ADL.view = 'main'; adlRender(); }

function adlRender() {
    const body = $('dlBody'); if (!body || !ADL.open) return;
    if (ADL.view === 'reciters') {
        body.innerHTML = `<div class="dl-top"><button class="dl-back" onclick="adlPickView('main')">› رجوع</button><b>اختر القارئ</b></div>
        <div class="dl-list">${RECITERS.map(r => {
            const n = adlTotalFor(r.id);
            return `<div class="rc-item${r.id === ADL.rec ? ' on' : ''}" onclick="adlPickReciter('${r.id}')">
                <span class="rc-dot"><svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></span>
                <div style="flex:1;min-width:0">${esc(r.name)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>
                ${n ? `<span class="dl-badge">${A(n)} آية</span>` : ''}${r.id === ADL.rec ? '<span>✓</span>' : ''}</div>`;
        }).join('')}</div>`;
        return;
    }
    const r = recObj(ADL.rec), have = adlTotalFor(r.id);
    body.innerHTML = `
        <div class="dl-pick" onclick="adlPickView('reciters')">
            <span class="rc-dot"><svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></span>
            <div style="flex:1;min-width:0"><b>${esc(r.name)}</b><small>${esc(r.sub || 'القارئ المختار — اضغط للتغيير')}</small></div>
            <svg class="dl-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="dl-sum" id="dlSum"></div>
        <div class="dl-prog" id="dlProg" style="display:none">
            <div class="dl-prog-t" id="dlProgT"></div>
            <div class="dl-bar"><i id="dlBar"></i></div>
            <button class="dl-stop" onclick="adlStop()">إيقاف التنزيل</button>
        </div>
        <div class="dl-actions" id="dlActs">
            <button class="st-btn" onclick="adlDownloadJuzAmma()">جزء عمّ</button>
            <button class="st-btn" onclick="adlDownloadAll()">المصحف كاملاً</button>
            <button class="st-btn danger" onclick="adlDeleteReciter()" ${have ? '' : 'disabled'}>حذف</button>
        </div>
        <div class="dl-list" id="dlList">${AYAH_COUNTS.map((n, i) => adlRowHTML(i + 1)).join('')}</div>`;
    adlSummary(); adlProgressUI();
}
function adlRowHTML(s) {
    const n = AYAH_COUNTS[s - 1], c = adlCount(ADL.rec, s), full = c >= n;
    return `<div class="dl-row${full ? ' full' : ''}${ADL.busy && ADL.cur === s ? ' cur' : ''}" id="dlr${s}" onclick="adlTapSurah(${s})">
        <span class="dl-n">${A(s)}</span>
        <div class="dl-nm"><b>${esc(surahs[s - 1])}</b><small>${A(n)} آية</small></div>
        <span class="dl-st" id="dls${s}">${adlStatus(s)}</span></div>`;
}
function adlStatus(s) {
    const n = AYAH_COUNTS[s - 1], c = adlCount(ADL.rec, s);
    if (c >= n) return '<em class="ok">✓ محفوظة</em>';
    if (ADL.busy && ADL.cur === s) return `<em class="go">${A(c)}/${A(n)}</em>`;
    if (c) return `<em class="part">${A(c)}/${A(n)}</em>`;
    return '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"/></svg>';
}
function adlSetRow(s) {
    const el = $('dls' + s); if (el) el.innerHTML = adlStatus(s);
    const row = $('dlr' + s); if (row) { row.classList.toggle('full', adlCount(ADL.rec, s) >= AYAH_COUNTS[s - 1]); row.classList.toggle('cur', ADL.busy && ADL.cur === s); }
}
function adlSummary() {
    const el = $('dlSum'); if (!el) return;
    const r = recObj(ADL.rec), have = adlTotalFor(r.id);
    el.innerHTML = have ? `المحفوظ لهذا القارئ: <b>${A(have.toLocaleString('en'))}</b> من ${A(TOTAL_AYAHS.toLocaleString('en'))} آية`
        : `لم يُحفظ شيء بعد • المصحف كاملاً ≈ <b>${fmtMB(estBytes(r.id, TOTAL_AYAHS))}</b>`;
}
function adlProgressUI() {
    const box = $('dlProg'), acts = $('dlActs'); if (!box) return;
    box.style.display = ADL.busy ? '' : 'none';
    if (acts) acts.classList.toggle('lock', ADL.busy);
    if (!ADL.busy) return;
    $('dlProgT').textContent = `${ADL.label} • ${A(ADL.done)} / ${A(ADL.total)} آية`;
    $('dlBar').style.width = (ADL.total ? ADL.done / ADL.total * 100 : 0) + '%';
}

/* ---------- التنزيل ---------- */
function adlTapSurah(s) {
    if (ADL.busy) { toast('انتظر انتهاء التنزيل الحالي أو أوقفه'); return; }
    if (adlCount(ADL.rec, s) >= AYAH_COUNTS[s - 1]) { toast('هذه السورة محفوظة بالفعل ✓'); return; }
    adlRun([s]);
}
function adlDownloadJuzAmma() { adlRun(Array.from({ length: 37 }, (_, i) => 78 + i), 'جزء عمّ'); }
async function adlDownloadAll() {
    const r = recObj(ADL.rec), missing = AYAH_COUNTS.reduce((a, n, i) => a + Math.max(0, n - adlCount(r.id, i + 1)), 0);
    if (!missing) { toast('المصحف كامل محفوظ بصوت هذا القارئ ✓'); return; }
    let msg = `تنزيل المصحف كاملاً بصوت ${r.name} ≈ ${fmtMB(estBytes(r.id, missing))}.`;
    try { const e = await navigator.storage.estimate(); if (e.quota) msg += `\nالمساحة المتاحة ≈ ${fmtMB(Math.max(0, e.quota - e.usage))}.`; } catch (e) {}
    if (!confirm(msg + '\nمتابعة؟ (يفضّل Wi‑Fi)')) return;
    adlRun(AYAH_COUNTS.map((_, i) => i + 1), 'المصحف كاملاً');
}
function adlStop() { ADL.cancel = true; $('dlProgT') && ($('dlProgT').textContent = 'جاري الإيقاف…'); }
async function adlDeleteReciter() {
    const r = recObj(ADL.rec); if (ADL.busy || !adlTotalFor(r.id)) return;
    if (!confirm(`حذف كل تلاوات ${r.name} المحفوظة؟`)) return;
    const c = await openCache(AUD_CACHE); if (!c) return;
    const tag = `/data/${r.id}/`;
    for (const k of await c.keys()) if (k.url.includes(tag)) await c.delete(k);
    await adlRefreshIndex(); adlRender(); renderStorageInfo(); toast('تم الحذف');
}

async function adlRun(list, label) {
    if (ADL.busy) return;
    if (!isOnline()) { toast('محتاج إنترنت للتنزيل'); return; }
    const c = await openCache(AUD_CACHE); if (!c) { toast('المتصفح لا يدعم الحفظ'); return; }
    const rec = ADL.rec, r = recObj(rec);
    const todo = list.filter(s => adlCount(rec, s) < AYAH_COUNTS[s - 1]);
    if (!todo.length) { toast('كله محفوظ بالفعل ✓'); return; }
    ADL.busy = true; ADL.cancel = false; ADL.done = 0; persistStorage();
    ADL.total = todo.reduce((a, s) => a + AYAH_COUNTS[s - 1] - adlCount(rec, s), 0);
    try { if (navigator.wakeLock) ADL.wake = await navigator.wakeLock.request('screen'); } catch (e) {}
    let failed = 0, streak = 0, aborted = false;
    for (const s of todo) {
        if (ADL.cancel) break;
        ADL.cur = s; ADL.label = list.length === 1 ? `سورة ${surahs[s - 1]}` : (label || 'تنزيل') + ` — ${surahs[s - 1]}`;
        adlSetRow(s); adlProgressUI();
        const items = Array.from({ length: AYAH_COUNTS[s - 1] }, (_, i) => i + 1);
        await pool(items, 4, async n => {
            if (ADL.cancel) return;
            const had = !!(await c.match(audioUrl(s, n, rec), { ignoreVary: true }));
            if (had) return;
            const res = await cacheAyahAudio(c, s, n, rec, false);
            if (res === 'ok') { (ADL.idx[rec] = ADL.idx[rec] || new Array(115).fill(0))[s]++; ADL.done++; streak = 0; }
            else { failed++; if (++streak >= 12) { ADL.cancel = true; aborted = true; } }
            if (ADL.done % 3 === 0 || res !== 'ok') { adlSetRow(s); adlProgressUI(); }
        });
        adlSetRow(s); adlProgressUI();
        if (!isOnline() && !ADL.cancel) { ADL.cancel = true; aborted = true; }
    }
    const done = ADL.done, stopped = ADL.cancel;
    ADL.busy = false; ADL.cancel = false; ADL.cur = 0;
    try { if (ADL.wake) { ADL.wake.release(); ADL.wake = null; } } catch (e) {}
    await adlRefreshIndex();
    if (ADL.open) adlRender();
    renderStorageInfo();
    if (aborted) toast(done ? `توقف التنزيل (تم حفظ ${A(done)} آية) — تأكد من الإنترنت ثم أكمل` : 'السيرفر لا يسمح بالتنزيل حالياً — حاول لاحقاً');
    else if (stopped) toast(`تم الإيقاف — محفوظ ${A(done)} آية`);
    else if (failed) toast(`تم حفظ ${A(done)} آية وتعذر ${A(failed)} — أعد المحاولة للإكمال`);
    else toast(`تم تنزيل ${list.length === 1 ? 'سورة ' + surahs[list[0] - 1] : (label || 'التلاوة')} بصوت ${r.name} ✓`);
}
