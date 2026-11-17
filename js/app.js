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

    registerSW().then(() => setupNotificationPrompt());
    adhanInit();
    tutorialAuto();
    setTimeout(setupAdminTracking, 1500);

    setInterval(() => { updateNextPrayer(); updatePrayerClock(); updateIqamaClock(); checkPrayerNotifications(); checkHadithReminder(); }, 1000);
    setTimeout(checkHadithReminder, 5000);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
