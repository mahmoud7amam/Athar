/* أَثَر — قارئ المصحف: العرض والتحميل والسحب والعلامة */

const BASMALA_DISPLAY = 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ';

function stripBasmala(text) {
    const words = text.trim().split(/\s+/);
    if (words.length >= 4 && normAr(words.slice(0, 4).join(' ')) === 'بسم الله الرحمن الرحيم') return words.slice(4).join(' ');
    return text;
}

function marker(n) {
    const s = toArabicDigits(n);
    return `<span class="ayah-num${s.length >= 3 ? ' d3' : ''}"><i>${s}</i></span>`;
}

let readerMeta = null;

function surahBanner(sNum, meta) {
    if (meta && meta.numberOfAyahs) surahInfoMem[sNum] = { type: meta.revelationType, count: meta.numberOfAyahs };
    const m = surahInfoMem[sNum];
    const sub = m ? [m.type === 'Meccan' ? 'مكية' : 'مدنية', toArabicDigits(m.count) + ' آية'].join(' • ') : '';
    return `<div class="surah-banner"><div class="sb"><span class="sb-wing r"></span><span class="sb-dia"></span><div class="surah-title-text">سورة ${esc(surahs[sNum - 1] || '')}</div><span class="sb-dia"></span><span class="sb-wing l"></span></div>${sub ? `<div class="sb-meta">${sub}</div>` : ''}</div>`;
}

function partLabel(type, id, first) {
    const d = toArabicDigits;
    if (type === 'juz') return `<div class="part-label"><span class="pl-main">الجزء ${d(id)}</span><span>الحزبان ${d(id * 2 - 1)} - ${d(id * 2)}</span></div>`;
    if (type === 'hizb') return `<div class="part-label"><span class="pl-main">الحزب ${d(id)}</span><span>الجزء ${d(Math.ceil(id / 2))}</span></div>`;
    if (type === 'page') return `<div class="part-label"><span class="pl-main">الصفحة ${d(id)}</span><span>الجزء ${d(first.juz)}</span><span>الحزب ${d(Math.ceil(first.hizbQuarter / 4))}</span></div>`;
    return '';
}

function buildReaderHTML(type, data, title, highlight) {
    const ayahs = data.ayahs || [];
    let html = `<div class="mushaf-page"><div class="reading-area" style="font-size:${currentFontSize}px">`;
    html += partLabel(type, currentId, ayahs[0] || {});
    let open = false;
    const closeP = () => { if (open) { html += '</p>'; open = false; } };

    ayahs.forEach(a => {
        const sNum = a.surah ? a.surah.number : data.number;
        const hl = (highlight && a.number === highlight) ? ' highlighted-ayah' : '';
        let text = a.text;
        if (a.numberInSurah === 1) {
            closeP();
            html += surahBanner(sNum, a.surah || data);
            if (sNum === 1) {
                html += `<div id="ayah-${a.number}" class="basmala${hl}" data-s="1" data-j="${a.juz}" data-h="${a.hizbQuarter}" data-p="${a.page}" data-n="1">${BASMALA_DISPLAY} ${marker(1)}</div>`;
                text = null;
            } else {
                if (sNum !== 9) html += `<div class="basmala">${BASMALA_DISPLAY}</div>`;
                text = stripBasmala(text);
            }
        }
        if (text === null) return;
        if (!open) { html += '<p class="ayat">'; open = true; }
        const t = text.trim(), i = t.lastIndexOf(' ');
        const head = i > 0 ? t.slice(0, i) : '', last = i > 0 ? t.slice(i + 1) : t;
        html += `<span id="ayah-${a.number}" class="ayah${hl}" data-s="${sNum}" data-j="${a.juz}" data-h="${a.hizbQuarter}" data-p="${a.page}" data-n="${a.numberInSurah}">${head} <span class="nw">${last}${marker(a.numberInSurah)}</span></span> `;
    });
    closeP();
    html += '</div></div>';
    return html;
}

/* معلومات المكان الحالي في القراءة: سورة / جزء / حزب / صفحة */
function currentAyahMeta() {
    const els = document.querySelectorAll('#qText .ayah');
    const line = window.innerHeight * 0.32;
    for (const el of els) if (el.getBoundingClientRect().bottom >= line) return el.dataset;
    return els.length ? els[els.length - 1].dataset : readerMeta;
}

function renderReaderInfo() {
    const m = currentAyahMeta() || readerMeta; if (!m) return;
    const d = toArabicDigits, s = +m.s, hq = +m.h, q = (hq - 1) % 4;
    const si = surahInfoMem[s];
    const meta = [si ? (si.type === 'Meccan' ? 'مكية' : 'مدنية') : '', m.n ? `الآية ${d(m.n)}${si ? ' من ' + d(si.count) : ''}` : ''].filter(Boolean).join(' • ');
    $('reader-info').innerHTML = `<div class="ri-head"><div class="ri-surah">سورة ${esc(surahs[s - 1] || '')}</div><div class="ri-meta">${meta}</div></div>
        <div class="ri-grid">
            <div class="ri-cell"><small>الجزء</small><b>${d(m.j)}</b></div>
            <div class="ri-cell"><small>الحزب</small><b>${d(Math.ceil(hq / 4))}</b></div>
            <div class="ri-cell"><small>الصفحة</small><b>${d(m.p)}</b></div>
        </div>
        <div class="ri-foot"><div class="ri-q">${[0, 1, 2, 3].map(i => `<i class="${i <= q ? 'on' : ''}"></i>`).join('')}</div>${QUARTERS[q]} من الحزب ${d(Math.ceil(hq / 4))}</div>`;
}

