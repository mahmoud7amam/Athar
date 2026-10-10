# أَثَر

تطبيق إسلامي (PWA + TWA): مصحف، تفسير، مواقيت، أذكار، مسبحة، أحاديث.

## هيكل المشروع

```
index.html                 الهيكل فقط (HTML)
css/                       الأنماط بترتيب التحميل (الترتيب مهم: لاحقها يتغلب على سابقها)
js/config.js               أسماء الكاش وإعدادات Firebase
js/core/                   أدوات مشتركة، Firebase، الجهاز، الحالة العامة
js/data/                   بيانات ثابتة (دول، سور، أذكار، أحاديث، قرّاء)
js/ui/                     التنبيه السريع، المظهر، التنقل
css/settings.css           كارت البروفايل في أول الإعدادات
js/features/               كل ميزة في ملفها (مصحف، تفسير، مواقيت، صوت، مسبحة...)
js/app.js                  نقطة التشغيل init()
firebase-messaging-sw.js   Service Worker الموحّد (كاش + إشعارات)
scripts/build.mjs          بناء نسخة الإنتاج
vercel.json                أوامر النشر + security headers
```

الملفات scripts عادية (مش modules) وبتشترك في نفس النطاق العام لأن الـ HTML
بينادي دوال زي `loadContent()` من `onclick`. **ترتيب `<script>` في index.html مهم.**

## تشغيل وبناء

```
npm install
npm run start     # تشغيل محلي
npm run build     # ينتج dist/ (CSS و JS مجمّعين ومصغّرين)
```

## عند إضافة ملف CSS/JS جديد

1. أضفه في `index.html` بالترتيب الصحيح.
2. أضفه في `APP_ASSETS` داخل `firebase-messaging-sw.js` (عشان يشتغل أوفلاين).
3. ارفع `VERSION` في نفس الملف.

## قبل النشر (أمان)

- قيّد مفتاح Firebase بالدومين وفعّل App Check، وراجع قواعد Realtime Database.
- لوحة الأدمن لازم تتحمى بـ Firebase Auth (كلمة السر الحالية ظاهرة في الكود).
- ما تكتبش باسورد الـ keystore في الـ workflow؛ استخدم GitHub Secrets وثبّت keystore واحد.

## الأذان

- **الإعدادات ← الأذان:** تفعيل عام + تفعيل/إيقاف كل صلاة لوحدها + زر تجربة.
- **في المتصفح / PWA** (`js/features/adhan.js`): بيأذّن طول ما الصفحة شغّالة (حتى في الخلفية). ملف الصوت `videoplayback.m4a` بيتحفظ أوفلاين أول ما تفعّل الأذان.
- **في تطبيق الأندرويد** (`android/`): الصفحة بتبعت جدول المواقيت (٤٥ يوم) لـ `window.AtharNative.setAdhanSchedule`، والتطبيق بيضبط منبّه `setAlarmClock` للأذان الجاي، فبيأذّن حتى والتطبيق مقفول والموبايل مقفول (خدمة Foreground + شاشة أذان فوق القفل + زر إيقاف). بيرجّع الضبط بعد إعادة تشغيل الموبايل.
- لتغيير صوت الأذان: استبدل `videoplayback.m4a` (للويب) و `android/app/src/main/res/raw/adhan.m4a` (للتطبيق).

## بناء APK

1. ارفع المشروع على GitHub (الـ workflow في `.github/workflows/android.yml`).
2. ضيف الـ Secrets الأربعة المكتوبين في أول ملف الـ workflow (لازم نفس keystore النسخة القديمة عشان التحديث ينزل فوقها).
3. Actions ← Build Android APK ← Run workflow ← نزّل `athar-apk`.
