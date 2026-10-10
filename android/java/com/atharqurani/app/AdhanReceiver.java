package com.atharqurani.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** بيصحى وقت الأذان: يشغّل خدمة الأذان، وبعدين يضبط المنبّه اللي بعده. */
public class AdhanReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (AdhanScheduler.ACTION_STOP.equals(a)) {
            c.stopService(new Intent(c, AdhanService.class));
            return;
        }
        if (!AdhanScheduler.ACTION_ALARM.equals(a)) return;
        int idx = i.getIntExtra("idx", 1);
        long epoch = i.getLongExtra("epoch", 0);
        long now = System.currentTimeMillis();
        // لو الجهاز كان مطفي وقت الأذان وعدّى أكتر من 10 دقايق، ما نشغّلش أذان متأخر
        if (AdhanPrefs.on(c) && now - epoch < 10 * 60 * 1000L) AdhanService.begin(c, idx, epoch);
        AdhanScheduler.scheduleAfter(c, Math.max(epoch, now));
    }
}
