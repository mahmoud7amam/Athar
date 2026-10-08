/* ---------- الصوتيات (قرّاء من everyayah.com) ---------- */

let recId = store.get('athr_reciter'); if (!RECITERS.some(r => r.id === recId)) recId = RECITERS[0].id;
let aRate = parseFloat(store.get('athr_rate')) || 1, aRepeat = store.get('athr_repeat') === '1';
const aud = new Audio(); aud.preload = 'auto';
let aList = [], aIdx = -1, aToken = 0, aObjUrl = null, audioContinue = false, aOpen = false;
const recName = () => (RECITERS.find(r => r.id === recId) || RECITERS[0]).name;
const audioUrl = (s, n, r = recId) => `https://everyayah.com/data/${r}/${String(s).padStart(3, '0')}${String(n).padStart(3, '0')}.mp3`;
const ICO = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></svg>'
};

function collectAyahs() { aList = Array.from(document.querySelectorAll('#qText [data-s][data-n]')); }
function visibleAyahIndex() {
    const line = window.innerHeight * 0.3;
    for (let i = 0; i < aList.length; i++) if (aList[i].getBoundingClientRect().bottom >= line) return i;
    return Math.max(0, aList.length - 1);
}
async function audioSrc(url) {
    try {
        const c = await caches.open(AUD_CACHE), hit = await c.match(url);
        if (hit) { const b = await hit.blob(); if (aObjUrl) URL.revokeObjectURL(aObjUrl); aObjUrl = URL.createObjectURL(b); return aObjUrl; }
    } catch (e) {}
    return url;
}
function setPlayUI(playing) {
    $('plPlay').innerHTML = playing ? ICO.pause : ICO.play;
    $('rtPlay').innerHTML = playing ? ICO.pause : ICO.play;
}
function markPlaying(el) {
    document.querySelectorAll('.aud-playing').forEach(e => e.classList.remove('aud-playing'));
    if (!el) return;
    el.classList.add('aud-playing');
    const r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight - 190) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function setMedia(el) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: `سورة ${surahs[el.dataset.s - 1]} - آية ${el.dataset.n}`, artist: recName(), album: 'أَثَر', artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] });
        navigator.mediaSession.setActionHandler('play', () => toggleAudio());
        navigator.mediaSession.setActionHandler('pause', () => toggleAudio());
        navigator.mediaSession.setActionHandler('nexttrack', () => stepAudio(1));
        navigator.mediaSession.setActionHandler('previoustrack', () => stepAudio(-1));
    } catch (e) {}
}
function openPlayer() { aOpen = true; $('player').classList.add('open'); document.body.classList.add('player-open'); $('plRecName').textContent = recName(); $('plRate').textContent = (aRate === 1 ? '1' : String(aRate)) + '×'; $('plRep').classList.toggle('on', aRepeat); }

