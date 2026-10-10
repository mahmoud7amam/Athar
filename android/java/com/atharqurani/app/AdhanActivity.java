package com.atharqurani.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** شاشة الأذان: «صلاة كذا الآن» فوق شاشة القفل مع زر إيقاف. */
public class AdhanActivity extends Activity {
    private static final int GOLD = Color.parseColor("#D4AF37"), GOLD_L = Color.parseColor("#F9E076");
    private Button stop;
    private TextView phrase, dua;
    private boolean ended = false;
    private final BroadcastReceiver endedRx = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { markEnded(); }
    };

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        int idx = Math.max(0, Math.min(4, getIntent().getIntExtra("idx", 1)));
        long epoch = getIntent().getLongExtra("epoch", 0);
        String name = AdhanScheduler.NAMES[idx], city = AdhanPrefs.city(this);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(24), dp(24), dp(24), dp(24));
        root.setBackgroundColor(Color.parseColor("#0B0A07"));
        if (Build.VERSION.SDK_INT >= 17) root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        TextView icon = new TextView(this);
        icon.setText("🕌");
        icon.setTextSize(64);
        icon.setGravity(Gravity.CENTER);
        root.addView(icon);

        TextView title = text("صلاة " + name + " الآن", 34, GOLD_L, true);
        title.setPadding(0, dp(14), 0, dp(6));
        root.addView(title);
        root.addView(text("حسب توقيت " + (city.length() > 0 ? city : "مدينتك") + (epoch > 0 ? " • " + AdhanService.clock(epoch) : ""), 15, Color.parseColor("#CBBF9A"), false));

        phrase = text(idx == 0 ? "الصلاة خير من النوم" : "حيّ على الصلاة، حيّ على الفلاح", 22, Color.parseColor("#F6EFD9"), false);
        phrase.setPadding(0, dp(28), 0, dp(6));
        root.addView(phrase);
        dua = text("اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ", 19, Color.parseColor("#F6EFD9"), false);
        dua.setVisibility(View.GONE);
        dua.setPadding(dp(8), dp(24), dp(8), 0);
        root.addView(dua);

        stop = new Button(this);
        stop.setText("إيقاف الأذان");
        stop.setTextSize(17);
        stop.setTextColor(Color.parseColor("#1A1405"));
        stop.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable g = new GradientDrawable();
        g.setColor(GOLD);
        g.setCornerRadius(dp(16));
        stop.setBackground(g);
        stop.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                if (ended) finish(); else { stopService(new Intent(AdhanActivity.this, AdhanService.class)); markEnded(); }
            }
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56));
        lp.topMargin = dp(36);
        root.addView(stop, lp);

        Button open = new Button(this);
        open.setText("فتح التطبيق");
        open.setTextColor(GOLD_L);
        GradientDrawable g2 = new GradientDrawable();
        g2.setColor(Color.TRANSPARENT);
        g2.setStroke(dp(1), GOLD);
        g2.setCornerRadius(dp(16));
        open.setBackground(g2);
        open.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                Intent l = getPackageManager().getLaunchIntentForPackage(getPackageName());
                if (l != null) startActivity(l);
                finish();
            }
        });
        LinearLayout.LayoutParams lp2 = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(50));
        lp2.topMargin = dp(12);
        root.addView(open, lp2);
        setContentView(root);

        IntentFilter f = new IntentFilter(AdhanService.ACTION_ENDED);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(endedRx, f, Context.RECEIVER_NOT_EXPORTED); else registerReceiver(endedRx, f);
    }

    private void markEnded() {
        ended = true;
        stop.setText("إغلاق");
        phrase.setVisibility(View.GONE);
        dua.setVisibility(View.VISIBLE);
    }

    private TextView text(String s, int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private int dp(int v) { return (int) (v * getResources().getDisplayMetrics().density + 0.5f); }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(endedRx); } catch (Exception ignored) { }
        super.onDestroy();
    }
}
