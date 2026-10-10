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
import android.provider.Settings;

/**
 * جسر الويب ← الأصلي. الصفحة بتفتح رابط intent://... فيوصل هنا:
 *   athar-adhan://sync?on=1&p=11111&v=90&c=القاهرة&t=مواقيت   → حفظ + ضبط المنبّهات
 *   athar-adhan://test?i=1                                    → تجربة الأذان فوراً
 *   athar-adhan://stop                                        → إيقاف الأذان
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
            }
        } catch (Exception ignored) { }
        askPermissions();
    }

    private static String nz(String s) { return s == null ? "" : s; }

    /** إذن الإشعارات (أندرويد 13+) ثم إذن الشاشة الكاملة (أندرويد 14+) — مرة واحدة بس. */
    private void askPermissions() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                && !AdhanPrefs.asked(this, "notif")) {
            AdhanPrefs.setAsked(this, "notif");
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 11);
            return;
        }
        fullScreenThenFinish();
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) { fullScreenThenFinish(); }

    private void fullScreenThenFinish() {
        if (Build.VERSION.SDK_INT >= 34 && !AdhanPrefs.asked(this, "fsi")) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && !nm.canUseFullScreenIntent()) {
                AdhanPrefs.setAsked(this, "fsi");
                try {
                    startActivity(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + getPackageName())));
                } catch (Exception ignored) { }
            }
        }
        finish();
        overridePendingTransition(0, 0);
    }
}
