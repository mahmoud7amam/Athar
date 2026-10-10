package app.athar.islamic;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;

/** قنوات الإشعارات (أذان بدون صوت من القناة لأن الصوت بيشغّله MediaPlayer، وقناة عامة). */
final class Notifs {
    static final String CH_ADHAN = "athar_adhan";
    static final String CH_GENERAL = "athar_general";

    private Notifs() {}

    static void ensureChannels(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel a = new NotificationChannel(CH_ADHAN, "الأذان", NotificationManager.IMPORTANCE_HIGH);
        a.setDescription("إشعار وشاشة الأذان في مواعيد الصلاة");
        a.setSound(null, null);
        a.enableVibration(false);
        a.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(a);

        NotificationChannel g = new NotificationChannel(CH_GENERAL, "تنبيهات أَثَر", NotificationManager.IMPORTANCE_DEFAULT);
        g.setDescription("الأذكار وتنبيهات التطبيق");
        nm.createNotificationChannel(g);
    }
}
