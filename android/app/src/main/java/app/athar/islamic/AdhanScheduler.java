package app.athar.islamic;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * جدول الأذان: التطبيق (الويب) بيبعت قائمة بالمواعيد الجاية، واحنا بنحفظها وبنظبط منبّه واحد بس للأذان اللي بعده.
 * المنبّه بيتضبط بـ setAlarmClock فبيشتغل حتى في وضع توفير الطاقة (Doze) والتطبيق مقفول.
 * بعد كل أذان بنضبط اللي بعده، وبعد إعادة تشغيل الموبايل BootReceiver بيرجّع الضبط.
 */
final class AdhanScheduler {
    static final String PREFS = "athar_adhan";
    static final String KEY_SCHEDULE = "schedule";
    static final String KEY_LAST = "last_fired";
    static final String ACTION_ALARM = "app.athar.islamic.ADHAN_ALARM";
    private static final int REQ_ALARM = 7001, REQ_SHOW = 7002;
    private static final long GRACE_MS = 60_000L;      // أذان فاتنا بأقل من دقيقة (مثلاً بعد إعادة تشغيل) لسه بيتشغّل

    private AdhanScheduler() {}

    private static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    /** يحفظ الجدول الجديد (JSON array من {t,k,n,c}) ويضبط المنبّه التالي. */
    static void save(Context c, String json) {
        try {
            JSONArray in = new JSONArray(json == null ? "[]" : json);
            JSONArray out = new JSONArray();
            long now = System.currentTimeMillis();
            for (int i = 0; i < in.length() && out.length() < 250; i++) {
                JSONObject o = in.getJSONObject(i);
                if (o.optLong("t", 0) > now - GRACE_MS) out.put(o);
            }
            prefs(c).edit().putString(KEY_SCHEDULE, out.toString()).apply();
        } catch (Exception e) {
            return;                                   // JSON وحش: نسيب الجدول القديم زي ما هو
        }
        scheduleNext(c);
    }

    /** أقرب أذان لسه ما اتشغّلش. */
    static JSONObject nextEntry(Context c) {
        try {
            JSONArray a = new JSONArray(prefs(c).getString(KEY_SCHEDULE, "[]"));
            long now = System.currentTimeMillis(), last = prefs(c).getLong(KEY_LAST, 0);
            JSONObject best = null;
            long bestT = Long.MAX_VALUE;
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                long t = o.optLong("t", 0);
                if (t <= last || t <= now - GRACE_MS) continue;
                if (t < bestT) { bestT = t; best = o; }
            }
            return best;
        } catch (Exception e) {
            return null;
        }
    }

    static void scheduleNext(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent base = new Intent(c, AdhanReceiver.class).setAction(ACTION_ALARM);
        PendingIntent old = PendingIntent.getBroadcast(c, REQ_ALARM, base, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (old != null) { am.cancel(old); old.cancel(); }

        JSONObject next = nextEntry(c);
        if (next == null) return;

        long t = next.optLong("t", 0);
        Intent i = new Intent(c, AdhanReceiver.class).setAction(ACTION_ALARM)
                .putExtra("t", t)
                .putExtra("k", next.optString("k"))
                .putExtra("n", next.optString("n"))
                .putExtra("c", next.optString("c"));
        PendingIntent pi = PendingIntent.getBroadcast(c, REQ_ALARM, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent open = new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent showPi = PendingIntent.getActivity(c, REQ_SHOW, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        long trigger = Math.max(t, System.currentTimeMillis() + 800);
        am.setAlarmClock(new AlarmManager.AlarmClockInfo(trigger, showPi), pi);
    }

    static void markFired(Context c, long t) {
        if (t > 0) prefs(c).edit().putLong(KEY_LAST, t).apply();
    }
}