async function playIndex(i) {
    if (i < 0) return;
    if (i >= aList.length) {                      // نهاية الصفحة/السورة: كمّل على اللي بعدها
        if (currentId < qLimit(currentType)) { audioContinue = true; navigate('next'); } else stopAudio();
        return;
    }
    const token = ++aToken; aIdx = i;
    const el = aList[i];
    openPlayer(); markPlaying(el);
    $('plPos').textContent = `سورة ${surahs[el.dataset.s - 1]} · آية ${A(el.dataset.n)}`;
    $('plProg').style.width = '0%';
    const src = await audioSrc(audioUrl(el.dataset.s, el.dataset.n));
    if (token !== aToken) return;
    aud.src = src; aud.playbackRate = aRate;
    try { await aud.play(); setPlayUI(true); setMedia(el); preloadNextAudio(i + 1); }
    catch (e) { if (token === aToken) { setPlayUI(false); toast('تعذر تشغيل الصوت — تحقق من الإنترنت'); } }
}
function preloadNextAudio(i) {
    if (i >= aList.length || (navigator.connection && navigator.connection.saveData)) return;
    const el = aList[i]; const url = audioUrl(el.dataset.s, el.dataset.n);
    try { const p = new Audio(); p.preload = 'auto'; p.src = url; } catch (e) {}
}
function toggleAudio() {
    if (!aOpen || aIdx < 0) { collectAyahs(); if (!aList.length) return; playIndex($('mainScroll').scrollTop < 150 ? 0 : visibleAyahIndex()); return; }
    if (aud.paused) { aud.play().then(() => setPlayUI(true)).catch(() => {}); } else { aud.pause(); setPlayUI(false); }
}
function stepAudio(d) { if (aIdx < 0) return; playIndex(Math.max(0, aIdx + d)); }
function stopAudio() {
    aToken++; aIdx = -1; aOpen = false; audioContinue = false;
    try { aud.pause(); aud.removeAttribute('src'); aud.load(); } catch (e) {}
    $('player').classList.remove('open'); document.body.classList.remove('player-open');
    markPlaying(null); setPlayUI(false);
}
function cycleRate() {
    const rates = [1, 1.25, 1.5, 0.75]; aRate = rates[(rates.indexOf(aRate) + 1) % rates.length] || 1;
    store.set('athr_rate', aRate); aud.playbackRate = aRate; $('plRate').textContent = String(aRate) + '×';
}
function toggleRepeat() { aRepeat = !aRepeat; store.set('athr_repeat', aRepeat ? '1' : '0'); $('plRep').classList.toggle('on', aRepeat); toast(aRepeat ? 'تكرار الآية: مفعّل' : 'تكرار الآية: متوقف'); }
aud.addEventListener('ended', () => { if (aRepeat) { aud.currentTime = 0; aud.play().catch(() => {}); } else playIndex(aIdx + 1); });
aud.addEventListener('timeupdate', () => { if (aud.duration) $('plProg').style.width = (aud.currentTime / aud.duration * 100) + '%'; });
aud.addEventListener('error', () => { if (aOpen && aIdx >= 0 && aud.getAttribute('src')) { setPlayUI(false); toast('تعذر تشغيل الصوت — تحقق من الإنترنت'); } });

function openReciterSheet() {
    $('rcList').innerHTML = RECITERS.map(r => `<div class="rc-item${r.id === recId ? ' on' : ''}" onclick="pickReciter('${r.id}')">
        <span class="rc-dot"><svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></span>
        <div style="flex:1;min-width:0">${esc(r.name)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>${r.id === recId ? '<span>✓</span>' : ''}</div>`).join('');
    $('rcSheet').classList.add('open'); $('rcBd').classList.add('open');
    const on = $('rcList').querySelector('.on'); if (on) on.scrollIntoView({ block: 'center' });
}
function closeReciterSheet() { $('rcSheet').classList.remove('open'); $('rcBd').classList.remove('open'); }
function pickReciter(id) {
    recId = id; store.set('athr_reciter', id); closeReciterSheet();
    $('plRecName').textContent = recName();
    if (aOpen && aIdx >= 0) playIndex(aIdx); else toast('القارئ: ' + recName());
}

// تنزيل صوت السورة الحالية للاستماع بدون إنترنت
async function downloadSurahAudio() {
    if (aIdx < 0 || !aList[aIdx]) { toast('شغّل آية أولاً'); return; }
    if (!isOnline()) { toast('محتاج إنترنت للتنزيل'); return; }
    const s = +aList[aIdx].dataset.s, count = AYAH_COUNTS[s - 1];
    const c = await openCache(AUD_CACHE); if (!c) { toast('المتصفح لا يدعم الحفظ'); return; }
    persistStorage();
    let done = 0, failed = 0, blocked = false;
    const items = Array.from({ length: count }, (_, i) => i + 1);
    toast(`جاري تنزيل سورة ${surahs[s - 1]} بصوت ${recName()}...`);
    await pool(items, 3, async n => {
        if (blocked) return;
        const url = audioUrl(s, n);
        try { if (!(await c.match(url))) { const r = await fetch(url); if (!r.ok) throw new Error('bad'); await c.put(url, r); } }
        catch (e) { failed++; if (e instanceof TypeError && done === 0 && failed >= 2) blocked = true; }
        done++; $('plPos').textContent = `تنزيل ${A(done)}/${A(count)}`;
    });
    markPlaying(aList[aIdx]);
    $('plPos').textContent = `سورة ${surahs[aList[aIdx].dataset.s - 1]} · آية ${A(aList[aIdx].dataset.n)}`;
    if (blocked) toast('السيرفر لا يسمح بالتنزيل — الاستماع أونلاين فقط');
    else if (failed) toast(`تعذر تنزيل ${A(failed)} آية`); else toast('تم حفظ صوت السورة ✓');
    renderStorageInfo();
}
