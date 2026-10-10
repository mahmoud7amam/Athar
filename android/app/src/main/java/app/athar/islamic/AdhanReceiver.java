package app.athar.islamic;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** بيصحى لما المنبّه يرن: يشغّل خدمة الأذان ويضبط الأذان اللي بعده. */
public class AdhanReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (intent == null || !AdhanScheduler.ACTION_ALARM.equals(intent.getAction())) return;
        long t = intent.getLongExtra("t", 0);
        AdhanScheduler.markFired(ctx, t);

        Intent s = new Intent(ctx, AdhanService.class).setAction(AdhanService.ACTION_PLAY)
                .putExtra("k", intent.getStringExtra("k"))
                .putExtra("n", intent.getStringExtra("n"))
                .putExtra("c", intent.getStringExtra("c"))
                .putExtra("t", t);
        try {
            ctx.startForegroundService(s);
        } catch (Exception e) {
            // لو النظام منع بدء الخدمة: نظهر إشعار الأذان على الأقل
            AdhanService.postFallbackNotification(ctx, intent.getStringExtra("n"), intent.getStringExtra("c"));
        }
        AdhanScheduler.scheduleNext(ctx);
    }
}
