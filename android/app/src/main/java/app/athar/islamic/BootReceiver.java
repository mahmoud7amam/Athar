package app.athar.islamic;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** بعد إعادة تشغيل الموبايل / تحديث التطبيق / تغيير الوقت أو المنطقة الزمنية: نرجّع ضبط منبّه الأذان. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        AdhanScheduler.scheduleNext(ctx);
    }
}
