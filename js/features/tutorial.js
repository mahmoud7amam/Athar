/* أَثَر — الجولة التعريفية: الطفل أبو عمامة بيشرح أهم حاجات التطبيق بأسهم وبقعة ضوء.
   بتظهر أول مرة تفتح التطبيق، وتقدر ترجع لها من الإعدادات ← «إعادة شرح التطبيق». */

const TUT_KID = `<svg class="tut-kid-svg" viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tkTb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf3"/><stop offset="1" stop-color="#e6d9b0"/></linearGradient><linearGradient id="tkTh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset="1" stop-color="#e9dfc0"/></linearGradient><radialGradient id="tkSk" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fbe2c4"/><stop offset="1" stop-color="#eebd92"/></radialGradient></defs><g class="k-body"><path d="M62 164 C48 172 44 184 46 192" stroke="#d6c999" stroke-width="19" stroke-linecap="round" fill="none"/><path d="M62 164 C48 172 44 184 46 192" stroke="url(#tkTh)" stroke-width="16" stroke-linecap="round" fill="none"/><path d="M40 192 C40 158 64 146 100 146 C136 146 160 158 160 192Z" fill="url(#tkTh)" stroke="#d6c999" stroke-width="1.5"/><path d="M82 148 Q100 168 118 148" stroke="#D4AF37" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M100 160 V192" stroke="#D4AF37" stroke-width="1.6"/><circle cx="100" cy="172" r="2.4" fill="#D4AF37"/><circle cx="100" cy="183" r="2.4" fill="#D4AF37"/><rect x="89" y="128" width="22" height="22" rx="9" fill="#e3b088"/></g><g class="k-arm"><path d="M140 168 C160 160 168 138 162 114" stroke="#d6c999" stroke-width="19" stroke-linecap="round" fill="none"/><path d="M140 168 C160 160 168 138 162 114" stroke="url(#tkTh)" stroke-width="16" stroke-linecap="round" fill="none"/><circle cx="162" cy="105" r="11.5" fill="url(#tkSk)"/><ellipse cx="152" cy="108" rx="3.8" ry="6.6" fill="url(#tkSk)" transform="rotate(-24 152 108)"/></g><g class="k-head"><g transform="translate(100 134) scale(1.1) translate(-100 -134)"><g class="k-tail"><path d="M146 54 C164 62 168 88 160 112 C155 104 150 94 147 84Z" fill="url(#tkTb)" stroke="#d6c999" stroke-width="1.4"/><path d="M152 70 C158 80 159 92 157 102" stroke="#d6c999" stroke-width="1.2" fill="none"/></g><circle cx="58" cy="100" r="8.5" fill="#eebd92"/><circle cx="142" cy="100" r="8.5" fill="#eebd92"/><ellipse cx="100" cy="97" rx="43" ry="40" fill="url(#tkSk)"/><circle cx="68" cy="111" r="9" fill="#f08e7c" opacity=".5"/><circle cx="132" cy="111" r="9" fill="#f08e7c" opacity=".5"/><path d="M76 80 Q84 75 92 79" stroke="#6a4f3c" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M108 79 Q116 75 124 80" stroke="#6a4f3c" stroke-width="2.2" fill="none" stroke-linecap="round"/><g class="k-eye"><ellipse cx="82" cy="97" rx="8" ry="9.6" fill="#1b140e"/><circle cx="85" cy="93" r="3.2" fill="#fff"/><circle cx="79.5" cy="101" r="1.5" fill="#fff"/></g><g class="k-eye"><ellipse cx="118" cy="97" rx="8" ry="9.6" fill="#1b140e"/><circle cx="121" cy="93" r="3.2" fill="#fff"/><circle cx="115.5" cy="101" r="1.5" fill="#fff"/></g><ellipse cx="100" cy="107" rx="2.6" ry="1.9" fill="#d99a76"/><path d="M89 114 Q100 130 111 114Z" fill="#8a3f2c" stroke="#8a3f2c" stroke-width="1.6" stroke-linejoin="round"/><path d="M93 121.5 Q100 126 107 121.5 Q100 118.5 93 121.5Z" fill="#ee8a78"/><g transform="translate(100 70) scale(.94) translate(-100 -70)"><path d="M47 76 C42 40 68 17 100 17 C132 17 158 40 153 76 C141 67 122 63 100 63 C78 63 59 67 47 76Z" fill="url(#tkTb)" stroke="#d6c999" stroke-width="1.5"/><path d="M54 62 C74 38 112 28 149 52" stroke="#cdbf93" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M50 70 C80 46 122 40 151 64" stroke="#cdbf93" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M68 32 C88 26 118 26 136 36" stroke="#cdbf93" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M100 18 C95 34 98 50 110 63" stroke="#cdbf93" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M48 74 C64 65 82 62 100 62 C118 62 136 65 152 74" stroke="#D4AF37" stroke-width="4.6" fill="none" stroke-linecap="round"/><circle cx="100" cy="62.5" r="4" fill="#f9e076" stroke="#a8841f" stroke-width="1"/></g></g></g></svg>`;
const TUT = { open: false, i: 0, steps: [], from: 'p-prayers', timers: [] };

