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
        const c = await caches.open(AUD_CACHE), hit = await c.match(url, { ignoreVary: true });
        if (hit) {
            if (hit.type === 'opaque') return url;          // محفوظ بوضع no-cors: الـ Service Worker هو اللي بيقدّمه
            const b = await hit.blob(); if (b.size > 1000) { if (aObjUrl) URL.revokeObjectURL(aObjUrl); aObjUrl = URL.createObjectURL(b); return aObjUrl; }
        }
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

// مرايا CORS لنفس القرّاء (cdn.islamic.network) — بنستخدمها لو everyayah.com رفض التنزيل من المتصفح
const AUDIO_MIRROR = {
    'Alafasy_128kbps': 'ar.alafasy', 'Abdul_Basit_Murattal_64kbps': 'ar.abdulbasitmurattal', 'Husary_128kbps': 'ar.husary',
    'Minshawy_Murattal_128kbps': 'ar.minshawi', 'Hudhaify_128kbps': 'ar.hudhaify', 'Maher_AlMuaiqly_64kbps': 'ar.mahermuaiqly',
    'Abdurrahmaan_As-Sudais_64kbps': 'ar.abdurrahmaansudais', 'Saood_ash-Shuraym_128kbps': 'ar.saoodshuraym',
    'ahmed_ibn_ali_al_ajamy_128kbps': 'ar.ahmedajamy', 'Hani_Rifai_64kbps': 'ar.hanirifai',
    'Muhammad_Ayyoub_128kbps': 'ar.muhammadayyoub', 'Muhammad_Jibreel_128kbps': 'ar.muhammadjibreel'
};
const ayahGlobal = (s, n) => AYAH_COUNTS.slice(0, s - 1).reduce((a, b) => a + b, 0) + n;
const mirrorUrl = (s, n, r = recId) => AUDIO_MIRROR[r] ? `https://cdn.islamic.network/quran/audio/128/${AUDIO_MIRROR[r]}/${ayahGlobal(s, n)}.mp3` : null;
const validAudio = async b => b && b.size > 2000;

// يحفظ آية واحدة: (1) everyayah مباشرة (2) المرآة (3) وضع no-cors كحل أخير — بيرجّع 'ok' | 'opaque' | 'fail'
async function cacheAyahAudio(c, s, n, r = recId) {
    const url = audioUrl(s, n, r);
    if (await c.match(url, { ignoreVary: true })) return 'ok';
    try { await fetchAndCache(c, url, { tries: 2, timeout: 30000, validate: validAudio, type: 'audio/mpeg' }); return 'ok'; } catch (e) {}
    const m = mirrorUrl(s, n, r);
    if (m) {
        try { const r = await fetchWithTimeout(m, 30000); if (r.ok) { const b = await r.blob(); if (b.size > 2000) { await putRebuilt(c, url, b, 'audio/mpeg'); return 'ok'; } } } catch (e) {}
    }
    try { const r = await fetchWithTimeout(url, 30000, { mode: 'no-cors' }); await c.put(url, r); return 'opaque'; } catch (e) {}
    return 'fail';
}

// السورة اللي هتتنزّل: اللي شغّالة دلوقتي، أو اللي ظاهرة في الشاشة، أو السورة المفتوحة
function audioTargetSurah() {
    if (aIdx >= 0 && aList[aIdx]) return +aList[aIdx].dataset.s;
    collectAyahs();
    if (aList.length) return +aList[Math.min(visibleAyahIndex(), aList.length - 1)].dataset.s;
    return currentType === 'surah' ? +currentId : 0;
}
let audioDlBusy = false;
async function downloadSurahAudio() {
    if (audioDlBusy) { toast('التنزيل شغّال بالفعل...'); return; }
    const s = audioTargetSurah(); if (!s) { toast('افتح سورة الأول'); return; }
    if (!isOnline()) { toast('محتاج إنترنت للتنزيل'); return; }
    const count = AYAH_COUNTS[s - 1], rec = recId, recLabel = recName();
    const c = await openCache(AUD_CACHE); if (!c) { toast('المتصفح لا يدعم الحفظ'); return; }
    audioDlBusy = true; persistStorage();
    const pos = $('plPos'), show = t => { if (pos) pos.textContent = t; }, keep = pos ? pos.textContent : '';
    let done = 0, failed = 0, opaque = 0;
    const items = Array.from({ length: count }, (_, i) => i + 1);
    toast(`جاري تنزيل سورة ${surahs[s - 1]} بصوت ${recLabel}...`);
    try {
        await pool(items, 3, async n => {
            const r = await cacheAyahAudio(c, s, n);
            if (r === 'opaque') opaque++; else if (r === 'fail') failed++;
            done++; show(`تنزيل ${A(done)}/${A(count)}`);
        });
    } finally { audioDlBusy = false; }
    if (aIdx >= 0 && aList[aIdx]) { markPlaying(aList[aIdx]); show(`سورة ${surahs[aList[aIdx].dataset.s - 1]} · آية ${A(aList[aIdx].dataset.n)}`); } else show(keep);
    if (failed === count) toast('السيرفر لا يسمح بالتنزيل حالياً — الاستماع أونلاين فقط');
    else if (failed) toast(`تم حفظ ${A(count - failed)} آية وتعذر ${A(failed)} — اضغط تنزيل للإكمال`);
    else toast(`تم حفظ سورة ${surahs[s - 1]} بصوت ${recLabel} ✓`);
    renderStorageInfo();
}
