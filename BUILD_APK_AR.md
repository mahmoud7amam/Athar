# بناء APK لأَثَر عبر GitHub Actions

هذه الحزمة تحتوي على مصدر الموقع ومشروع Android. لا تحتوي على APK مبني مسبقًا.

## رفع المشروع إلى GitHub

1. فك ضغط `Athar-main` على الكمبيوتر.
2. ارفع محتويات المجلد إلى المستودع الصحيح في GitHub، وليس ملف ZIP نفسه فقط.
3. تأكد أن مجلد `.github/workflows` مرفوع كما هو.
4. إذا كان المستودع متصلًا بمشروع Vercel، سيُنشر الموقع تلقائيًا عند الدفع إلى الفرع المتصل. تأكد أن إعدادات Vercel تشير إلى مجلد المشروع الصحيح.

## استخراج APK التجريبي

1. افتح المستودع في GitHub ثم تبويب **Actions**.
2. اختر سير العمل **Build Android (APK + AAB) with native adhan**.
3. اضغط **Run workflow** واختر الفرع الذي رفعت عليه الملفات.
4. بعد نجاح التشغيل، افتح نتيجة التشغيل ونزّل Artifact باسم `athar-android`.
5. داخل الملف ستجد `app-debug.apk` للتجربة. هذا ملف Debug وليس إصدار المتجر النهائي.

## إنشاء إصدار Release للنشر

يجب إعداد GitHub Actions Secrets التالية باستخدام ملف التوقيع الأصلي للتطبيق، إذا كان المطلوب تحديث التطبيق المنشور حاليًا:

- `ANDROID_KEYSTORE_B64`: ملف keystore الأصلي مشفرًا بصيغة Base64.
- `ANDROID_KEYSTORE_PASSWORD`: كلمة مرور keystore.
- `ANDROID_KEY_ALIAS`: اسم المفتاح.
- `ANDROID_KEY_PASSWORD`: كلمة مرور المفتاح.

بعدها أعد تشغيل Workflow؛ عند توفر الأسرار سيبني `APK Release` و`AAB` موقّعين. لا ترفع ملف keystore أو كلمات المرور داخل المستودع أو ZIP. يجب أن يكون `applicationId` مطابقًا للتطبيق المنشور، وأن تكون `versionCode` أعلى من آخر نسخة رفعتها إلى Play Console.

## ملاحظة Android Studio

المشروع يستخدم Gradle 8.11.1 وAndroid Gradle Plugin 8.9.1، لكن ملفات Gradle Wrapper (`gradlew` و`gradlew.bat` و`gradle-wrapper.jar`) غير مضمّنة في هذه الحزمة. سير العمل على GitHub يثبّت Gradle بنفسه؛ لذلك هو المسار المهيأ للبناء الآن. للبناء محليًا من Android Studio، يجب توفير Gradle 8.11.1 محليًا وضبط Android SDK 36 وBuild Tools 36.0.0.

## الإشعارات ولوحة المطوّر

إعداد Firebase منفصل عن بناء APK. اتبع `ADMIN_SETUP_AR.md` لإنشاء Web App في Firebase، وتفعيل Authentication، ونشر قواعد Realtime Database ووظيفة Cloud Functions. قبل هذه الخطوات، لوحة المطوّر وإشعارات Push ليست خدمة منشورة بعد.