async function loadContent(type, id, title, highlightAyahNumber = null, dir = null) {
    id = parseInt(id);
    const qt = $('qText');
    const flip = !!dir && $('p-reader').classList.contains('active') && !!qt.querySelector('.mushaf-page');
    currentType = type; currentId = id;
    lastReq = { type, id, title, hl: highlightAyahNumber };
    const token = ++loadToken;
    nav('p-reader', null, flip);
    let outDone = Promise.resolve();
    if (flip) { qt.className = 'flip-out-' + dir; outDone = new Promise(r => setTimeout(r, 240)); }
    else { qt.className = ''; qt.innerHTML = `<div class="state-msg gold" style="padding-top:40vh;">جاري التحميل...</div>`; }
    try {
        const [data] = await Promise.all([fetchQuran(type, id), outDone]);
        if (token !== loadToken) return;
        const ayahs = data.ayahs || [];
        if (!ayahs.length) throw new Error('empty');

        const first = ayahs[0];
        readerMeta = { s: first.surah ? first.surah.number : data.number, j: first.juz, h: first.hizbQuarter, p: first.page, n: first.numberInSurah };

        let displayTitle = (title || '').replace("سورة ", "").trim();
        if (type === 'surah') displayTitle = "سورة " + (surahs[id - 1] || displayTitle);
        else if (type === 'juz') displayTitle = "الجزء " + id;
        else if (type === 'hizb') displayTitle = "الحزب " + id;
        else displayTitle = "الصفحة " + id;

        qt.innerHTML = buildReaderHTML(type, data, displayTitle, highlightAyahNumber);
        qt.className = flip ? 'flip-in-' + dir : 'flip-in-open';
        setTimeout(() => { if (token === loadToken) qt.className = ''; }, 520);
        currentView = { type, id, title: displayTitle };
        renderReaderInfo();
        collectAyahs(); aIdx = -1; if (audioContinue) { audioContinue = false; playIndex(0); }

        const scroller = $('mainScroll');
        if (highlightAyahNumber) {
            requestAnimationFrame(() => { const t = $('ayah-' + highlightAyahNumber); if (t) t.scrollIntoView({ block: 'center' }); });
        } else scroller.scrollTop = 0;
        prefetchNeighbors(type, id);
    } catch (e) {
        if (token !== loadToken) return;
        qt.className = '';
        qt.innerHTML = `<div class="state-msg err" style="padding-top:35vh;">حدث خطأ. تحقق من الإنترنت.<br>
            <button class="retry-btn" onclick="loadContent(lastReq.type,lastReq.id,lastReq.title,lastReq.hl)">إعادة المحاولة</button></div>`;
    }
}

/* ---------- العلامة والمظهر ---------- */
function setMark() { if (currentView) { store.set('saved_athr', JSON.stringify(currentView)); toast('تم حفظ العلامة ✓'); } }
function goMark() {
    let m = null; try { m = JSON.parse(store.get('saved_athr')); } catch (e) {}
    if (m) loadContent(m.type, m.id, m.title); else toast('لا توجد علامة محفوظة');
}

/* ---------- السحب للتنقل بين السور/الصفحات ---------- */
let tsX = 0, tsY = 0, tsMulti = false;
const scrollContainer = $('mainScroll');
scrollContainer.addEventListener('touchstart', e => {
    tsMulti = e.touches.length > 1;
    tsX = e.changedTouches[0].screenX; tsY = e.changedTouches[0].screenY;
}, { passive: true });
scrollContainer.addEventListener('touchend', e => {
    if (!document.body.classList.contains('reading-mode') || tsMulti) return;
    const dx = e.changedTouches[0].screenX - tsX, dy = e.changedTouches[0].screenY - tsY;
    if (Math.abs(dx) > 90 && Math.abs(dy) < Math.abs(dx) * 0.5) navigate(dx > 0 ? 'next' : 'prev');
}, { passive: true });

function navigate(dir) {
    const newId = dir === 'next' ? currentId + 1 : currentId - 1;
    if (newId < 1 || newId > qLimit(currentType)) return;
    const U = { page: 'الصفحة ', juz: 'الجزء ', hizb: 'الحزب ' };
    const title = currentType === 'surah' ? surahs[newId - 1] : U[currentType] + newId;
    loadContent(currentType, newId, title, null, dir);
}

function changeFontSize(d) {
    currentFontSize = Math.max(18, Math.min(50, currentFontSize + d));
    store.set('athr_font', currentFontSize);
    const area = document.querySelector('.reading-area');
    if (area) area.style.fontSize = currentFontSize + 'px';
}
