package com.atharqurani.app;

import android.content.Context;
import android.content.SharedPreferences;

/** إعدادات الأذان المحفوظة محلياً (بتيجي من الصفحة عبر SyncActivity) — بتفضل شغالة بدون نت. */
final class AdhanPrefs {
    private static SharedPreferences sp(Context c) { return c.getSharedPreferences("athar_adhan", Context.MODE_PRIVATE); }

    static boolean on(Context c) { return sp(c).getBoolean("on", true); }
    static String flags(Context c) { return sp(c).getString("flags", "11111"); }
    static int vol(Context c) { return sp(c).getInt("vol", 90); }
    static String city(Context c) { return sp(c).getString("city", ""); }
    static String times(Context c) { return sp(c).getString("times", ""); }
    static boolean flag(Context c, int idx) { String f = flags(c); return idx >= f.length() || f.charAt(idx) != '0'; }

    static void save(Context c, boolean on, String flags, int vol, String city, String times) {
        SharedPreferences.Editor e = sp(c).edit();
        e.putBoolean("on", on).putString("flags", flags).putInt("vol", vol).putString("city", city);
        if (times != null && times.length() > 0) e.putString("times", times);
        e.apply();
    }
    static long lastPlayed(Context c) { return sp(c).getLong("last_played", 0L); }
    static void setLastPlayed(Context c, long t) { sp(c).edit().putLong("last_played", t).apply(); }
    /* ---------- تذكير الصلاة الاختياري ---------- */
    static final long LOCK_MAX_MS = 90 * 60 * 1000L;   // تنتهي صلاحية التذكير تلقائيًا بعد 90 دقيقة
    static boolean lockOn(Context c) { return sp(c).getBoolean("lock", false); }
    static void setLockOn(Context c, boolean v) { sp(c).edit().putBoolean("lock", v).apply(); }
    static void setLockPending(Context c, int idx, long epoch) {
        sp(c).edit().putInt("lock_idx", idx).putLong("lock_epoch", epoch).putLong("lock_t", System.currentTimeMillis()).apply();
    }
    static boolean lockPending(Context c) {
        long t = sp(c).getLong("lock_t", 0L);
        return t > 0 && System.currentTimeMillis() - t < LOCK_MAX_MS;
    }
    static int lockIdx(Context c) { return sp(c).getInt("lock_idx", -1); }
    static long lockEpoch(Context c) { return sp(c).getLong("lock_epoch", -1L); }
    static void clearLock(Context c) { sp(c).edit().remove("lock_t").remove("lock_idx").remove("lock_epoch").apply(); }
    static void recordVoiceConfirmation(Context c, int idx, long epoch) {
        long at = epoch > 0 ? epoch : System.currentTimeMillis();
        String day = new java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.US).format(new java.util.Date(at));
        sp(c).edit().putLong("voice_confirm_" + day + "_" + idx, System.currentTimeMillis()).apply();
    }
    static boolean recordManualConfirmation(Context c, int idx, long at) {
        String day = new java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.US).format(new java.util.Date(at));
        String key = "manual_confirm_" + day + "_" + idx;
        if (sp(c).contains(key)) return false;
        sp(c).edit().putLong(key, at).apply();
        return true;
    }
    static boolean hasManualConfirmation(Context c, int idx, long at) {
        String day = new java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.US).format(new java.util.Date(at));
        return sp(c).contains("manual_confirm_" + day + "_" + idx);
    }
    static void clearAsked(Context c, String k) { sp(c).edit().remove("asked_" + k).apply(); }

    static boolean asked(Context c, String k) { return sp(c).getBoolean("asked_" + k, false); }
    static void resetAsked(Context c) { sp(c).edit().remove("asked_notif").remove("asked_fsi").remove("asked_overlay").remove("asked_batt").remove("asked_mic").apply(); }
    static void setAsked(Context c, String k) { sp(c).edit().putBoolean("asked_" + k, true).apply(); }
}
