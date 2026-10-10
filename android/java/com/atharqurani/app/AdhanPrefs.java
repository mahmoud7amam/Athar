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
    static boolean asked(Context c, String k) { return sp(c).getBoolean("asked_" + k, false); }
    static void setAsked(Context c, String k) { sp(c).edit().putBoolean("asked_" + k, true).apply(); }
}
