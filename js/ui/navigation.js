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
const PAGE_TO_NAV = { 'p-reader': 'p-quran', 'p-admin': 'p-settings', 'p-iqama': 'p-prayers' };
let duasRendered = false;

/* حساب التخزين بيعدّ مفاتيح الكاش (ممكن آلاف الآيات): نأجّله لحد ما الانتقال يخلص، ومرة كل 10 ثواني بالكتير */
let storageInfoTimer = 0, storageInfoAt = 0;
function scheduleStorageInfo() {
    clearTimeout(storageInfoTimer);
    if (Date.now() - storageInfoAt < 10000) return;
    storageInfoTimer = setTimeout(() => {
        if (!document.querySelector('#p-settings.active')) return;
        storageInfoAt = Date.now(); renderStorageInfo();
    }, 350);
}

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
        if (aOpen || !aud.paused) stopAudio();      // كان بيتنادى مع كل تنقّل حتى والصوت مقفول (~10ms كل مرة)
        scroller.scrollTop = scrollMem[id] || 0;
    }
    if (id === 'p-tasbih') updateTasbihUI();
    if (id === 'p-duas' && !duasRendered) { renderDuasList(); duasRendered = true; }
    if (id === 'p-admin') attachAdminStats();
    if (id === 'p-settings') { renderProfileCard(); scheduleStorageInfo(); }
    if (id === 'p-tafsir') checkTafsirState();
    if (id === 'p-prayers') { refreshPrayerDlState(); updatePrayerClock(); }
    if (id === 'p-iqama') { renderIqamaScreen(); updateIqamaClock(); }
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


/* ---------- السحب بالصباع على القائمة السفلية ----------
   حط صباعك على أي تبويب وسحّب يمين/شمال: التبويب اللي تحت صباعك بيتحدد فورًا،
   ولو وقفت عليه لحظة (أو رفعت صباعك) بيفتح الصفحة. لو مجرد ضغطة عادية، بتشتغل زي ما كانت. */
const SCRUB_DWELL_MS = 140;      // وقت الوقوف على تبويب قبل ما يفتح
const SCRUB_MOVE_PX = 8;         // أقل حركة تتحسب سحب (عشان الضغطة العادية ما تتأثرش)
function initNavScrub() {
    const bar = document.querySelector('nav');
    if (!bar || !window.PointerEvent) return;
    const items = Array.from(bar.querySelectorAll('.nav-item'));
    let rects = null, pid = null, startX = 0, moved = false, hover = null, dwellTimer = 0, swallowClick = false;

    const measure = () => { rects = items.map(el => el.getBoundingClientRect()); };
    const itemAt = x => {
        let best = null, bestD = Infinity;
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
            if (d < bestD) { bestD = d; best = items[i]; if (!d) break; }
        }
        return best;
    };
    const setHover = el => {
        if (hover === el) return;
        if (hover) hover.classList.remove('scrub');
        hover = el;
        if (el) { el.classList.add('scrub'); if (navigator.vibrate) { try { navigator.vibrate(6); } catch (e) {} } }
    };
    const open = el => {
        if (!el || el.classList.contains('active')) return;
        nav(el.dataset.page, el);
    };
    const finish = commit => {
        clearTimeout(dwellTimer);
        const target = hover;
        if (pid !== null) { try { bar.releasePointerCapture(pid); } catch (e) {} }
        pid = null; rects = null;
        setHover(null);
        if (moved && commit) { swallowClick = true; open(target); setTimeout(() => { swallowClick = false; }, 350); }
        moved = false;
    };

    bar.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pid = e.pointerId; startX = e.clientX; moved = false; swallowClick = false; measure();
    });
    bar.addEventListener('pointermove', e => {
        if (pid === null || e.pointerId !== pid || !rects) return;
        if (!moved) {
            if (Math.abs(e.clientX - startX) < SCRUB_MOVE_PX) return;
            moved = true;
            if (e.pointerType === 'mouse') { try { bar.setPointerCapture(pid); } catch (err) {} }
        }
        const el = itemAt(e.clientX);
        if (el !== hover) {
            setHover(el);
            clearTimeout(dwellTimer);
            dwellTimer = setTimeout(() => { if (hover === el) open(el); }, SCRUB_DWELL_MS);
        }
    });
    bar.addEventListener('pointerup', e => { if (e.pointerId === pid) finish(true); });
    bar.addEventListener('pointercancel', e => { if (e.pointerId === pid) finish(false); });
    // بعد السحب ما نسيبش "click" يفتح تبويب تاني بالغلط
    bar.addEventListener('click', e => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); swallowClick = false; } }, true);
    bar.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('resize', () => { rects = null; });
}
