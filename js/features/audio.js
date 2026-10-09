/* ---------- الصوتيات (قرّاء من everyayah.com) ---------- */

let recId = store.get('athr_reciter'); if (!RECITERS.some(r => r.id === recId)) recId = RECITERS[0].id;
let aRate = parseFloat(store.get('athr_rate')) || 1, aRepeat = store.get('athr_repeat') === '1';
const aud = new Audio(); aud.preload = 'auto';
let aList = [], aIdx = -1, aToken = 0, aObjUrl = null, audioContinue = false, aOpen = false;
const recName = () => (RECITERS.find(r => r.id === recId) || RECITERS[0]).name;
const audioUrl = (s, n, r = recId) => `https://everyayah.com/data/${r}/${String(s).padStart(3, '0')}${String(n).padStart(3, '0')}.mp3`;
let aQuality = store.get('athr_quality') !== 'std';          // الجودة العالية افتراضياً
aud.preservesPitch = true;
const TOTAL_AYAHS = AYAH_COUNTS.reduce((a, b) => a + b, 0);
const pad3 = n => String(n).padStart(3, '0');
const baseOf = id => { const r = RECITERS.find(x => x.id === id || x.hq === id); return r ? r.id : id; };
const hqOf = id => { const r = RECITERS.find(x => x.id === id); return r && r.hq ? r.hq : null; };
function hqState(h) { try { const j = JSON.parse(store.get('aud_hq_' + h)); if (j && Date.now() - j.t < (j.ok ? 90 : 3) * 864e5) return j.ok; } catch (e) {} return null; }
function effRecSync(r = recId) { const h = hqOf(r); return (aQuality && h && hqState(h) === true) ? h : r; }
function probeAudio(url, ms = 4000) {
    return new Promise(res => {
        const a = new Audio(); let done = false;
        const fin = v => { if (done) return; done = true; clearTimeout(t); a.onloadedmetadata = a.onerror = null; try { a.removeAttribute('src'); a.load(); } catch (e) {} res(v); };
        const t = setTimeout(() => fin(false), ms);
        a.preload = 'metadata'; a.onloadedmetadata = () => fin(true); a.onerror = () => fin(false); a.src = url;
    });
}
// القارئ الفعلي: النسخة عالية الجودة لو متاحة (بتتأكد منها مرة واحدة وبتتخزّن النتيجة)، وإلا العادية
async function effRec(r = recId) {
    const h = hqOf(r); if (!aQuality || !h) return r;
    const st = hqState(h); if (st !== null) return st ? h : r;
    if (!isOnline()) return r;
    const ok = await probeAudio(audioUrl(1, 1, h));
    store.set('aud_hq_' + h, JSON.stringify({ ok, t: Date.now() }));
    return ok ? h : r;
}
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
async function audioSrc(s, n, rEff) {
    // أي نسخة محفوظة (عالية أو عادية) بتتشغّل من الجهاز الأول، وإلا من الإنترنت بالجودة المختارة
    const cands = [...new Set([rEff, recId, hqOf(recId)].filter(Boolean))].map(r => audioUrl(s, n, r));
    try {
        const c = await caches.open(AUD_CACHE);
        for (const u of cands) {
            const hit = await c.match(u, { ignoreVary: true }); if (!hit) continue;
            if (hit.type === 'opaque') return u;            // محفوظ بوضع no-cors: الـ Service Worker هو اللي بيقدّمه
            const b = await hit.blob();
            if (b.size > 1000) { if (aObjUrl) URL.revokeObjectURL(aObjUrl); aObjUrl = URL.createObjectURL(b); return aObjUrl; }
        }
    } catch (e) {}
    return cands[0];
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
        if (canGoNext()) { audioContinue = true; navigate('next'); } else stopAudio();
        return;
    }
    const token = ++aToken; aIdx = i;
    const el = aList[i];
    openPlayer(); markPlaying(el);
    $('plPos').textContent = `سورة ${surahs[el.dataset.s - 1]} · آية ${A(el.dataset.n)}`;
    $('plProg').style.width = '0%';
    const rEff = await effRec(); if (token !== aToken) return;
    const src = await audioSrc(el.dataset.s, el.dataset.n, rEff);
    if (token !== aToken) return;
    aud.src = src; aud.playbackRate = aRate;
    try { await aud.play(); setPlayUI(true); setMedia(el); preloadNextAudio(i + 1); }
    catch (e) { if (token === aToken) { setPlayUI(false); toast('تعذر تشغيل الصوت — تحقق من الإنترنت'); } }
}
function preloadNextAudio(i) {
    if (i >= aList.length || (navigator.connection && navigator.connection.saveData)) return;
    const el = aList[i]; const url = audioUrl(el.dataset.s, el.dataset.n, effRecSync());
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
        <div style="flex:1;min-width:0">${esc(r.name)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}<small class="rc-saved" data-rc="${r.id}"></small></div>${r.id === recId ? '<span>✓</span>' : ''}</div>`).join('');
    $('rcSheet').classList.add('open'); $('rcBd').classList.add('open');
    const on = $('rcList').querySelector('.on'); if (on) on.scrollIntoView({ block: 'center' });
    audioSavedStats().then(all => {
        document.querySelectorAll('#rcList .rc-saved').forEach(el => {
            const o = all[el.dataset.rc]; if (!o || !o.total) return;
            el.textContent = o.total >= TOTAL_AYAHS ? '✓ محفوظ كاملاً' : `محفوظ: ${A(fullSurahsCount(o))} سورة كاملة`;
        });
    }).catch(() => {});
}
function closeReciterSheet() { $('rcSheet').classList.remove('open'); $('rcBd').classList.remove('open'); }
function pickReciter(id) {
    recId = id; store.set('athr_reciter', id); closeReciterSheet();
    $('plRecName').textContent = recName();
    renderAudioCard(); renderProfileCard();
    if (aOpen && aIdx >= 0) playIndex(aIdx); else toast('القارئ: ' + recName());
}

// مرايا CORS لنفس القرّاء (cdn.islamic.network) — بنستخدمها لو everyayah.com رفض التنزيل من المتصفح
const AUDIO_MIRROR = {
    'Alafasy_128kbps': 'ar.alafasy', 'Abdul_Basit_Murattal_64kbps': 'ar.abdulbasitmurattal', 'Husary_128kbps': 'ar.husary',
    'Minshawy_Murattal_128kbps': 'ar.minshawi', 'Hudhaify_128kbps': 'ar.hudhaify', 'Maher_AlMuaiqly_64kbps': 'ar.mahermuaiqly',
    'Abdurrahmaan_As-Sudais_64kbps': 'ar.abdurrahmaansudais', 'Saood_ash-Shuraym_128kbps': 'ar.saoodshuraym',
    'ahmed_ibn_ali_al_ajamy_128kbps': 'ar.ahmedajamy', 'Hani_Rifai_64kbps': 'ar.hanirifai',
    'Muhammad_Ayyoub_128kbps': 'ar.muhammadayyoub', 'Muhammad_Jibreel_128kbps': 'ar.muhammadjibreel',
    'Abu_Bakr_Ash-Shaatree_128kbps': 'ar.shaatree'
};
const ayahGlobal = (s, n) => AYAH_COUNTS.slice(0, s - 1).reduce((a, b) => a + b, 0) + n;
const mirrorUrl = (s, n, r = recId) => AUDIO_MIRROR[r] ? `https://cdn.islamic.network/quran/audio/128/${AUDIO_MIRROR[r]}/${ayahGlobal(s, n)}.mp3` : null;
const validAudio = async b => b && b.size > 2000;
const isQuota = e => !!e && e.name === 'QuotaExceededError';

// يحفظ آية واحدة: (1) everyayah مباشرة (2) المرآة (3) وضع no-cors كحل أخير (للسورة الواحدة بس)
// بيرجّع 'ok' | 'opaque' | 'quota' | 'fail'
async function cacheAyahAudio(c, s, n, rec = recId, base = recId, allowOpaque = true) {
    const url = audioUrl(s, n, rec);
    if (await c.match(url, { ignoreVary: true }) || (rec !== base && await c.match(audioUrl(s, n, base), { ignoreVary: true }))) return 'ok';   // محفوظة بأي جودة
    try { await fetchAndCache(c, url, { tries: 2, timeout: 30000, validate: validAudio, type: 'audio/mpeg' }); return 'ok'; } catch (e) { if (isQuota(e)) return 'quota'; }
    const m = mirrorUrl(s, n, base);
    if (m) {
        try { const r = await fetchWithTimeout(m, 30000); if (r.ok) { const b = await r.blob(); if (b.size > 2000) { await putRebuilt(c, url, b, 'audio/mpeg'); return 'ok'; } } } catch (e) { if (isQuota(e)) return 'quota'; }
    }
    if (allowOpaque) { try { const r = await fetchWithTimeout(url, 30000, { mode: 'no-cors' }); await c.put(url, r); return 'opaque'; } catch (e) { if (isQuota(e)) return 'quota'; } }
    return 'fail';
}

/* ---------- المحفوظ من الصوتيات (بنقرأه من الكاش نفسه عشان يفضل دقيق حتى لو المتصفح مسح حاجة) ---------- */
const audioKeyRe = /\/data\/([^/]+)\/(\d{3})(\d{3})\.mp3$/;
async function audioSavedStats() {
    const out = {}, c = await openCache(AUD_CACHE); if (!c) return out;
    for (const r of await c.keys()) {
        const m = audioKeyRe.exec(r.url); if (!m) continue;
        const b = baseOf(decodeURIComponent(m[1])), o = out[b] || (out[b] = { total: 0, bySurah: {}, keys: new Set() }), k = m[2] + m[3];
        if (o.keys.has(k)) continue;
        o.keys.add(k); o.total++; o.bySurah[+m[2]] = (o.bySurah[+m[2]] || 0) + 1;
    }
    return out;
}
const fullSurahsCount = o => AYAH_COUNTS.reduce((n, c, i) => n + ((o.bySurah[i + 1] || 0) >= c ? 1 : 0), 0);
// الحفظ الدائم: أي تلاوات محفوظة لازم المتصفح ما يمسحهاش لوحده
async function audioHousekeeping() { try { const c = await openCache(AUD_CACHE); if (c && (await c.keys()).length) await persistStorage(); } catch (e) {} }

// السورة اللي هتتنزّل: اللي شغّالة دلوقتي، أو اللي ظاهرة في الشاشة، أو السورة المفتوحة
function audioTargetSurah() {
    if (aIdx >= 0 && aList[aIdx]) return +aList[aIdx].dataset.s;
    collectAyahs();
    if (aList.length) return +aList[Math.min(visibleAyahIndex(), aList.length - 1)].dataset.s;
    return currentType === 'surah' ? +currentId : 0;
}
let audioDlBusy = false, fullDl = null;
async function downloadSurahAudio() {
    if (audioDlBusy) { toast('التنزيل شغّال بالفعل...'); return; }
    const s = audioTargetSurah(); if (!s) { toast('افتح سورة الأول'); return; }
    if (!isOnline()) { toast('محتاج إنترنت للتنزيل'); return; }
    const count = AYAH_COUNTS[s - 1], base = recId, recLabel = recName();
    const c = await openCache(AUD_CACHE); if (!c) { toast('المتصفح لا يدعم الحفظ'); return; }
    audioDlBusy = true; persistStorage();
    const pos = $('plPos'), show = t => { if (pos) pos.textContent = t; }, keep = pos ? pos.textContent : '';
    let done = 0, failed = 0, quota = false;
    const items = Array.from({ length: count }, (_, i) => i + 1);
    toast(`جاري تنزيل سورة ${surahs[s - 1]} بصوت ${recLabel}...`);
    try {
        const rec = await effRec(base);
        await pool(items, 3, async n => {
            if (quota) return;
            const r = await cacheAyahAudio(c, s, n, rec, base, true);
            if (r === 'quota') quota = true; else if (r === 'fail') failed++;
            done++; show(`تنزيل ${A(done)}/${A(count)}`);
        });
    } finally { audioDlBusy = false; }
    if (aIdx >= 0 && aList[aIdx]) { markPlaying(aList[aIdx]); show(`سورة ${surahs[aList[aIdx].dataset.s - 1]} · آية ${A(aList[aIdx].dataset.n)}`); } else show(keep);
    if (quota) toast('المساحة ممتلئة — امسح حاجة وحاول تاني');
    else if (failed === count) toast('السيرفر لا يسمح بالتنزيل حالياً — الاستماع أونلاين فقط');
    else if (failed) toast(`تم حفظ ${A(count - failed)} آية وتعذر ${A(failed)} — اضغط تنزيل للإكمال`);
    else toast(`تم حفظ سورة ${surahs[s - 1]} بصوت ${recLabel} ✓`);
    renderStorageInfo(); renderAudioCard();
}

/* ---------- تنزيل المصحف كاملاً بصوت القارئ (بيكمّل من اللي اتحفظ، وبيتحفظ للأبد) ---------- */
async function downloadFullQuranAudio() {
    if (audioDlBusy) { toast('في تنزيل شغّال — استنى لحد ما يخلص'); return; }
    if (!isOnline()) { toast('محتاج إنترنت للتنزيل'); return; }
    const c = await openCache(AUD_CACHE); if (!c) { toast('المتصفح لا يدعم الحفظ'); return; }
    const base = recId, st = (await audioSavedStats())[base], have = st ? st.keys : new Set();
    const todo = []; AYAH_COUNTS.forEach((cnt, i) => { for (let n = 1; n <= cnt; n++) if (!have.has(pad3(i + 1) + pad3(n))) todo.push([i + 1, n]); });
    if (!todo.length) { toast('المصحف محفوظ كاملاً بصوت ' + recName() + ' ✓'); renderAudioCard(); return; }
    const rec = await effRec(base), kbps = +((/(\d+)kbps/.exec(rec) || [])[1]) || 128;
    const need = todo.length / TOTAL_AYAHS * kbps * 125 * 40000;      // تقدير: حوالي ١١ ساعة تلاوة
    try { const e = await navigator.storage.estimate(); if (e.quota && e.quota - (e.usage || 0) < need * 1.15) { toast(`المساحة غير كافية — محتاج حوالي ${fmtMB(need)}`); return; } } catch (e) {}
    if (!confirm(`هيتنزّل صوت المصحف كاملاً بصوت ${recName()} (حوالي ${fmtMB(need)}) ويفضل محفوظ على جهازك. يُفضَّل تكون على واي فاي. نكمّل؟`)) return;
    audioDlBusy = true; fullDl = { cancel: false }; const dl = fullDl;
    await persistStorage();
    const btn = $('audFullBtn'), wrap = $('audFullBarWrap'), bar = $('audFullBar'), txt = $('audFullText'), stop = $('audFullStop');
    if (btn) btn.dataset.busy = '1'; if (wrap) wrap.style.display = 'block'; if (stop) stop.style.display = 'block'; if (bar) bar.style.width = '0%';
    let done = 0, failed = 0, quota = false;
    try {
        await pool(todo, 3, async ([s, n]) => {
            if (dl.cancel || quota) return;
            const r = await cacheAyahAudio(c, s, n, rec, base, false);       // من غير no-cors: بيزوّد المساحة المحجوزة بشكل مبالغ فيه
            if (r === 'quota') quota = true; else if (r === 'fail') failed++;
            done++;
            if (bar) bar.style.width = (done / todo.length * 100) + '%';
            if (txt) txt.textContent = `جاري التنزيل... ${A(done)}/${A(todo.length)}`;
        });
    } finally { audioDlBusy = false; fullDl = null; if (btn) delete btn.dataset.busy; if (stop) stop.style.display = 'none'; setTimeout(() => { if (wrap) wrap.style.display = 'none'; }, 900); }
    if (quota) toast('المساحة ممتلئة — امسح حاجة وكمّل بعدين');
    else if (dl.cancel) toast('تم إيقاف التنزيل — اللي اتحفظ هيفضل موجود');
    else if (failed === todo.length) toast('السيرفر لا يسمح بتنزيل الصوت لهذا القارئ حالياً');
    else if (failed) toast(`تعذر ${A(failed)} آية — اضغط تنزيل تاني للإكمال`);
    else toast('تم حفظ المصحف كاملاً بصوت ' + recName() + ' ✓');
    renderStorageInfo(); renderAudioCard();
}
function stopFullAudioDownload() { if (fullDl) { fullDl.cancel = true; toast('جاري الإيقاف...'); } }

function toggleAudioQuality() {
    aQuality = !aQuality; store.set('athr_quality', aQuality ? 'hi' : 'std');
    toast(aQuality ? 'جودة الصوت: عالية' : 'جودة الصوت: عادية'); renderAudioCard();
}
async function renderAudioCard() {
    if (!$('audCard')) return;
    $('audRecName').textContent = recName();
    $('audQualVal').textContent = aQuality ? 'عالية' : 'عادية';
    const o = (await audioSavedStats())[recId], total = o ? o.total : 0, full = o ? fullSurahsCount(o) : 0;
    $('audStatus').textContent = total >= TOTAL_AYAHS ? 'محفوظ كاملاً ✓' : total ? `${A(full)} سورة كاملة • ${A(total)} آية` : 'لا يوجد';
    const btn = $('audFullBtn'); if (!btn || btn.dataset.busy) return;
    const done = total >= TOTAL_AYAHS; btn.classList.toggle('done', done);
    $('audFullText').textContent = done ? '✅ المصحف محفوظ كاملاً بصوت ' + recName() : (total ? `📥 أكمل تنزيل المصحف كاملاً (${A(total)}/${A(TOTAL_AYAHS)})` : '📥 تنزيل المصحف كاملاً بصوت ' + recName());
}
