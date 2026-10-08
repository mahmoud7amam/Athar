/* أَثَر — تهيئة Firebase (آمن حتى لو مفيش إنترنت) */

let database = null, messaging = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        if (firebase.database) database = firebase.database();
        try {
            if (firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported()) messaging = firebase.messaging();
        } catch (e) {}
    }
} catch (e) { console.warn('Firebase unavailable', e); }
