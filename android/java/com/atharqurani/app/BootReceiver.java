package com.atharqurani.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** بعد إعادة التشغيل / تحديث التطبيق / تغيير الوقت: نعيد ضبط منبّه الأذان. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) { AdhanScheduler.schedule(c); }
}
