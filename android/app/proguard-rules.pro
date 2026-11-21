# قواعد R8 لتطبيق أثر (TWA + أذان أصلي)
# الأكتفتيز والسيرفسز والريسيفرز المكتوبة في الـ Manifest بتتحفظ تلقائياً.

# مكتبة TWA والتفويض
-keep class com.google.androidbrowserhelper.** { *; }

# كلاسات التطبيق نفسه (أمان زيادة: الأذان والمنبّهات حساسين)
-keep class com.atharqurani.app.** { *; }

# نحتفظ بأرقام الأسطر عشان لو حصل كراش يبان مكانه
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

-dontwarn org.jetbrains.annotations.**
-dontwarn kotlin.**
