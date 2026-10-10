/* أَثَر — الأذان: يقول اسم الصلاة ثم يؤذّن عند الموعد + بانر + إشعار */

// لو عايز أذان بتسجيل حقيقي: حط هنا رابط ملف mp3 (فاضي = الأذان ينطق بصوت الجهاز)
const AZAN_AUDIO_URL = '';
const AZAN_TEXT = 'الله أكبر، الله أكبر. أشهد أن لا إله إلا الله. أشهد أن محمداً رسول الله. حي على الصلاة. حي على الفلاح. الله أكبر، الله أكبر. لا إله إلا الله.';

const azanOn = () => store.get('azan_on', '1') === '1';
let azanAud = null, azanBannerTimer = null;

// الأصوات العربية بتتحمّل متأخر في بعض المتصفحات
function azanVoice() {
    if (!('speechSynthesis' in window)) return null;
    const list = speechSynthesis.getVoices() || [];
    return list.find(v => /^ar/i.test(v.lang)) || null;
}
function speakAr(text, onend) {
    if (!('speechSynthesis' in window)) { if (onend) onend(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar'; u.rate = 0.85; u.pitch = 1; u.volume = 1;
    const v = azanVoice(); if (v) u.voice = v;
    u.onend = () => { if (onend) onend(); };
    u.onerror = () => { if (onend) onend(); };
    speechSynthesis.speak(u);
}

// بيتنادى بضغطة المستخدم عشان المتصفح يسمح بالصوت بعدين
function primeAzan() {
    try {
        if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u);
        }
    } catch (e) {}
}

function playAzanSound(name) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (AZAN_AUDIO_URL) {
        speakAr(`صلاة ${name} الآن`, () => {
            try {
                if (azanAud) azanAud.pause();
                azanAud = new Audio(AZAN_AUDIO_URL);
                azanAud.play().catch(() => {});
            } catch (e) {}
        });
        return;
    }
    speakAr(`صلاة ${name} الآن`, () => speakAr(AZAN_TEXT));
}

function showAzanBanner(name, sub) {
    let b = $('azanBanner');
    if (!b) {
        b = document.createElement('div');
        b.id = 'azanBanner'; b.className = 'az-banner'; b.setAttribute('role', 'alert');
        b.innerHTML = `<div class="az-ic"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6c-6 0-10 5-10 11v6l-4 6h28l-4-6v-6c0-6-4-11-10-11z" fill="#D4AF37"/><circle cx="24" cy="38" r="4" fill="#D4AF37"/></svg></div>
            <div class="az-txt"><b id="azTitle"></b><span id="azSub"></span></div>
            <button class="az-x" onclick="hideAzanBanner()" aria-label="إغلاق">✕</button>`;
        document.body.appendChild(b);
    }
    $('azTitle').textContent = `حان الآن موعد صلاة ${name}`;
    $('azSub').textContent = sub ? `${sub} · الله أكبر` : 'الله أكبر';
    requestAnimationFrame(() => b.classList.add('show'));
    clearTimeout(azanBannerTimer);
    azanBannerTimer = setTimeout(hideAzanBanner, 25000);
}
function hideAzanBanner() {
    const b = $('azanBanner'); if (b) b.classList.remove('show');
    clearTimeout(azanBannerTimer);
}

// بتتنادى من checkPrayerNotifications كل ~20 ثانية، وبتشتغل مرة واحدة لكل صلاة في اليوم
function triggerAzan(k, now = new Date()) {
    if (!azanOn()) return;
    const key = `azan_fired_${k}_${now.toDateString()}`;
    if (store.get(key)) return;          // ما يتكررش لو الصفحة اتعملها ريفريش
    store.set(key, '1');
    const name = PRAYERS[k];
    const sel = $('citySelect');
    const city = (sel && sel.options[sel.selectedIndex] || {}).text || '';
    showAzanBanner(name, city);
    showNotify(`حان الآن موعد صلاة ${name}`, {
        body: `الله أكبر، حان الآن موعد ${name}${city ? ' حسب توقيت ' + city : ''}`,
        tag: 'prayer-' + k, requireInteraction: true
    });
    playAzanSound(name);
}

// زرار التشغيل/الإيقاف (ضغطة مستخدم = نفتح الصوت ونطلب إذن الإشعارات)
function toggleAzan() {
    const on = !azanOn();
    store.set('azan_on', on ? '1' : '0');
    primeAzan();
    if (on && hasNotif() && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
    }
    renderAzanCard();
    toast(on ? 'الأذان مفعّل ✓' : 'الأذان متوقف');
}
// تجربة فورية عشان المستخدم يتأكد إن الصوت شغال
function testAzan() {
    primeAzan();
    const city = ($('citySelect') && $('citySelect').options[$('citySelect').selectedIndex] || {}).text || '';
    showAzanBanner('الظهر', city);
    playAzanSound('الظهر');
}
function renderAzanCard() {
    const sw = $('azSw'); if (!sw) return;
    const on = azanOn();
    sw.classList.toggle('on', on);
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
    const st = $('azState'); if (st) st.textContent = on ? 'مفعّل' : 'متوقف';
}
renderAzanCard();
