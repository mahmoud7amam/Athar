package app.athar.islamic;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.graphics.drawable.Icon;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;

/**
 * خدمة الأذان (Foreground): بتشغّل ملف الأذان بـ MediaPlayer على قناة المنبّه، وبتعرض إشعار فيه زر "إيقاف"
 * وشاشة الأذان (AdhanActivity) فوق شاشة القفل.
 */
public class AdhanService extends Service {
    static final String ACTION_PLAY = "app.athar.islamic.ADHAN_PLAY";
    static final String ACTION_STOP = "app.athar.islamic.ADHAN_STOP";
    static final String ACTION_STOPPED = "app.athar.islamic.ADHAN_STOPPED";   // broadcast داخلي: الأذان خلص/اتوقف
    static final int NOTIF_ID = 4101;
    static volatile boolean running = false;

    private MediaPlayer mp;
    private AudioManager am;
    private AudioFocusRequest focusReq;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();

        if (ACTION_STOP.equals(action)) {
            stopAdhan();
            return START_NOT_STICKY;
        }

        boolean test = intent != null && intent.getBooleanExtra("test", false);
        String name = intent == null ? "" : intent.getStringExtra("n");
        String city = intent == null ? "" : intent.getStringExtra("c");

        Notifs.ensureChannels(this);
        Notification n = buildNotification(name, city, test);
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            else startForeground(NOTIF_ID, n);
        } catch (Exception e) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (running) return START_NOT_STICKY;      // أذان شغّال بالفعل
        running = true;

        // لو التطبيق مفتوح قدامك: افتح شاشة الأذان على طول
        if (MainActivity.foreground) {
            try { startActivity(activityIntent(name, city, test)); } catch (Exception ignored) {}
        }

        if (!startPlayback()) stopAdhan();
        return START_NOT_STICKY;
    }

    private Intent activityIntent(String name, String city, boolean test) {
        return new Intent(this, AdhanActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION)
                .putExtra("n", name == null ? "" : name)
                .putExtra("c", city == null ? "" : city)
                .putExtra("test", test);
    }

    private Notification buildNotification(String name, String city, boolean test) {
        PendingIntent screen = PendingIntent.getActivity(this, 11, activityIntent(name, city, test),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 12,
                new Intent(this, AdhanService.class).setAction(ACTION_STOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String title = test ? "تجربة الأذان" : ("حان الآن موعد أذان " + (name == null ? "" : name));
        String text = (city == null || city.isEmpty()) ? "الله أكبر الله أكبر" : ("الله أكبر الله أكبر • حسب توقيت " + city);

        Notification.Builder b = new Notification.Builder(this, Notifs.CH_ADHAN)
                .setSmallIcon(R.drawable.ic_stat_adhan)
                .setContentTitle(title)
                .setContentText(text)
                .setCategory(Notification.CATEGORY_ALARM)
                .setPriority(Notification.PRIORITY_MAX)
                .setOngoing(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(screen)
                .setFullScreenIntent(screen, true)
                .addAction(new Notification.Action.Builder(Icon.createWithResource(this, R.drawable.ic_stat_stop), "إيقاف", stop).build());
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }

    private boolean startPlayback() {
        try {
            am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            if (am != null) {
                focusReq = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                        .setAudioAttributes(attrs)
                        .setOnAudioFocusChangeListener(change -> { })
                        .build();
                am.requestAudioFocus(focusReq);
            }

            mp = new MediaPlayer();
            mp.setAudioAttributes(attrs);
            AssetFileDescriptor afd = getResources().openRawResourceFd(R.raw.adhan);
            mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            mp.setWakeMode(this, android.os.PowerManager.PARTIAL_WAKE_LOCK);
            mp.setVolume(1f, 1f);
            mp.setOnCompletionListener(player -> stopAdhan());
            mp.setOnErrorListener((player, what, extra) -> { stopAdhan(); return true; });
            mp.prepare();
            mp.start();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void stopAdhan() {
        try { if (mp != null) { if (mp.isPlaying()) mp.stop(); mp.release(); } } catch (Exception ignored) {}
        mp = null;
        try { if (am != null && focusReq != null) am.abandonAudioFocusRequest(focusReq); } catch (Exception ignored) {}
        running = false;
        try { stopForeground(Service.STOP_FOREGROUND_REMOVE); } catch (Exception ignored) {}
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(NOTIF_ID);
        } catch (Exception ignored) {}
        sendBroadcast(new Intent(ACTION_STOPPED).setPackage(getPackageName()));
        stopSelf();
    }

    @Override
    public void onDestroy() {
        try { if (mp != null) mp.release(); } catch (Exception ignored) {}
        mp = null;
        running = false;
        super.onDestroy();
    }

    /** احتياطي: لو النظام منع تشغيل الخدمة، نعرض إشعار الأذان بدون صوت على الأقل. */
    static void postFallbackNotification(Context c, String name, String city) {
        try {
            Notifs.ensureChannels(c);
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            Intent open = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(c, 13, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification n = new Notification.Builder(c, Notifs.CH_ADHAN)
                    .setSmallIcon(R.drawable.ic_stat_adhan)
                    .setContentTitle("حان الآن موعد أذان " + (name == null ? "" : name))
                    .setContentText("الله أكبر الله أكبر")
                    .setCategory(Notification.CATEGORY_ALARM)
                    .setAutoCancel(true)
                    .setContentIntent(pi)
                    .build();
            if (nm != null) nm.notify(NOTIF_ID + 1, n);
        } catch (Exception ignored) {}
    }
}
