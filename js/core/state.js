/* ---------- حالة التطبيق ---------- */
let localCount = parseInt(store.get('local_tasbih_val')) || 0;
let totalCount = parseInt(store.get('total_athr')) || 0;
let currentTasbihIndex = parseInt(store.get('tasbih_idx')) || 0;
let currentView = null, currentFontSize = parseInt(store.get('athr_font')) || 24;
let prayerTimings = {}, activeQuranTab = 'surah';
let currentType = 'surah', currentId = 1;
let infoTimeout = null, readerUiVisible = false;
let swReg = null, loadToken = 0, lastReq = null;
const notifiedPrayers = {};
const scrollMem = {};
const surahMem = new Map();
const PRAYERS = { Fajr: "الفجر", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء" };

if (currentFontSize < 18 || currentFontSize > 50) currentFontSize = 24;