const TUT_STEPS = [
    { title: 'أهلاً بيك في أَثَر 👋', text: 'أنا صاحبك الصغير، وهمشي معاك جولة سريعة تعرّفك على كل حاجة في التطبيق. تقدر تتخطّاها، وتقدر ترجع لها في أي وقت من الإعدادات.' },
    { page: 'p-prayers', sel: '#countrySelect', pos: 'below', title: 'مواقيت الصلاة', text: 'اختار دولتك ومدينتك من هنا وهتظهر مواقيت الصلاة بالظبط. وتقدر تنزّل مواقيت سنة كاملة وتشتغل بدون إنترنت.' },
    { page: 'p-prayers', sel: '#prayerList .ad-bell', fb: '#prayerList', title: 'الأذان', text: 'الجرس اللي جنب كل صلاة بيشغّل الأذان أو يوقفه ليها. وقت الصلاة بتظهر شاشة «صلاة كذا الآن» ويتشغّل الأذان، حتى لو التطبيق مقفول.' },
    { page: 'p-quran', sel: 'nav .nav-item[data-page="p-quran"]', title: 'المصحف الشريف', text: 'من هنا تفتح المصحف كامل بالرسم العثماني. شوف إزاي التبويب بقى منوّر بالذهبي، ده معناه إنك دلوقتي جوّه المصحف.' },
    { page: 'p-quran', sel: '.quran-tabs', pos: 'below', title: 'تنقّل بسهولة', text: 'ابحث عن سورة أو آية، أو اتنقّل بالأجزاء والأحزاب والصفحات. اضغط على أي سورة تفتح للقراءة، ولمّا تلمس الشاشة وانت بتقرأ بتظهر أدوات الاستماع والتفسير وحفظ العلامة.' },
    { sel: 'nav .nav-item[data-page="p-qibla"]', title: 'القبلة', text: 'بوصلة بتوريك اتجاه القبلة من مكانك. أمسك الموبايل مفرود، ولما الكعبة تقابل السهم هتنوّر بالأخضر.' },
    { sel: 'nav', title: 'وفي باقي الأقسام', text: 'التفسير • المسبحة • الأحاديث • الأدعية. كلهم في القائمة اللي تحت، والمسبحة بتحفظ عدّادك لوحدها.' },
    { page: 'p-settings', sel: '#adhanCard .ad-row', title: 'ظبط الأذان', text: 'من هنا تتحكم في الأذان: اختار الصلوات اللي عايزها، وظبّط مستوى الصوت، وجرّب الأذان في أي وقت.' },
    { page: 'p-settings', sel: '#adLockRow', only: 'twa', title: 'قفل الصلاة 🔒', text: 'لو فعّلتها، وقت الصلاة بتظهر شاشة فوق كل التطبيقات ومبتتفتحش غير لما تحلف إنك صليت وتدوس «تم».' },
    { page: 'p-settings', sel: '#tutReplayBtn', title: 'عايز الشرح تاني؟', text: 'تقدر ترجع للجولة دي في أي وقت من الزرار ده. جعله الله في ميزان حسناتك 🤍' }
];

