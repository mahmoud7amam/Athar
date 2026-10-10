package com.atharqurani.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** خدمة أمامية: تشغّل الأذان من ملف داخل التطبيق (بدون نت) وتعرض إشعار + شاشة الأذان. */
public class AdhanService extends Service {
    static final String CHANNEL = "athar_adhan";
    static final String ACTION_ENDED = "com.atharqurani.app.ADHAN_ENDED";
    static final int NOTIF_ID = 4101;

    private MediaPlayer mp;
    private PowerManager.WakeLock wl;
    private final Handler h = new Handler(Looper.getMainLooper());
    private AudioManager am;

    /** تشغيل الأذان لصلاة رقم idx (0..4) */
    static void begin(Context c, int idx, long epoch) {
        Intent s = new Intent(c, AdhanService.class).putExtra("idx", idx).putExtra("epoch", epoch);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);
        } catch (Exception e) {
            // لو النظام منع الخدمة: على الأقل إشعار بصوت النظام
            try { ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(NOTIF_ID, build(c, idx, epoch, true)); } catch (Exception ignored) { }
        }
    }

    private static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "الأذان ومواقيت الصلاة", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("تنبيه دخول وقت الصلاة وصوت الأذان");
        ch.setSound(null, null);
        ch.enableVibration(true);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    static Notification build(Context c, int idx, long epoch, boolean withSound) {
        ensureChannel(c);
        String name = AdhanScheduler.NAMES[Math.max(0, Math.min(4, idx))];
        String city = AdhanPrefs.city(c);
        int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        Intent ui = new Intent(c, AdhanActivity.class).putExtra("idx", idx).putExtra("epoch", epoch)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent uiPi = PendingIntent.getActivity(c, 7100 + idx, ui, pf);
        PendingIntent stopPi = PendingIntent.getBroadcast(c, 7200, new Intent(c, AdhanReceiver.class).setAction(AdhanScheduler.ACTION_STOP), pf);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
        b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("🕌 صلاة " + name + " الآن")
                .setContentText("حان الآن موعد صلاة " + name + (city.length() > 0 ? " حسب توقيت " + city : ""))
                .setContentIntent(uiPi)
                .setFullScreenIntent(uiPi, true)
                .setCategory(Notification.CATEGORY_ALARM)
                .setOngoing(!withSound)
                .setAutoCancel(withSound)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setWhen(epoch > 0 ? epoch : System.currentTimeMillis())
                .addAction(android.R.drawable.ic_media_pause, "إيقاف الأذان", stopPi);
        if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_MAX);
        if (withSound && Build.VERSION.SDK_INT < 26) b.setDefaults(Notification.DEFAULT_ALL);
        return b.build();
    }

    @Override
    public int onStartCommand(Intent in, int flags, int startId) {
        int idx = in == null ? 1 : in.getIntExtra("idx", 1);
        long epoch = in == null ? 0 : in.getLongExtra("epoch", 0);
        Notification n = build(this, idx, epoch, false);
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIF_ID, n);
        stopPlayback();
        play();
        // شاشة الأذان تظهر عن طريق fullScreenIntent (فوق القفل) أو الضغط على الإشعار
        h.removeCallbacksAndMessages(null);
        h.postDelayed(new Runnable() { @Override public void run() { stopSelf(); } }, 5 * 60 * 1000L + 30000L);
        return START_NOT_STICKY;
    }

    private void play() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) { wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "athar:adhan"); wl.acquire(6 * 60 * 1000L); }
        } catch (Exception ignored) { }
        try {
            am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            try { // لو صوت المنبّه صفر، نرفعه عشان الأذان يتسمع
                int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                if (am.getStreamVolume(AudioManager.STREAM_ALARM) < Math.max(1, max / 2)) am.setStreamVolume(AudioManager.STREAM_ALARM, Math.max(1, (int) (max * 0.6)), 0);
            } catch (Exception ignored) { }
            am.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            AssetFileDescriptor afd = getResources().openRawResourceFd(R.raw.adhan);
            mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            float v = Math.max(0.05f, Math.min(1f, AdhanPrefs.vol(this) / 100f));
            mp.setVolume(v, v);
            mp.setOnCompletionListener(new MediaPlayer.OnCompletionListener() { @Override public void onCompletion(MediaPlayer m) { stopSelf(); } });
            mp.setOnErrorListener(new MediaPlayer.OnErrorListener() { @Override public boolean onError(MediaPlayer m, int w, int e) { stopSelf(); return true; } });
            mp.prepare();
            mp.start();
        } catch (Exception e) {
            stopSelf();
        }
    }

    private void stopPlayback() {
        if (mp != null) { try { mp.stop(); } catch (Exception ignored) { } try { mp.release(); } catch (Exception ignored) { } mp = null; }
    }

    @Override
    public void onDestroy() {
        h.removeCallbacksAndMessages(null);
        stopPlayback();
        try { if (am != null) am.abandonAudioFocus(null); } catch (Exception ignored) { }
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception ignored) { }
        stopForeground(true);
        sendBroadcast(new Intent(ACTION_ENDED).setPackage(getPackageName()));
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent i) { return null; }

    static String clock(long epoch) { return new SimpleDateFormat("h:mm a", new Locale("ar")).format(new Date(epoch)); }
}
