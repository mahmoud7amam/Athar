package com.atharqurani.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.Calendar;

/** يضبط منبّه النظام (setAlarmClock) على أقرب صلاة قادمة — بيشتغل في Doze وبعد إعادة التشغيل وبدون نت. */
final class AdhanScheduler {
    static final String ACTION_ALARM = "com.atharqurani.app.ADHAN_ALARM";
    static final String ACTION_STOP = "com.atharqurani.app.ADHAN_STOP";
    static final String ACTION_LOCK_REMINDER = "com.atharqurani.app.ADHAN_LOCK_REMINDER";
    static final String[] NAMES = {"الفجر", "الظهر", "العصر", "المغرب", "العشاء"};

    private static int piFlags() { return PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0); }

    /** أقرب صلاة مفعّلة بعد الوقت ده: {epochMillis, index} أو null */
    static long[] nextAfter(Context c, long after) {
        String all = AdhanPrefs.times(c);
        if (all.length() == 0) return null;
        long bestT = Long.MAX_VALUE; int bestI = -1;
        for (String day : all.split("~")) {
            String[] f = day.split(",");
            if (f.length < 6 || f[0].length() != 8) continue;
            try {
                int y = Integer.parseInt(f[0].substring(0, 4)), m = Integer.parseInt(f[0].substring(4, 6)), d = Integer.parseInt(f[0].substring(6, 8));
                for (int i = 0; i < 5; i++) {
                    if (!(AdhanPrefs.lockOn(c) || (AdhanPrefs.on(c) && AdhanPrefs.flag(c, i))) || f[i + 1].length() != 4) continue;
                    Calendar cal = Calendar.getInstance();
                    cal.set(y, m - 1, d, Integer.parseInt(f[i + 1].substring(0, 2)), Integer.parseInt(f[i + 1].substring(2, 4)), 0);
                    cal.set(Calendar.MILLISECOND, 0);
                    long t = cal.getTimeInMillis();
                    if (t > after && t < bestT) { bestT = t; bestI = i; }
                }
            } catch (NumberFormatException e) { /* سطر تالف: نتجاهله */ }
        }
        if (bestI < 0) return fallbackNext(c, all, after);
        return new long[]{bestT, bestI};
    }

    /** خلصت المواقيت المحفوظة (مفتحتش التطبيق من فترة): نكمل بنفس مواعيد آخر يوم معروف — فرق دقيقة أو اتنين أحسن من سكوت. */
    private static long[] fallbackNext(Context c, String all, long after) {
        String[] days = all.split("~");
        String[] f = days[days.length - 1].split(",");
        if (f.length < 6) return null;
        long bestT = Long.MAX_VALUE; int bestI = -1;
        try {
            for (int off = 0; off < 3; off++) {
                for (int i = 0; i < 5; i++) {
                    if (!(AdhanPrefs.lockOn(c) || (AdhanPrefs.on(c) && AdhanPrefs.flag(c, i))) || f[i + 1].length() != 4) continue;
                    Calendar cal = Calendar.getInstance();
                    cal.setTimeInMillis(after);
                    cal.add(Calendar.DAY_OF_MONTH, off);
                    cal.set(Calendar.HOUR_OF_DAY, Integer.parseInt(f[i + 1].substring(0, 2)));
                    cal.set(Calendar.MINUTE, Integer.parseInt(f[i + 1].substring(2, 4)));
                    cal.set(Calendar.SECOND, 0);
                    cal.set(Calendar.MILLISECOND, 0);
                    long t = cal.getTimeInMillis();
                    if (t > after && t < bestT) { bestT = t; bestI = i; }
                }
            }
        } catch (NumberFormatException e) { return null; }
        return bestI < 0 ? null : new long[]{bestT, bestI};
    }

    static void schedule(Context c) { scheduleAfter(c, System.currentTimeMillis()); }

    private static boolean canScheduleExact(AlarmManager am) {
        return Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
    }

    private static void scheduleInexact(AlarmManager am, long at, PendingIntent operation) {
        try {
            if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation);
            else am.set(AlarmManager.RTC_WAKEUP, at, operation);
        } catch (SecurityException denied) {
            // احتياط أخير: تنبيه عادي غير دقيق، دون تعطيل بقية التطبيق.
            try { am.set(AlarmManager.RTC_WAKEUP, at, operation); } catch (Exception ignored) { }
        }
    }

    /** تأجيل بطاقة التأكيد 15 دقيقة من غير تسجيل الصلاة كمؤكدة. */
    static void scheduleLockReminder(Context c, int idx, long epoch) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent in = new Intent(c, AdhanReceiver.class).setAction(ACTION_LOCK_REMINDER)
                .putExtra("idx", idx).putExtra("epoch", epoch);
        PendingIntent op = PendingIntent.getBroadcast(c, 7010, in, piFlags());
        Intent launch = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        PendingIntent show = PendingIntent.getActivity(c, 7011, launch != null ? launch : new Intent(), piFlags());
        long at = System.currentTimeMillis() + 15 * 60 * 1000L;
        if (canScheduleExact(am)) {
            try { am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), op); }
            catch (SecurityException denied) { scheduleInexact(am, at, op); }
        } else {
            scheduleInexact(am, at, op);
        }
    }

    /** يُلغى التأجيل فور إيقاف المستخدم لميزة تذكير الصلاة. */
    static void cancelLockReminder(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent in = new Intent(c, AdhanReceiver.class).setAction(ACTION_LOCK_REMINDER);
        PendingIntent op = PendingIntent.getBroadcast(c, 7010, in, piFlags());
        am.cancel(op);
        op.cancel();
    }

    static void scheduleAfter(Context c, long after) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        // ألغِ أي جدولة سابقة (بما فيها المنبّه الاحتياطي من الإصدارات السابقة).
        Intent alarmIntent = new Intent(c, AdhanReceiver.class).setAction(ACTION_ALARM);
        PendingIntent oldPrimary = PendingIntent.getBroadcast(c, 7001, alarmIntent, piFlags());
        PendingIntent oldBackup = PendingIntent.getBroadcast(c, 7003, alarmIntent, piFlags());
        am.cancel(oldPrimary);
        am.cancel(oldBackup);

        long[] next = (AdhanPrefs.on(c) || AdhanPrefs.lockOn(c)) ? nextAfter(c, after) : null;
        if (next == null) return;

        Intent nextIntent = new Intent(c, AdhanReceiver.class).setAction(ACTION_ALARM)
                .putExtra("idx", (int) next[1]).putExtra("epoch", next[0]);
        PendingIntent operation = PendingIntent.getBroadcast(c, 7001, nextIntent, piFlags());
        Intent launch = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        PendingIntent show = PendingIntent.getActivity(c, 7002,
                launch != null ? launch : new Intent(), piFlags());

        // منبّه واحد فقط: setAlarmClock دقيق عند السماح، وإلا نستخدم تنبيهًا مرنًا
        // حتى لا يتعطل التطبيق أو يتوقف الأذان نهائيًا عند رفض الإذن الخاص.
        if (canScheduleExact(am)) {
            try {
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(next[0], show), operation);
                return;
            } catch (SecurityException denied) {
                // ننتقل أدناه إلى الجدولة المرنة.
            }
        }
        scheduleInexact(am, next[0], operation);
    }
}
