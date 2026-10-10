package app.athar.islamic;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

import java.util.concurrent.atomic.AtomicInteger;

/** الجسر بين صفحة الويب (window.AtharNative) والتطبيق الأصلي. */
class AtharBridge {
    private final Activity activity;
    private final Context app;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private static final AtomicInteger NOTIF_SEQ = new AtomicInteger(2000);

    AtharBridge(Activity activity) {
        this.activity = activity;
        this.app = activity.getApplicationContext();
    }

    @JavascriptInterface
    public void setAdhanSchedule(String json) {
        AdhanScheduler.save(app, json);
    }

    @JavascriptInterface
    public void testAdhan() {
        try {
            app.startForegroundService(new Intent(app, AdhanService.class).setAction(AdhanService.ACTION_PLAY)
                    .putExtra("test", true).putExtra("n", "").putExtra("c", ""));
        } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public void stopAdhan() {
        try { app.startService(new Intent(app, AdhanService.class).setAction(AdhanService.ACTION_STOP)); } catch (Exception ignored) {}
    }

    private boolean notifGranted() {
        NotificationManager nm = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean runtime = Build.VERSION.SDK_INT < 33 || app.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        return runtime && nm != null && nm.areNotificationsEnabled();
    }

    private boolean fsiGranted() {
        if (Build.VERSION.SDK_INT < 34) return true;
        NotificationManager nm = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
        return nm != null && nm.canUseFullScreenIntent();
    }

    private boolean batteryOk() {
        PowerManager pm = (PowerManager) app.getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(app.getPackageName());
    }

    @JavascriptInterface
    public String adhanStatus() {
        return "{\"notif\":" + notifGranted() + ",\"fsi\":" + fsiGranted() + ",\"battery\":" + batteryOk() + "}";
    }

    /** بيطلب أول صلاحية ناقصة (إشعارات ← شاشة الأذان ← توفير البطارية). بيتنادى تاني لحد ما تكمل. */
    @JavascriptInterface
    public void requestAdhanPermissions() {
        ui.post(() -> {
            try {
                Uri pkg = Uri.parse("package:" + app.getPackageName());
                SharedPreferences sp = app.getSharedPreferences(AdhanScheduler.PREFS, Context.MODE_PRIVATE);
                if (!notifGranted()) {
                    boolean runtimeMissing = Build.VERSION.SDK_INT >= 33 && app.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED;
                    if (runtimeMissing && !sp.getBoolean("asked_notif", false)) {
                        sp.edit().putBoolean("asked_notif", true).apply();
                        activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 100);
                    } else {
                        activity.startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, app.getPackageName()));
                    }
                } else if (!fsiGranted()) {
                    activity.startActivity(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg));
                } else if (!batteryOk()) {
                    activity.startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg));
                }
            } catch (Exception e) {
                try { activity.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + app.getPackageName()))); } catch (Exception ignored) {}
            }
        });
    }

    /** إشعار عادي من الويب (الأذكار وغيرها). */
    @JavascriptInterface
    public void notify(String title, String body) {
        try {
            if (!notifGranted()) return;
            Notifs.ensureChannels(app);
            NotificationManager nm = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
            Intent open = new Intent(app, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(app, 14, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification n = new Notification.Builder(app, Notifs.CH_GENERAL)
                    .setSmallIcon(R.drawable.ic_stat_adhan)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new Notification.BigTextStyle().bigText(body))
                    .setAutoCancel(true)
                    .setContentIntent(pi)
                    .build();
            if (nm != null) nm.notify(NOTIF_SEQ.incrementAndGet(), n);
        } catch (Exception ignored) {}
    }
}