/* ---------- نافذة تأكيد زجاجية (Promise<boolean>) ---------- */
function atConfirm(o) {
    return new Promise(res => {
        const d = document.createElement('div'); d.className = 'at-dlg';
        d.innerHTML = `<div role="alertdialog" aria-modal="true"><h3>${esc(o.title)}</h3><p>${esc(o.text)}</p><div class="tut-actions"><button class="tut-btn back" data-r="0">${esc(o.cancel || 'إلغاء')}</button><button class="tut-btn main" data-r="1">${esc(o.ok || 'تأكيد')}</button></div></div>`;
        d.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; d.remove(); res(b.dataset.r === '1'); });
        document.body.appendChild(d);
    });
}

/* ---------- بناء الواجهة ---------- */
function tutBuild() {
    if ($('tut')) return $('tut');
    const kid = TUT_KID.replace('viewBox="0 0 200 190"', 'viewBox="38 2 134 142"');
    const el = document.createElement('div');
    el.id = 'tut'; el.className = 'tut'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'جولة تعريفية');
    el.innerHTML =
        '<div class="tut-shield"></div><div class="tut-spot" id="tutSpot"></div>' +
        '<div class="tut-arrow" id="tutArrow"><svg viewBox="0 0 38 44"><path d="M6 8 L19 24 L32 8 M6 24 L19 40 L32 24"/></svg></div>' +
        '<div class="tut-card kid-r" id="tutCard"><div class="tut-kid">' + kid + '</div>' +
        '<div class="tut-step" id="tutStep"></div><div class="tut-title" id="tutTitle"></div><div class="tut-text" id="tutText"></div>' +
        '<div class="tut-dots" id="tutDots"></div>' +
        '<div class="tut-actions"><button class="tut-btn main" id="tutNext"></button><button class="tut-btn back" id="tutBack">السابق</button><button class="tut-btn skip" id="tutSkip">تخطّي</button></div></div>';
    document.body.appendChild(el);
    $('tutNext').onclick = tutNext; $('tutBack').onclick = tutPrev; $('tutSkip').onclick = () => tutEnd();
    window.addEventListener('resize', () => { if (TUT.open) tutPlace(); });
    return el;
}

function tutAfter(ms, fn) { const t = setTimeout(fn, ms); TUT.timers.push(t); }
function tutClear() { TUT.timers.forEach(clearTimeout); TUT.timers = []; }

function startTutorial(manual) {
    if (TUT.open) return;
    const cur = document.querySelector('.page.active');
    TUT.from = manual && cur && cur.id !== 'p-reader' ? cur.id : 'p-prayers';
    TUT.steps = TUT_STEPS.filter(s => s.only !== 'twa' || (typeof TWA !== 'undefined' && TWA.is));
    TUT.i = 0; TUT.open = true;
    if (document.body.classList.contains('reading-mode')) nav('p-prayers');
    const el = tutBuild(); el.classList.add('open');
    $('tutDots').innerHTML = TUT.steps.map(() => '<i></i>').join('');
    tutShow(0);
}

function tutShow(i) {
    tutClear();
    TUT.i = i; const s = TUT.steps[i]; if (!s) return tutEnd(true);
    const last = i === TUT.steps.length - 1;
    $('tutStep').textContent = `${toArabicDigits(i + 1)} / ${toArabicDigits(TUT.steps.length)}`;
    $('tutTitle').textContent = s.title; $('tutText').textContent = s.text;
    $('tutNext').textContent = last ? 'يلا نبدأ ✓' : (i === 0 ? 'يلا بينا' : 'التالي');
    $('tutBack').disabled = i === 0; $('tutSkip').style.display = last ? 'none' : '';
    [...$('tutDots').children].forEach((d, k) => d.classList.toggle('on', k === i));
    const card = $('tutCard'); card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
    let wait = 60;
    const here = document.querySelector('.page.active');
    if (s.page && (!here || here.id !== s.page)) { nav(s.page); wait = 420; }
    tutPlace(true);                       // موضع مبدئي فوراً
    tutAfter(wait, () => tutPlace());     // بعد ما الصفحة تستقر
    tutAfter(wait + 350, () => tutPlace());
}

