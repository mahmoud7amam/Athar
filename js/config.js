/* أَثَر — الإعدادات: أسماء الكاش وبيانات Firebase */

const ICON = 'icon-192.png';
const QCACHE = 'quran-cache-v1';

const TF_CACHE = 'tafsir-cache-v1';

const ASSETS_CACHE = 'athar-assets-v1';
const AUD_CACHE = 'quran-audio-v1';

const firebaseConfig = {
    apiKey: "AIzaSyBzaEUrY6MX38n3s7KcIfcx2mhqQbOCfCY",
    projectId: "gootff-dcc2a",
    authDomain: "gootff-dcc2a.firebaseapp.com",
    messagingSenderId: "1027459267887",
    appId: "1:1027459267887:web:56536c1c454f8072bf75da",
    databaseURL: "https://gootff-dcc2a-default-rtdb.firebaseio.com/"
};

// UID لحساب المطوّر داخل Firebase Authentication. ليس سرًا؛ الحماية الحقيقية في database.rules.json.
// استبدل القيمة بعد إنشاء حساب المطوّر ونشر قواعد Firebase.
const ADMIN_UID = '2FiprrG4efN1pgLXxfV6B7faBLt1';
