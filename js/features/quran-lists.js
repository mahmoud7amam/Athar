/* ---------- قوائم المصحف ---------- */
function renderQuranList(filter = "") {
    const list = $('qList'); let h = "";
    if (activeQuranTab === 'surah') {
        const f = normAr(filter).trim();
        surahs.forEach((n, i) => {
            if (!f || normAr(n).includes(f) || String(i + 1) === f) {
                const name = n.replace("سورة ", "").trim();
                h += surahCardHTML(i, `loadContent('surah', ${i + 1}, '${name}')`);
            }
        });
        if (!h) h = `<div class="state-msg">لا توجد نتائج</div>`;
    }
    else if (activeQuranTab === 'juz') { h = '<div class="num-grid">'; for (let i = 1; i <= 30; i++) h += `<div class="num-card" role="button" onclick="loadContent('juz', ${i}, 'الجزء ${i}')"><span class="sr-num"><i>${toArabicDigits(i)}</i></span><div class="sr-info"><b>الجزء ${toArabicDigits(i)}</b><small>من ${JUZ_START[i - 1]}</small></div></div>`; h += '</div>'; }
    else if (activeQuranTab === 'hizb') { h = '<div class="num-grid">'; for (let i = 1; i <= 60; i++) h += `<div class="num-card" role="button" onclick="loadContent('hizb', ${i}, 'الحزب ${i}')"><span class="sr-num"><i>${toArabicDigits(i)}</i></span><div class="sr-info"><b>الحزب ${toArabicDigits(i)}</b><small>الجزء ${toArabicDigits(Math.ceil(i / 2))}</small></div></div>`; h += '</div>'; }
    else if (activeQuranTab === 'page') for (let i = 1; i <= 604; i++) h += `<div class="s-card q-item" onclick="loadContent('page', ${i}, 'الصفحة ${i}')"><b>صفحة ${i}</b></div>`;
    else if (activeQuranTab === 'dua') h = dbAzkar.map(z => `<div class="s-card dua-card"><b>${z}</b></div>`).join('');
    else if (activeQuranTab === 'dua_khatm') h = duaKhatm.map(d => `<div class="s-card dua-card"><div class="dua-head">دعاء الختم</div><b>${d}</b></div>`).join('');
    list.innerHTML = h;
}

function switchQuranTab(type, el) {
    activeQuranTab = type;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    try { el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    const val = $('qSearchInput').value;
    if (type === 'ayah_search') searchAyah(val); else renderQuranList(type === 'surah' ? val : "");
    $('mainScroll').scrollTop = 0;
    const ql = $('qList'); ql.classList.remove('swap'); void ql.offsetWidth; ql.classList.add('swap');
}