function tutPlace() {
    const ui = $('tut'), s = TUT.steps[TUT.i]; if (!ui || !s) return;
    const spot = $('tutSpot'), arrow = $('tutArrow'), card = $('tutCard');
    let el = s.sel ? document.querySelector(s.sel) : null;
    if (!el && s.fb) el = document.querySelector(s.fb);
    if (el && !el.getClientRects().length) el = null;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (!el) {                                            // خطوة بدون هدف: الكارت في النص
        ui.classList.add('notarget');
        card.style.top = Math.max(60, (vh - card.offsetHeight) / 2 + 24) + 'px'; card.style.bottom = 'auto';
        card.classList.remove('kid-l'); card.classList.add('kid-r');
        return;
    }
    ui.classList.remove('notarget');
    if (!el.closest('nav')) { try { el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (e) {} }
    const r = el.getBoundingClientRect(), pad = 6;
    spot.style.top = (r.top - pad) + 'px'; spot.style.left = (r.left - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px'; spot.style.height = (r.height + pad * 2) + 'px';
    spot.style.borderRadius = el.closest('nav') && el.tagName !== 'NAV' ? '22px' : el.tagName === 'NAV' ? '30px' : '18px';

    const ch = card.offsetHeight, ARROW = 52, GAP = 14;
    const roomBelow = vh - (r.bottom + pad) - ARROW - GAP, roomAbove = (r.top - pad) - ARROW - GAP - 40;
    let below = s.pos ? s.pos === 'below' : roomBelow >= ch + 40 || roomBelow >= roomAbove;
    if (below && roomBelow < ch && roomAbove > roomBelow) below = false;
    const cx = Math.min(vw - 24, Math.max(24, r.left + r.width / 2));
    arrow.style.left = (cx - 19) + 'px';
    if (below) {
        arrow.classList.add('up');
        arrow.style.top = (r.bottom + pad + 2) + 'px';
        card.style.top = Math.min(vh - ch - 12, r.bottom + pad + ARROW + GAP + 30) + 'px'; card.style.bottom = 'auto';
    } else {
        arrow.classList.remove('up');
        arrow.style.top = (r.top - pad - 46) + 'px';
        card.style.top = Math.max(46, r.top - pad - ARROW - GAP - ch) + 'px'; card.style.bottom = 'auto';
    }
    // الطفل في الناحية المعاكسة للسهم عشان ما يغطّيش عليه
    card.classList.toggle('kid-l', cx > vw / 2); card.classList.toggle('kid-r', cx <= vw / 2);
}

function tutNext() { if (TUT.i >= TUT.steps.length - 1) tutEnd(true); else tutShow(TUT.i + 1); }
function tutPrev() { if (TUT.i > 0) tutShow(TUT.i - 1); }
function tutEnd() {
    tutClear(); TUT.open = false; store.set('tut_done', '1');
    const ui = $('tut'); if (ui) ui.classList.remove('open');
    try { nav(TUT.from || 'p-prayers'); } catch (e) {}
}

// أول فتح للتطبيق: نستنى السبلاش يخلص، وبعدين نبدأ الجولة
function tutorialAuto() {
    if (store.get('tut_done') === '1') return;
    const t = setInterval(() => {
        if ($('splash')) return;
        clearInterval(t);
        if (document.body.classList.contains('adhan-open') || TUT.open) return;
        setTimeout(() => startTutorial(false), 700);
    }, 400);
    setTimeout(() => clearInterval(t), 40000);
}
