package com.atharqurani.app;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;

/**
 * جسر الويب ← الأصلي. الصفحة بتفتح رابط intent://... فيوصل هنا:
 *   athar-adhan://sync?on=1&p=11111&v=90&c=القاهرة&t=مواقيت   → حفظ + ضبط المنبّهات
 *   athar-adhan://test?i=1                                    → تجربة الأذان فوراً
 *   athar-adhan://stop                                        → إيقاف الأذان
 *   athar-adhan://perms                                       → إعادة طلب الأذونات (إشعارات/شاشة كاملة/فوق التطبيقات/بطارية)
 * مفيش واجهة: بيخلّص ويرجّع التطبيق فوراً (إلا لو محتاج إذن الإشعارات).
 */
public class SyncActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Uri u = getIntent() == null ? null : getIntent().getData();
        if (u == null) { finish(); return; }
        String host = String.valueOf(u.getHost());
        try {
            if ("sync".equals(host)) {
                String p = u.getQueryParameter("p");
                if (p == null || p.length() < 5) p = "11111";
                int v = 90;
                try { v = Integer.parseInt(u.getQueryParameter("v")); } catch (Exception ignored) { }
                AdhanPrefs.save(this, !"0".equals(u.getQueryParameter("on")), p, v, nz(u.getQueryParameter("c")), u.getQueryParameter("t"));
                AdhanScheduler.schedule(this);
            } else if ("test".equals(host)) {
                int i = 1;
                try { i = Integer.parseInt(u.getQueryParameter("i")); } catch (Exception ignored) { }
                AdhanService.begin(this, i, System.currentTimeMillis());
            } else if ("stop".equals(host)) {
                stopService(new Intent(this, AdhanService.class));
            } else if ("perms".equals(host)) {
                AdhanPrefs.resetAsked(this);      // المستخدم ضغط «ضبط الأذونات»: نسأل من الأول
            }
        } catch (Exception ignored) { }
        askPermissions();
    }

    private static String nz(String s) { return s == null ? "" : s; }

    /**
     * الأذونات بالترتيب، كل واحد مرة واحدة بس (إلا لو الصفحة طلبت athar-adhan://perms يدوياً):
     * إشعارات ← شاشة كاملة (أندرويد 14+) ← العرض فوق التطبيقات ← استثناء البطارية. بعد كل واحد نكمّل للي بعده.
     */
    private int step = 0;
    private static final int RC_NOTIF = 11, RC_SETTINGS = 12;

    private void askPermissions() { step = 0; next(); }

    private void next() {
        while (step < 4) {
            int s = step++;
            if (tryStep(s)) return;       // فتح شاشة طلب → هنكمّل في onActivityResult / onRequestPermissionsResult
        }
        finish();
        overridePendingTransition(0, 0);
    }

    /** true = فتحنا شاشة لازم نستناها */
    private boolean tryStep(int s) {
        try {
            if (s == 0) {
                if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                        && !AdhanPrefs.asked(this, "notif")) {
                    AdhanPrefs.setAsked(this, "notif");
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, RC_NOTIF);
                    return true;
                }
            } else if (s == 1) {
                if (Build.VERSION.SDK_INT >= 34 && !AdhanPrefs.asked(this, "fsi")) {
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null && !nm.canUseFullScreenIntent()) {
                        AdhanPrefs.setAsked(this, "fsi");
                        startActivityForResult(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + getPackageName())), RC_SETTINGS);
                        return true;
                    }
                }
            } else if (s == 2) {
                if (Build.VERSION.SDK_INT >= 23 && !AdhanPrefs.asked(this, "overlay") && !Settings.canDrawOverlays(this)) {
                    AdhanPrefs.setAsked(this, "overlay");
                    startActivityForResult(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName())), RC_SETTINGS);
                    return true;
                }
            } else {
                // استثناء التطبيق من توفير البطارية: أقوى ضمان إن الأذان ما يتأخرش ولا يتلغي
                if (Build.VERSION.SDK_INT >= 23 && !AdhanPrefs.asked(this, "batt")) {
                    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                    if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                        AdhanPrefs.setAsked(this, "batt");
                        startActivityForResult(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName())), RC_SETTINGS);
                        return true;
                    }
                }
            }
        } catch (Exception ignored) { }
        return false;
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) { next(); }

    @Override
    protected void onActivityResult(int code, int result, Intent data) { next(); }
}
