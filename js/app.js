/* ---------- التشغيل ---------- */
function init() {
    applyThemeMode();

    const savedCountry = store.get('saved_country') || "Egypt";
    const savedCity = store.get('saved_city');
    const frag = document.createDocumentFragment();
    for (const key in arabCountries) {
        const opt = document.createElement('option');
        opt.value = key; opt.innerText = arabCountries[key].ar;
        if (key === savedCountry) opt.selected = true;
        frag.appendChild(opt);
    }
    $('countrySelect').appendChild(frag);
    updateCities(savedCity, false);
    renderQuranList();
    checkOfflineState();
    scheduleAutoDownload();
    refreshPrayerDlState();

    adhanInit();
    tutorialAuto();
    initNavScrub();

    // الأعمال التقيلة بعد ما الشاشة تظهر وتستقر (بدل ما تزاحم أول رسم)
    const afterPaint = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));
    afterPaint(() => {
        registerSW().then(() => setupNotificationPrompt());
        loadFirebase().then(() => setTimeout(setupAdminTracking, 500));
    });
    // نجهّز الصفحات التقيلة وهي مخفية، فأول زيارة تبقى فورية
    setTimeout(() => afterPaint(() => {
        try { if (!$('tfList').childElementCount) renderTafsirList(); } catch (e) {}
        try { if (!duasRendered) { renderDuasList(); duasRendered = true; } } catch (e) {}
    }), 2500);

    startTicker();
    setTimeout(checkHadithReminder, 5000);
}

/* ---------- المؤقّت الموحّد ----------
   قبل كده: 5 دوال كل ثانية حتى والتطبيق في الخلفية أو الصفحة مش ظاهرة.
   دلوقتي: بنحدّث بس اللي قدام عين المستخدم، وبنوقف تمامًا لما التطبيق يتخبّى. */
let tickN = 0;
function tick() {
    checkPrayerNotifications();                     // الأذان: خفيف ومهم حتى في الخلفية
    if (document.hidden) return;
    updateNextPrayer();                             // الشريط العلوي ظاهر دايمًا
    const cur = document.querySelector('.page.active'), id = cur && cur.id;
    if (id === 'p-prayers') updatePrayerClock();
    else if (id === 'p-iqama') updateIqamaClock();
    if (++tickN % 60 === 0) checkHadithReminder();  // مرة في الدقيقة تكفي
}
function startTicker() {
    setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateNextPrayer(); updatePrayerClock(); updateIqamaClock(); } });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
