package com.atharqurani.app;

import android.animation.Animator;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.PaintDrawable;
import android.graphics.drawable.ShapeDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * شاشة الأذان الأصلية (فوق شاشة القفل): نفس تصميم شاشة الويب بالظبط —
 * خلفية ذهبية متدرجة، دايرة ذهبية بأيقونة مسجد وحلقات بتنبض أثناء الأذان، خط أميري، وزرّين (إيقاف الأذان + إغلاق).
 */
public class AdhanActivity extends Activity {
    private static final int GOLD = Color.parseColor("#D4AF37"), GOLD_L = Color.parseColor("#F9E076");
    private static final int TEXT = Color.parseColor("#F6EFD9"), MUTED = Color.parseColor("#CBBF9A");
    private static final int DARK = Color.parseColor("#1A1405");

    private Typeface amiri, amiriQuran, sans;
    private PulseIcon pulse;
    private PillButton stop;
    private TextView phrase, dua;
    private View card;
    private boolean ended = false;
    private AnimatorSet intro;
    private int idx;
    private long epoch;

    private final BroadcastReceiver endedRx = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { markEnded(); }
    };

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }

        idx = Math.max(0, Math.min(4, getIntent().getIntExtra("idx", 1)));
        epoch = getIntent().getLongExtra("epoch", 0);
        String name = AdhanScheduler.NAMES[idx], city = AdhanPrefs.city(this);

        loadFonts();

        // الخلفية: نفس radial-gradient بتاع الويب (دهب خفيف من فوق ← أسود)
        FrameLayout root = new FrameLayout(this);
        root.setBackground(new BgDrawable());
        if (Build.VERSION.SDK_INT >= 17) root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER_HORIZONTAL);
        card = col;

        pulse = new PulseIcon(this);
        col.addView(pulse, new LinearLayout.LayoutParams(dp(224), dp(224)));

        TextView title = text("صلاة " + name + " الآن", 38, GOLD_L, amiri, true);
        title.setShadowLayer(dp(11), 0, 0, Color.argb(115, 212, 175, 55));
        title.setLineSpacing(0, 1.15f);
        LinearLayout.LayoutParams tp = wrap();
        tp.topMargin = dp(2);
        col.addView(title, tp);

        TextView sub = text("حسب توقيت " + (city.length() > 0 ? city : "مدينتك") + (epoch > 0 ? " • " + AdhanService.clock(epoch) : ""), 14, MUTED, sans, true);
        LinearLayout.LayoutParams sp = wrap();
        sp.topMargin = dp(6);
        col.addView(sub, sp);

        phrase = text(idx == 0 ? "الصلاة خير من النوم" : "حيّ على الصلاة، حيّ على الفلاح", 22, TEXT, amiri, false);
        LinearLayout.LayoutParams pp = wrap();
        pp.topMargin = dp(24);
        col.addView(phrase, pp);

        dua = text("اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ", 19, TEXT, amiriQuran, false);
        dua.setLineSpacing(0, 1.55f);
        dua.setPadding(dp(14), dp(14), dp(14), dp(14));
        GradientDrawable db = new GradientDrawable();
        db.setColor(Color.argb(20, 212, 175, 55));
        db.setStroke(dp(1), Color.argb(89, 212, 175, 55));
        db.setCornerRadius(dp(16));
        dua.setBackground(db);
        dua.setVisibility(View.GONE);
        LinearLayout.LayoutParams dp2 = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        dp2.topMargin = dp(20);
        col.addView(dua, dp2);

        // الزراير: [إيقاف الأذان (أساسي)] [إغلاق] — زي الويب
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        if (Build.VERSION.SDK_INT >= 17) row.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        stop = new PillButton(this, true);
        stop.setLabel("إيقاف الأذان", "■  ");
        stop.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                if (ended) AdhanService.begin(AdhanActivity.this, idx, epoch);   // إعادة الأذان (الشاشة بتتبني من جديد)
                else { stopService(new Intent(AdhanActivity.this, AdhanService.class)); markEnded(); }
            }
        });
        LinearLayout.LayoutParams l1 = new LinearLayout.LayoutParams(0, dp(52), 1.6f);
        row.addView(stop, l1);

        PillButton close = new PillButton(this, false);
        close.setLabel("إغلاق", "");
        close.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { finish(); }
        });
        LinearLayout.LayoutParams l2 = new LinearLayout.LayoutParams(0, dp(52), 1f);
        l2.setMarginEnd(dp(10));
        row.addView(close, l2);

        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rp.topMargin = dp(26);
        col.addView(row, rp);

        // ScrollView: لو الشاشة صغيرة/أفقية المحتوى يتسكرول بدل ما يتقص، ولو كبيرة يتوسّط
        int maxW = dp(380);   // نفس max-width بتاع كارت الويب
        boolean wide = getResources().getDisplayMetrics().widthPixels > maxW + dp(48);
        col.setGravity(Gravity.CENTER);
        android.widget.ScrollView sv = new android.widget.ScrollView(this);
        sv.setFillViewport(true);
        sv.setVerticalScrollBarEnabled(false);
        sv.addView(col, new FrameLayout.LayoutParams(wide ? maxW : ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER_HORIZONTAL));
        root.addView(sv, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.setPadding(dp(24), dp(24), dp(24), dp(24));

        // أندرويد 15+ بيرسم التطبيق تحت شريط الحالة/التنقل: نزوّد الحشو بمقدار الحواف
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                v.setPadding(dp(24) + in.getSystemWindowInsetLeft(), dp(24) + in.getSystemWindowInsetTop(),
                        dp(24) + in.getSystemWindowInsetRight(), dp(24) + in.getSystemWindowInsetBottom());
                return in;
            }
        });
        setContentView(root);

        // دخول ناعم: الكارت يطلع من تحت مع fade (زي الويب)
        col.setAlpha(0f);
        col.setTranslationY(dp(18));
        col.setScaleX(0.97f);
        col.setScaleY(0.97f);
        intro = new AnimatorSet();
        intro.playTogether(
                ObjectAnimator.ofFloat(col, View.ALPHA, 0f, 1f),
                ObjectAnimator.ofFloat(col, View.TRANSLATION_Y, dp(18), 0f),
                ObjectAnimator.ofFloat(col, View.SCALE_X, 0.97f, 1f),
                ObjectAnimator.ofFloat(col, View.SCALE_Y, 0.97f, 1f));
        intro.setDuration(450);
        intro.setInterpolator(new DecelerateInterpolator(2f));
        intro.start();

        pulse.setPlaying(true);

        IntentFilter f = new IntentFilter(AdhanService.ACTION_ENDED);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(endedRx, f, Context.RECEIVER_NOT_EXPORTED); else registerReceiver(endedRx, f);
    }

    /** أذان جديد وصل والشاشة لسه مفتوحة (singleTop): نعيد بناءها ببيانات الصلاة الجديدة. */
    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        // نفس الأذان والشاشة شغّالة: ما نعيدش البناء (بيمنع الوميض لما الإشعار والخدمة يفتحوها مع بعض)
        boolean same = i.getIntExtra("idx", 1) == idx && i.getLongExtra("epoch", 0) == epoch;
        setIntent(i);
        if (!ended && same) return;
        recreate();
    }

    private void markEnded() {
        ended = true;
        if (pulse != null) pulse.setPlaying(false);
        stop.setLabel("إعادة الأذان", "▶  ");
        phrase.setVisibility(View.GONE);
        dua.setVisibility(View.VISIBLE);
        dua.setAlpha(0f);
        dua.animate().alpha(1f).setDuration(350).start();
    }

    /* ---------- الخطوط: أميري + ألكسندريا من assets/fonts (بتتنزّل وقت الـ build). لو مش موجودة نرجع لخط النظام ---------- */
    private void loadFonts() {
        amiri = font("fonts/Amiri-Bold.ttf", Typeface.create(Typeface.SERIF, Typeface.BOLD));
        amiriQuran = font("fonts/AmiriQuran-Regular.ttf", font("fonts/Amiri-Regular.ttf", Typeface.SERIF));
        sans = Typeface.DEFAULT_BOLD;
        try {   // ألكسندريا خط متغيّر: نطلب وزن 700 (أندرويد 8+)، وغير كده نكمّل بخط النظام الغامق
            if (Build.VERSION.SDK_INT >= 26) {
                Typeface t = new Typeface.Builder(getAssets(), "fonts/Alexandria.ttf").setFontVariationSettings("'wght' 700").build();
                if (t != null) sans = t;
            } else {
                sans = Typeface.createFromAsset(getAssets(), "fonts/Alexandria.ttf");
            }
        } catch (Throwable ignored) { }
    }

    private Typeface font(String path, Typeface fallback) {
        try { return Typeface.createFromAsset(getAssets(), path); } catch (Throwable t) { return fallback; }
    }

    private TextView text(String s, int sp, int color, Typeface tf, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setGravity(Gravity.CENTER);
        t.setTypeface(tf);
        t.setIncludeFontPadding(false);
        return t;
    }

    private LinearLayout.LayoutParams wrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int v) { return (int) (v * getResources().getDisplayMetrics().density + 0.5f); }

    @Override
    protected void onDestroy() {
        if (intro != null) intro.cancel();
        if (pulse != null) pulse.setPlaying(false);
        try { unregisterReceiver(endedRx); } catch (Exception ignored) { }
        super.onDestroy();
    }

    /* =================== العناصر المرسومة =================== */

    /** خلفية: radial-gradient(120% 90% at 50% 0%, دهب 28% ← أسود 94% عند 62%) */
    private static class BgDrawable extends android.graphics.drawable.Drawable {
        private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        @Override public void draw(Canvas c) {
            android.graphics.Rect r = getBounds();
            c.drawColor(Color.parseColor("#050505"));
            float rad = Math.max(r.width() * 1.2f, r.height() * 0.9f) * 0.62f;
            p.setShader(new RadialGradient(r.width() / 2f, 0, rad,
                    new int[]{Color.argb(72, 212, 175, 55), Color.argb(0, 0, 0, 0)}, new float[]{0f, 1f}, Shader.TileMode.CLAMP));
            c.drawRect(r, p);
        }
        @Override public void setAlpha(int a) { }
        @Override public void setColorFilter(android.graphics.ColorFilter cf) { }
        @Override public int getOpacity() { return android.graphics.PixelFormat.OPAQUE; }
    }

    /** الدايرة الذهبية + أيقونة المسجد + حلقتين بينبضوا أثناء تشغيل الأذان (نفس adhRing بتاع الويب) */
    private static class PulseIcon extends View {
        private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG), glow = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG), stroke = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path icon = new Path();
        private ValueAnimator anim;
        private float t = 0f;      // 0..1 دورة 2.4 ثانية
        private boolean playing = false;

        PulseIcon(Context c) {
            super(c);
            setLayerType(LAYER_TYPE_SOFTWARE, null);   // عشان الـ shadow/blur يترسم صح على كل الأجهزة
            ring.setStyle(Paint.Style.STROKE);
            stroke.setStyle(Paint.Style.STROKE);
            stroke.setStrokeCap(Paint.Cap.ROUND);
            stroke.setStrokeJoin(Paint.Join.ROUND);
            stroke.setColor(Color.parseColor("#1A1405"));
            // نفس مسار SVG بتاع الويب (viewBox 48×48)
            icon.moveTo(24, 4); icon.cubicTo(25.5f, 7, 25.5f, 9, 24, 11); icon.cubicTo(22.5f, 9, 22.5f, 7, 24, 4); icon.close();
            icon.moveTo(10, 42); icon.lineTo(10, 26); icon.cubicTo(10, 18, 16, 14, 24, 14); icon.cubicTo(32, 14, 38, 18, 38, 26); icon.lineTo(38, 42);
            icon.moveTo(6, 42); icon.lineTo(42, 42);
            icon.moveTo(18, 42); icon.lineTo(18, 34); icon.arcTo(new RectF(18, 28, 30, 40), 180, 180, false); icon.lineTo(30, 42);
        }

        void setPlaying(boolean on) {
            playing = on;
            if (on) {
                if (anim == null) {
                    anim = ValueAnimator.ofFloat(0f, 1f);
                    anim.setDuration(2400);
                    anim.setRepeatCount(ValueAnimator.INFINITE);
                    anim.setInterpolator(null);
                    anim.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
                        @Override public void onAnimationUpdate(ValueAnimator a) { t = (Float) a.getAnimatedValue(); invalidate(); }
                    });
                }
                if (!anim.isRunning()) anim.start();
            } else {
                if (anim != null) anim.cancel();
                invalidate();
            }
        }

        @Override protected void onDetachedFromWindow() { if (anim != null) anim.cancel(); super.onDetachedFromWindow(); }

        @Override protected void onDraw(Canvas c) {
            float w = getWidth(), h = getHeight(), cx = w / 2f, cy = h / 2f;
            float r = w * 0.25f;   // نصف قطر الدايرة (112dp من 224 → 0.25 × 2 = 0.5 قطر)
            // الحلقات
            if (playing) {
                for (int k = 0; k < 2; k++) {
                    float ph = (t + k * 0.5f) % 1f;                 // الحلقة التانية متأخرة نص دورة
                    float scale = 1f + 0.9f * ph, a = 0.8f * (1f - ph);
                    ring.setStrokeWidth(w * 0.009f + 2f);
                    ring.setColor(Color.argb((int) (255 * a), 249, 224, 118));
                    c.drawCircle(cx, cy, r * scale, ring);
                }
            } else {
                ring.setStrokeWidth(w * 0.009f + 2f);
                ring.setColor(Color.argb(70, 249, 224, 118));
                c.drawCircle(cx, cy, r * 1.6f, ring);
            }
            // الوهج + الدايرة
            glow.setColor(Color.parseColor("#D4AF37"));
            glow.setShadowLayer(w * 0.075f, 0, w * 0.035f, Color.argb(128, 212, 175, 55));
            c.drawCircle(cx, cy, r, glow);
            fill.setShader(new LinearGradient(cx - r, cy - r, cx + r, cy + r,
                    new int[]{Color.parseColor("#D4AF37"), Color.parseColor("#F9E076"), Color.parseColor("#D4AF37")},
                    new float[]{0f, 0.55f, 1f}, Shader.TileMode.CLAMP));
            c.drawCircle(cx, cy, r, fill);
            // الأيقونة (60/112 من قطر الدايرة)
            float size = r * 2f * (60f / 112f), s = size / 48f;
            c.save();
            c.translate(cx - size / 2f, cy - size / 2f);
            c.scale(s, s);
            stroke.setStrokeWidth(2.6f);
            c.drawPath(icon, stroke);
            c.restore();
        }
    }

    /** زرار بيضاوي زي .adh-btn: الأساسي بتدرّج ذهبي ونص غامق، والتاني بإطار ذهبي ونص ذهبي فاتح. فيه تأثير ضغط. */
    private class PillButton extends TextView {
        private final boolean main;
        PillButton(Context c, boolean main) {
            super(c);
            this.main = main;
            setGravity(Gravity.CENTER);
            setTypeface(sans);
            setTextSize(15);
            setIncludeFontPadding(false);
            setClickable(true);
            setFocusable(true);
            setTextColor(main ? DARK : GOLD_L);
            setCompoundDrawablePadding(dp(8));
            if (main) {
                PaintDrawable d = new PaintDrawable();
                d.setCornerRadius(dp(16));
                d.setShaderFactory(new ShapeDrawable.ShaderFactory() {
                    @Override public Shader resize(int w, int h) {
                        return new LinearGradient(0, h, w, 0, new int[]{Color.parseColor("#D4AF37"), Color.parseColor("#F9E076"), Color.parseColor("#D4AF37")},
                                new float[]{0f, 0.5f, 1f}, Shader.TileMode.CLAMP);
                    }
                });
                setBackground(d);
            } else {
                GradientDrawable g = new GradientDrawable();
                g.setColor(Color.argb(26, 212, 175, 55));
                g.setStroke(dp(1), Color.argb(115, 212, 175, 55));
                g.setCornerRadius(dp(16));
                setBackground(g);
            }
        }

        /** prefix: رمز قبل النص (■ للإيقاف، ▶ للإعادة) زي أيقونات الويب */
        void setLabel(String s, String prefix) {
            setText(prefix + s);
        }

        @Override public boolean onTouchEvent(MotionEvent e) {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN: animate().scaleX(0.96f).scaleY(0.96f).setDuration(80).start(); break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL: animate().scaleX(1f).scaleY(1f).setDuration(120).start(); break;
                default: break;
            }
            return super.onTouchEvent(e);
        }
    }
}
