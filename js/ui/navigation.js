/* أَثَر — التنقل بين الصفحات وملء الشاشة وواجهة القارئ */

/* ---------- ملء الشاشة ---------- */
function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
}
function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

/* ---------- التنقل بين الصفحات ---------- */
const PAGE_TO_NAV = { 'p-reader': 'p-quran', 'p-admin': 'p-settings' };
let duasRendered = false;

function nav(id, el, keepScroll) {
    const scroller = $('mainScroll');
    const cur = document.querySelector('.page.active');
    if (cur) scrollMem[cur.id] = scroller.scrollTop;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    $(id).classList.add('active');
    const navId = PAGE_TO_NAV[id] || id;
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === navId));

    if (id === 'p-reader') {
        const wasReading = document.body.classList.contains('reading-mode');
        document.body.classList.add('reading-mode');
        if (!wasReading) {
            try { history.pushState({ reader: 1 }, ''); } catch (e) {}
            enterFullscreen();
        }
        readerUiVisible = false;
        updateReaderUI();
        if (!keepScroll) scroller.scrollTop = 0;
    } else {
        document.body.classList.remove('reading-mode');
        exitFullscreen();
        $('reader-tools').classList.remove('show');
        $('fControls').classList.remove('show');
        $('reader-info').classList.remove('active');
        stopAudio();
        scroller.scrollTop = scrollMem[id] || 0;
    }
    if (id === 'p-tasbih') updateTasbihUI();
    if (id === 'p-duas' && !duasRendered) { renderDuasList(); duasRendered = true; }
    if (id === 'p-admin') attachAdminStats();
    if (id === 'p-settings') { renderStorageInfo(); renderProfileCard(); }
    if (id === 'p-tafsir') checkTafsirState();
    if (id === 'p-prayers') refreshPrayerDlState();
    if (id === 'p-qibla') qiblaEnter(); else qiblaLeave();
    if (id === 'p-hadith') renderHadith();
    if (id === 'p-tafsir' && !$('tfList').childElementCount) renderTafsirList();
}

function closeReader() {
    if (history.state && history.state.reader) history.back();
    else nav('p-quran');
}
window.addEventListener('popstate', () => {
    if (document.body.classList.contains('reading-mode')) nav('p-quran');
});

function updateReaderTitle() {
    const m = (typeof currentAyahMeta === 'function' && currentAyahMeta()) || readerMeta; if (!m) return;
    const t = $('rtTitle'); if (!t) return;
    const hz = Math.ceil((+m.h || 0) / 4);
    t.innerHTML = `<b>سورة ${esc(surahs[(+m.s) - 1] || '')}</b><small>جزء ${toArabicDigits(m.j)}${hz ? ' • حزب ' + toArabicDigits(hz) : ''} • ص ${toArabicDigits(m.p)}</small>`;
}
let rtRaf = 0;
$('mainScroll').addEventListener('scroll', () => { if (readerUiVisible && !rtRaf) rtRaf = requestAnimationFrame(() => { rtRaf = 0; updateReaderTitle(); }); }, { passive: true });
function updateReaderUI() {
    const tools = $('reader-tools'), fonts = $('fControls');
    tools.classList.toggle('show', readerUiVisible);
    fonts.classList.toggle('show', readerUiVisible);
    if (readerUiVisible) updateReaderTitle();
    if (!readerUiVisible) $('reader-info').classList.remove('active');
}

$('p-reader').addEventListener('click', function (e) {
    if (e.target.closest('.r-btn') || e.target.closest('.font-btn') || e.target.closest('.retry-btn')) return;
    readerUiVisible = !readerUiVisible;
    updateReaderUI();
    if (readerUiVisible && currentView) toggleReaderInfo(true);
});

function toggleReaderInfo(forceShow = false) {
    const info = $('reader-info');
    clearTimeout(infoTimeout);
    if (info.classList.contains('active') && !forceShow) {
        info.classList.remove('active');
    } else {
        renderReaderInfo();
        info.classList.add('active');
        infoTimeout = setTimeout(() => info.classList.remove('active'), 4500);
    }
}
