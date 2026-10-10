/* ---------- إدارة التخزين ---------- */
const fmtMB = b => b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(1) + ' MB';
async function renderStorageInfo() {
    if (!$('stUsage')) return;
    try {
        if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); $('stUsage').textContent = fmtMB(e.usage || 0); }
        const n = await countSurahsCached(); $('stQuran').textContent = n >= 114 ? 'كامل ✓' : n ? `${A(n)}/${A(114)}` : 'غير محفوظ';
        const tn = await tafsirCachedCount(); $('stTafsir').textContent = tn >= TF_TOTAL ? 'كامل ✓' : tn ? `${A(tn)}/${A(TF_TOTAL)}` : 'غير محفوظ';
        const ac = await openCache(AUD_CACHE); const ak = ac ? await ac.keys() : [], an = ak.length, recs = new Set(ak.map(r => (AYAH_URL_RE.exec(r.url) || [])[1]).filter(Boolean)); $('stAudio').textContent = an ? `${A(an)} آية • ${A(recs.size)} ${recs.size > 2 ? 'قرّاء' : recs.size === 2 ? 'قارئان' : 'قارئ'}` : 'لا يوجد';
        const country = $('countrySelect').value, city = $('citySelect').value, until = ptSavedUntil(country, city);
        $('stPrayer').textContent = until ? `حتى ${MONTHS_AR[until[1] - 1]} ${A(until[0])}` : 'غير محفوظة';
        $('stPersist').textContent = (navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()) ? 'مفعّل ✓' : 'عادي';
    } catch (e) {}
}
async function requestPersist() { const ok = await persistStorage(); toast(ok ? 'تم تفعيل الحفظ الدائم ✓' : 'المتصفح لم يوافق على الحفظ الدائم'); renderStorageInfo(); }
async function clearAudioCache() {
    if (!confirm('مسح كل التلاوات المحفوظة على الجهاز؟')) return;
    try { await caches.delete(AUD_CACHE); toast('تم مسح الصوتيات المحفوظة'); } catch (e) {}
    renderStorageInfo(); if (typeof adlOnCacheChanged === 'function') adlOnCacheChanged();
}

/* كارت البروفايل في أول الإعدادات */
function renderProfileCard() {
    if (!$('pfCard')) return;
    $('pfTasbih').textContent = A(parseInt(store.get('total_athr')) || totalCount || 0);
    $('pfReciter').textContent = recName();
    $('pfTheme').textContent = document.body.classList.contains('light-mode') ? 'نهاري' : 'ليلي';
}
