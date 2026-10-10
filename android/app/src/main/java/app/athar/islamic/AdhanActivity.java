package app.athar.islamic;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextClock;
import android.widget.TextView;

/** شاشة الأذان: بتظهر فوق شاشة القفل وفيها زر "إيقاف الأذان". */
public class AdhanActivity extends Activity {
    private static final int GOLD = 0xFFD4AF37, GOLD_LIGHT = 0xFFF3D977, MUTED = 0xFFB9B29C;
    private TextView title, sub;

    private final BroadcastReceiver stoppedReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) { finish(); }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON);

        if (!AdhanService.running) { finish(); return; }     // الأذان خلص قبل ما الشاشة تفتح

        setContentView(buildUi());
        apply(getIntent());

        IntentFilter f = new IntentFilter(AdhanService.ACTION_STOPPED);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(stoppedReceiver, f, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(stoppedReceiver, f);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (title != null) apply(intent);
    }

    private void apply(Intent i) {
        boolean test = i.getBooleanExtra("test", false);
        String n = i.getStringExtra("n"), c = i.getStringExtra("c");
        title.setText(test ? "تجربة الأذان" : ("حان الآن موعد أذان " + (n == null ? "" : n)));
        sub.setText(test ? "ده أذان تجريبي" : ((c == null || c.isEmpty()) ? "" : ("حسب توقيت " + c)));
    }

    private int dp(int v) { return (int) (v * getResources().getDisplayMetrics().density + 0.5f); }

    private TextView text(String s, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private View buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setPadding(dp(24), dp(24), dp(24), dp(24));
        root.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xFF2A2108, 0xFF0C0B09, 0xFF000000}));

        ImageView moon = new ImageView(this);
        moon.setImageResource(R.drawable.ic_stat_adhan);
        moon.setColorFilter(GOLD);
        root.addView(moon, new LinearLayout.LayoutParams(dp(90), dp(90)));

        TextView akbar = text("اللهُ أكبرُ اللهُ أكبرُ", 36, GOLD_LIGHT, true);
        akbar.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        LinearLayout.LayoutParams ap = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        ap.topMargin = dp(14);
        root.addView(akbar, ap);

        title = text("", 21, Color.WHITE, true);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tp.topMargin = dp(10);
        root.addView(title, tp);

        sub = text("", 14, MUTED, false);
        root.addView(sub, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextClock clock = new TextClock(this);
        clock.setFormat12Hour("h:mm a");
        clock.setFormat24Hour("h:mm a");
        clock.setTextSize(38);
        clock.setTextColor(GOLD);
        clock.setTypeface(Typeface.DEFAULT_BOLD);
        clock.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        cp.topMargin = dp(8);
        root.addView(clock, cp);

        Button stop = new Button(this);
        stop.setText("إيقاف الأذان");
        stop.setAllCaps(false);
        stop.setTextSize(20);
        stop.setTypeface(Typeface.DEFAULT_BOLD);
        stop.setTextColor(Color.BLACK);
        GradientDrawable sbg = new GradientDrawable();
        sbg.setColor(GOLD);
        sbg.setCornerRadius(dp(20));
        stop.setBackground(sbg);
        stop.setOnClickListener(v -> {
            try { startService(new Intent(this, AdhanService.class).setAction(AdhanService.ACTION_STOP)); } catch (Exception ignored) {}
            finish();
        });
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(dp(300), dp(62));
        sp.topMargin = dp(30);
        root.addView(stop, sp);

        TextView open = text("فتح التطبيق", 14, GOLD, true);
        open.setPaintFlags(open.getPaintFlags() | Paint.UNDERLINE_TEXT_FLAG);
        open.setPadding(dp(16), dp(10), dp(16), dp(10));
        open.setOnClickListener(v -> {
            startActivity(new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
            finish();
        });
        LinearLayout.LayoutParams op = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        op.topMargin = dp(14);
        root.addView(open, op);

        TextView dua = text("اللهم رب هذه الدعوة التامة والصلاة القائمة، آتِ محمداً الوسيلة والفضيلة", 13, 0xFF9A9484, false);
        LinearLayout.LayoutParams dp2 = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        dp2.topMargin = dp(18);
        root.addView(dua, dp2);

        return root;
    }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(stoppedReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
