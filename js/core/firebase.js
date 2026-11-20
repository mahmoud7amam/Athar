/* أَثَر — تهيئة Firebase (آمن حتى لو مفيش إنترنت)
   الأداء: سكربتات Firebase تقيلة (~300KB) فبتتحمّل بعد ما التطبيق يفتح، مش قبله.
   أي كود محتاج database/messaging يستنى firebaseReady. */

let database = null, messaging = null;
let firebaseLoadStarted = false, firebaseResolve = null;
const firebaseReady = new Promise(r => { firebaseResolve = r; });
const FIREBASE_SCRIPTS = [
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js'
];

function initFirebaseObjects() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            if (firebase.database) database = firebase.database();
            try {
                if (firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported()) messaging = firebase.messaging();
            } catch (e) {}
        }
    } catch (e) { console.warn('Firebase unavailable', e); }
}

function loadFirebase() {
    if (firebaseLoadStarted) return firebaseReady;
    firebaseLoadStarted = true;
    if (!isOnline()) { firebaseLoadStarted = false; return firebaseReady; }   // أوفلاين: نحاول تاني لما النت يرجع
    // async=false يحافظ على ترتيب التنفيذ (app قبل database/messaging)
    Promise.all(FIREBASE_SCRIPTS.map(src => new Promise(res => {
        const s = document.createElement('script');
        s.src = src; s.async = false; s.onload = s.onerror = res;
        document.head.appendChild(s);
    }))).then(() => { initFirebaseObjects(); firebaseResolve(); });
    return firebaseReady;
}
window.addEventListener('online', () => { if (!firebaseLoadStarted) loadFirebase(); });
