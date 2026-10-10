/* أَثَر — تنزيل تلاوات الشيوخ: نفس كاش الصوتيات اللي المشغّل بيقرا منه، فتشتغل أوفلاين */

let rdBusy = false, rdAbort = false;
const rdFmt = n => A(n);

function rdInitSelects() {
    const rec = $('rdRec'), from = $('rdFrom'), to = $('rdTo');
    if (!rec || !from || !to || rec.options.length) return;
    rec.innerHTML = RECITERS.map(r => `<option value="${esc(r.id)}">${esc(r.name)}${r.sub ? ' — ' + esc(r.sub) : ''}</option>`).join('');
    rec.value = recId;
    const surahOpts = surahs.map((n, i) => `<option value="${i + 1}">${i + 1}. ${esc(n)}</option>`).join('');
    from.innerHTML = surahOpts; to.innerHTML = surahOpts;
    from.value = '1'; to.value = '114';
}

// كل الروابط المحفوظة في كاش الصوتيات (مرة واحدة)
async function rdCachedSet() {
    const c = await openCache(AUD_CACHE);
    if (!c) return new Set();
    return new Set((await c.keys()).map(r => r.url));
}
// عدد الآيات المحفوظة لكل سورة للقارئ المختار
function rdCountsFor(set, r) {
    return surahs.map((_, i) => {
        const s = i + 1; let n = 0;
        for (let a = 1; a <= AYAH_COUNTS[i]; a++) if (set.has(audioUrl(s, a, r))) n++;
        return n;
    });
}

async function renderRec() {
    if (!$('rdList')) return;
    rdInitSelects();
    const r = $('rdRec').value;
    const set = await rdCachedSet();
    const counts = rdCountsFor(set, r);
    const total = AYAH_COUNTS.reduce((a, b) => a + b, 0);
    const have = counts.reduce((a, b) => a + b, 0);
    const name = (RECITERS.find(x => x.id === r) || {}).name || '';
    $('rdSum').textContent = `${name}: ${rdFmt(have)} من ${rdFmt(total)} آية محفوظة`;
    $('rdList').innerHTML = surahs.map((nm, i) => {
        const c = counts[i], full = c >= AYAH_COUNTS[i];
        const badge = full ? '✓' : c ? `${rdFmt(c)}/${rdFmt(AYAH_COUNTS[i])}` : '—';
        return `<div class="rd-row${full ? ' full' : ''}" onclick="rdPickSurah(${i + 1})"><span>${rdFmt(i + 1)}. ${esc(nm)}</span><b>${badge}</b></div>`;
    }).join('');
}
function rdPickSurah(s) {
    $('rdFrom').value = String(s); $('rdTo').value = String(s);
    toast(`تم اختيار سورة ${surahs[s - 1]}`);
}
function rdStop() { rdAbort = true; }

async function rdDownload() {
    if (rdBusy) { toast('التنزيل شغّال بالفعل...'); return; }
    if (!isOnline()) { toast('محتاج إنترنت للتنزيل'); return; }
    const r = $('rdRec').value, from = +$('rdFrom').value, to = +$('rdTo').value;
    if (from > to) { toast('النطاق غلط: السورة الأولى لازم تكون قبل الأخيرة'); return; }
    const c = await openCache(AUD_CACHE);
    if (!c) { toast('المتصفح لا يدعم الحفظ'); return; }

    const have = await rdCachedSet();
    const items = [];
    for (let s = from; s <= to; s++) for (let n = 1; n <= AYAH_COUNTS[s - 1]; n++) {
        if (!have.has(audioUrl(s, n, r))) items.push([s, n]);
    }
    if (!items.length) { toast('النطاق ده محفوظ كامل ✓'); return; }

    rdBusy = true; rdAbort = false; persistStorage();
    const recLabel = (RECITERS.find(x => x.id === r) || {}).name || '';
    const wrap = $('rdBarWrap'), bar = $('rdBar'), prog = $('rdProg'), go = $('rdGo'), stop = $('rdStop');
    wrap.style.display = 'block'; bar.style.width = '0%';
    go.style.display = 'none'; stop.style.display = 'inline-block';
    let done = 0, failed = 0;
    const total = items.length;
    toast(`جاري تنزيل ${rdFmt(total)} آية بصوت ${recLabel}`);
    try {
        await pool(items, 3, async ([s, n]) => {
            if (rdAbort) return;
            const res = await cacheAyahAudio(c, s, n, r);
            if (res === 'fail') failed++;
            done++;
            bar.style.width = (done / total * 100) + '%';
            prog.textContent = `تنزيل ${rdFmt(done)} / ${rdFmt(total)}`;
        });
    } finally {
        rdBusy = false;
        go.style.display = 'inline-block'; stop.style.display = 'none';
        setTimeout(() => { wrap.style.display = 'none'; }, 1200);
    }
    if (rdAbort) toast(`تم إيقاف التنزيل — ${rdFmt(done - failed)} آية محفوظة`);
    else if (failed === total) toast('السيرفر ما سمحش بالتنزيل حالياً — حاول بعدين');
    else if (failed) toast(`تم حفظ ${rdFmt(total - failed)} وتعذر ${rdFmt(failed)} — اضغط تنزيل للإكمال`);
    else toast(`تم تنزيل ${recLabel} ✓`);
    prog.textContent = '';
    renderRec(); renderStorageInfo();
}

async function rdDelete() {
    const r = $('rdRec').value;
    const name = (RECITERS.find(x => x.id === r) || {}).name || '';
    if (!confirm(`تحذف كل تلاوات ${name} المحفوظة؟`)) return;
    const c = await openCache(AUD_CACHE); if (!c) return;
    let n = 0;
    for (const req of await c.keys()) {
        if (req.url.includes(`/data/${r}/`)) { await c.delete(req); n++; }
    }
    toast(n ? `تم حذف ${rdFmt(n)} آية` : 'مفيش تلاوات محفوظة لهذا القارئ');
    renderRec(); renderStorageInfo();
}

if (document.readyState !== 'loading') renderRec(); else document.addEventListener('DOMContentLoaded', renderRec);
