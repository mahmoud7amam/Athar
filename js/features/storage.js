/* ---------- إدارة التخزين ---------- */
const fmtMB = b => b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(1) + ' MB';
async function renderStorageInfo() {
    if (!$('stUsage')) return;
    try {
        if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); $('stUsage').textContent = fmtMB(e.usage || 0); }
        const n = await countSurahsCached(); $('stQuran').textContent = n >= 114 ? 'كامل ✓' : n ? `${A(n)}/${A(114)}` : 'غير محفوظ';
        const tn = await tafsirCachedCount(); $('stTafsir').textContent = tn >= TF_TOTAL ? 'كامل ✓' : tn ? `${A(tn)}/${A(TF_TOTAL)}` : 'غير محفوظ';
        const ac = await openCache(AUD_CACHE); const an = ac ? (await ac.keys()).length : 0; $('stAudio').textContent = an ? `${A(an)} آية` : 'لا يوجد';
        const country = $('countrySelect').value, city = $('citySelect').value, until = ptSavedUntil(country, city);
        $('stPrayer').textContent = until ? `حتى ${MONTHS_AR[until[1] - 1]} ${A(until[0])}` : 'غير محفوظة';
        $('stPersist').textContent = (navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()) ? 'مفعّل ✓' : 'عادي';
    } catch (e) {}
}
async function requestPersist() { const ok = await persistStorage(); toast(ok ? 'تم تفعيل الحفظ الدائم ✓' : 'المتصفح لم يوافق على الحفظ الدائم'); renderStorageInfo(); }
async function clearAudioCache() { try { await caches.delete(AUD_CACHE); toast('تم مسح الصوتيات المحفوظة'); } catch (e) {} renderStorageInfo(); }

/* كارت البروفايل في أول الإعدادات */
function renderProfileCard() {
    if (!$('pfCard')) return;
    $('pfTasbih').textContent = A(parseInt(store.get('total_athr')) || totalCount || 0);
    $('pfReciter').textContent = recName();
    $('pfTheme').textContent = document.body.classList.contains('light-mode') ? 'نهاري' : 'ليلي';
}
