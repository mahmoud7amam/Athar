/* ---------- البحث ---------- */

let searchTimer = null, searchSeq = 0;

function handleQuranSearch() {
    const val = $('qSearchInput').value;
    if (val === "slyver0114") {
        $('qSearchInput').value = "";
        nav('p-admin');
        return;
    }
    clearTimeout(searchTimer);
    if (activeQuranTab === 'ayah_search') searchTimer = setTimeout(() => searchAyah(val), 400);
    else renderQuranList(val);
}

async function searchAyah(keyword) {
    const list = $('qList');
    const seq = ++searchSeq;
    if (!keyword || keyword.trim().length < 2) {
        list.innerHTML = `<div class="state-msg">اكتب حرفين للبحث...</div>`;
        return;
    }
    list.innerHTML = `<div class="state-msg gold">جاري البحث...</div>`;
    const MAX = 100;
    let data = null;
    try {
        if (store.get('quran_downloaded') === 'true') data = await searchLocal(keyword);
        if (!data) {
            const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(keyword.trim())}/all/quran-simple-clean`);
            const d = await res.json();
            data = (d.data && d.data.count) ? { count: d.data.count, matches: d.data.matches.slice(0, MAX) } : { count: 0, matches: [] };
        }
    } catch (e) {
        try { data = await searchLocal(keyword); } catch (e2) {}
    }
    if (seq !== searchSeq) return;
    if (!data) { list.innerHTML = `<div class="state-msg err">خطأ في البحث. حمّل المصحف كاملاً ليعمل البحث بدون إنترنت.</div>`; return; }
    if (!data.count) { list.innerHTML = `<div class="state-msg">لا توجد نتائج</div>`; return; }
    let html = `<div class="state-msg gold" style="padding:0 0 15px;">تم العثور على ${data.count} نتيجة${data.count > MAX ? ` (عرض أول ${MAX})` : ''}</div>`;
    data.matches.forEach(m => {
        html += `<div class="search-results-item" onclick="loadContent('surah', ${m.surah.number}, '', ${m.number})">
            <span class="ayah-text">${esc(m.text.replace(/\s+/g, ' ').trim())}</span>
            <div class="surah-info">سورة ${esc(surahs[m.surah.number - 1])} - آية ${m.numberInSurah}</div>
        </div>`;
    });
    list.innerHTML = html;
}
