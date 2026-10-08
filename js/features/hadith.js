/* ---------- الأحاديث + ستريك القراءة ---------- */

const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
let hdOffset = 0;
function hadithOfDay(off = 0) {
    const n = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 864e5);
    return HADITHS[(n + off) % HADITHS.length];
}
function hdState() {
    const last = store.get('hd_last'), today = dayKey(new Date());
    let st = parseInt(store.get('hd_streak')) || 0;
    if (last !== today && last !== dayKey(daysAgo(1))) st = 0;
    return { st, today, done: last === today };
}
function renderHadith() {
    const { st, done } = hdState();
    let days = []; try { days = JSON.parse(store.get('hd_days') || '[]'); } catch (e) {}
    $('streakNum').textContent = toArabicDigits(st);
    $('flame').classList.toggle('lit', done);
    const L = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
    let w = '';
    for (let i = 6; i >= 0; i--) { const d = daysAgo(i), on = days.includes(dayKey(d)); w += `<div class="sw-d${on ? ' on' : ''}${i === 0 ? ' today' : ''}"><i>${on ? '✓' : ''}</i>${L[d.getDay()]}</div>`; }
    $('streakWeek').innerHTML = w;
    const best = parseInt(store.get('hd_best')) || 0;
    $('streakBest').textContent = best ? `أطول سلسلة: ${toArabicDigits(best)} يوم` : 'اقرأ حديث اليوم وابدأ سلسلتك';
    const h = hadithOfDay(hdOffset);
    $('hdText').textContent = h.t; $('hdSrc').textContent = h.s;
    $('hdTag').textContent = hdOffset ? 'حديث آخر' : 'حديث اليوم';
    const b = $('hdRead'); b.classList.toggle('done', done);
    b.textContent = done ? '✓ تمت قراءة اليوم — نلقاك غداً' : '✓ تم القراءة';
}
function nextHadith() {
    hdOffset = (hdOffset + 1) % HADITHS.length; renderHadith();
    const c = $('hdCard'); c.classList.remove('swap'); void c.offsetWidth; c.classList.add('swap');
}
function markHadithRead() {
    const s = hdState(); if (s.done) return;
    const st = s.st + 1;
    store.set('hd_streak', st); store.set('hd_last', s.today);
    if (st > (parseInt(store.get('hd_best')) || 0)) store.set('hd_best', st);
    let days = []; try { days = JSON.parse(store.get('hd_days') || '[]'); } catch (e) {}
    days.push(s.today); store.set('hd_days', JSON.stringify(days.slice(-30)));
    renderHadith();
    const f = $('flame'); f.classList.remove('burst'); void f.offsetWidth; f.classList.add('burst');
    if (navigator.vibrate) navigator.vibrate([20, 40, 60]);
    toast(`🔥 سلسلتك ${toArabicDigits(st)} يوم — تقبل الله منك`);
}
function checkHadithReminder() {
    if (!hasNotif() || Notification.permission !== 'granted') return;
    const { st, today, done } = hdState();
    if (done || new Date().getHours() < 19 || store.get('hd_notified') === today) return;
    store.set('hd_notified', today);
    const h = hadithOfDay(0), short = h.t.length > 110 ? h.t.slice(0, 110).replace(/\s+\S*$/, '') + '…' : h.t;
    showNotify(st > 0 ? `🔥 سلسلتك ${toArabicDigits(st)} يوم في خطر!` : '📖 حديث اليوم في انتظارك', {
        body: `${short}\n— ${h.s}\nافتح أَثَر واضغط «تم القراءة» للحفاظ على سلسلتك.`, tag: 'hadith-streak'
    });
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkHadithReminder(); });
