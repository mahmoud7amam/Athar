package com.atharqurani.app;

import android.animation.Animator;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.media.AudioManager;
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
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Toast;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.Locale;

/**
 * شاشة الأذان الأصلية (فوق شاشة القفل): نفس تصميم شاشة الويب بالظبط —
 * خلفية ذهبية متدرجة، دايرة ذهبية بأيقونة مسجد وحلقات بتنبض أثناء الأذان، خط أميري، وزرّين (إيقاف الأذان + إغلاق).
 *
 * وضع «تذكير الصلاة» يعرض تذكيرًا اختياريًا مع إمكان التأجيل أو الإغلاق في أي وقت؛ لا يمنع استخدام الهاتف.
 */
public class AdhanActivity extends Activity {
    private static final int GOLD = Color.parseColor("#D4AF37"), GOLD_L = Color.parseColor("#F9E076");
    private static final int TEXT = Color.parseColor("#F6EFD9"), MUTED = Color.parseColor("#CBBF9A");
    private static final int DARK = Color.parseColor("#1A1405");

    private Typeface amiri, amiriQuran, sans;
    private PulseIcon pulse;
    private PillButton stop;
    private TextView phrase, dua, titleView, subView, voiceStatus;
    private View card, lockPanel;
    private LinearLayout contentColumn, controlsRow;
    private PillButton voiceStart, laterButton;
    private boolean ended = false;
    private AnimatorSet intro;
    private int idx;
    private long epoch;

    // ---- تأكيد الصلاة صوتيًا: يبدأ فقط بعد ضغط المستخدم، ولا يُحفظ ملف صوتي ----
    private static final int RC_MIC = 31;
    private SpeechRecognizer prayerRecognizer;
    private boolean voiceListening = false;
    private final Handler dismissHandler = new Handler(Looper.getMainLooper());
    private final Runnable closeOrSwitch = new Runnable() {
        @Override public void run() {
            if (isFinishing()) return;
            if (lockMode && AdhanPrefs.lockPending(AdhanActivity.this)) showLockOnlyMode();
            else finish();
        }
    };

    // ---- تذكير الصلاة الاختياري ----
    private boolean lockMode;
    private final Handler hh = new Handler(Looper.getMainLooper());

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
        lockMode = AdhanPrefs.lockOn(this) && AdhanPrefs.lockPending(this) && AdhanPrefs.lockIdx(this) == idx && AdhanPrefs.lockEpoch(this) == epoch;

        loadFonts();

        // الخلفية: نفس radial-gradient بتاع الويب (دهب خفيف من فوق ← أسود)
        FrameLayout root = new FrameLayout(this);
        root.setBackground(new BgDrawable());
        if (Build.VERSION.SDK_INT >= 17) root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        LinearLayout col = new LinearLayout(this);
        contentColumn = col;
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER_HORIZONTAL);
        GradientDrawable glassCard = new GradientDrawable();
        glassCard.setColor(Color.argb(226, 19, 18, 15));
        glassCard.setStroke(dp(1), Color.argb(92, 249, 224, 118));
        glassCard.setCornerRadius(dp(30));
        col.setBackground(glassCard);
        col.setPadding(dp(18), dp(18), dp(18), dp(18));
        if (Build.VERSION.SDK_INT >= 21) col.setElevation(dp(18));
        card = col;

        pulse = new PulseIcon(this);
        col.addView(pulse, new LinearLayout.LayoutParams(dp(152), dp(152)));

        TextView title = text("صلاة " + name + " الآن", 31, GOLD_L, amiri, true);
        titleView = title;
        title.setShadowLayer(dp(11), 0, 0, Color.argb(115, 212, 175, 55));
        title.setLineSpacing(0, 1.15f);
        LinearLayout.LayoutParams tp = wrap();
        tp.topMargin = dp(2);
        col.addView(title, tp);

        TextView sub = text("حسب توقيت " + (city.length() > 0 ? city : "مدينتك") + (epoch > 0 ? " • " + AdhanService.clock(epoch) : ""), 14, MUTED, sans, true);
        subView = sub;
        LinearLayout.LayoutParams sp = wrap();
        sp.topMargin = dp(6);
        col.addView(sub, sp);

        phrase = text(idx == 0 ? "الصلاة خير من النوم" : "حيّ على الصلاة، حيّ على الفلاح", 22, TEXT, amiri, false);
        LinearLayout.LayoutParams pp = wrap();
        pp.topMargin = dp(15);
        col.addView(phrase, pp);

        dua = text("اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ", 17, TEXT, amiriQuran, false);
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
        controlsRow = row;
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
        close.setLabel(lockMode ? "تأجيل 15 دقيقة" : "إغلاق", "");
        close.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { if (lockMode) deferReminder(); else finish(); }
        });
        LinearLayout.LayoutParams l2 = new LinearLayout.LayoutParams(0, dp(52), 1f);
        l2.setMarginEnd(dp(10));
        row.addView(close, l2);

        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rp.topMargin = dp(18);
        col.addView(row, rp);
        if (lockMode) {
            lockPanel = buildLockPanel(col, name);
            lockPanel.setVisibility(View.GONE);
        }

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
        if (getIntent() != null && getIntent().getBooleanExtra("silent", false)) markEnded();
    }

    /** أذان جديد وصل والشاشة لسه مفتوحة (singleTop): نعيد بناءها ببيانات الصلاة الجديدة. */
    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        if (i.getBooleanExtra("keep", false)) { setIntent(i); return; }   // رجوع تلقائي من وضع القفل: ما نبنيش من جديد
        // نفس الأذان والشاشة شغّالة: ما نعيدش البناء (بيمنع الوميض لما الإشعار والخدمة يفتحوها مع بعض)
        boolean same = i.getIntExtra("idx", 1) == idx && i.getLongExtra("epoch", 0) == epoch;
        setIntent(i);
        if (!ended && same) return;
        recreate();
    }

    /* =================== إيقاف الأذان من مفاتيح الصوت =================== */

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            if (!ended) {
                try { stopService(new Intent(this, AdhanService.class)); } catch (Exception ignored) { }
                markEnded();
                Toast.makeText(this, "تم إيقاف الأذان", Toast.LENGTH_SHORT).show();
            }
            return true; // أثناء ظهور شاشة الأذان، ضغطة رفع أو خفض الصوت تعني إيقافه.
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) return true;
        return super.onKeyUp(keyCode, event);
    }

    /* =================== تذكير الصلاة الاختياري =================== */

    @Override
    public void onBackPressed() {
        if (lockMode) deferReminder(); else super.onBackPressed();
    }

    @Override
    protected void onStart() {
        super.onStart();
        hh.removeCallbacksAndMessages(null);
    }

    @Override
    protected void onStop() {
        super.onStop();
        // لا نعيد فتح الشاشة فوق التطبيقات؛ يمكن للمستخدم مغادرتها أو استخدام هاتفه بحرية.
        hh.removeCallbacksAndMessages(null);
    }

    private View buildLockPanel(LinearLayout col, String name) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(16), dp(16), dp(16), dp(14));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.argb(28, 255, 255, 255));
        bg.setStroke(dp(1), Color.argb(100, 212, 175, 55));
        bg.setCornerRadius(dp(24));
        box.setBackground(bg);
        if (Build.VERSION.SDK_INT >= 17) box.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        TextView head = text("🔒 تأكيد الصلاة بالصوت", 20, GOLD_L, sans, true);
        box.addView(head, wrap());

        TextView oath = text("والله العظيم صليت صلاة " + name, 21, TEXT, amiriQuran, true);
        oath.setGravity(Gravity.CENTER);
        oath.setLineSpacing(0, 1.55f);
        GradientDrawable oathBg = new GradientDrawable();
        oathBg.setColor(Color.argb(25, 212, 175, 55));
        oathBg.setStroke(dp(1), Color.argb(82, 212, 175, 55));
        oathBg.setCornerRadius(dp(18));
        oath.setBackground(oathBg);
        oath.setPadding(dp(12), dp(13), dp(12), dp(13));
        LinearLayout.LayoutParams op = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        op.topMargin = dp(12);
        box.addView(oath, op);

        TextView info = text("بعد أداء الصلاة اضغط زر الاستماع وقل العبارة كاملة. لن يبدأ الميكروفون قبل ضغطك، ولا يحفظ تطبيق أثر ملفًا صوتيًا. قد تتطلب خدمة التعرّف على الكلام اتصالًا بالإنترنت.", 13, MUTED, sans, false);
        info.setLineSpacing(0, 1.5f);
        LinearLayout.LayoutParams ip = wrap();
        ip.topMargin = dp(10);
        box.addView(info, ip);

        voiceStatus = text("بطاقة التأكيد جاهزة. ابدأ بعد الانتهاء من الصلاة.", 13, GOLD_L, sans, true);
        voiceStatus.setLineSpacing(0, 1.4f);
        LinearLayout.LayoutParams vp = wrap();
        vp.topMargin = dp(12);
        box.addView(voiceStatus, vp);

        voiceStart = new PillButton(this, true);
        voiceStart.setLabel("ابدأ التأكيد الصوتي", "🎙  ");
        voiceStart.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { startVoiceConfirmation(); }
        });
        LinearLayout.LayoutParams vbp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        vbp.topMargin = dp(14);
        box.addView(voiceStart, vbp);

        laterButton = new PillButton(this, false);
        laterButton.setLabel("تأجيل 15 دقيقة", "");
        laterButton.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { deferReminder(); }
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
        lp.topMargin = dp(9);
        box.addView(laterButton, lp);

        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        bp.topMargin = dp(14);
        col.addView(box, bp);
        return box;
    }

    /** بعد انتهاء صوت الأذان بخمس ثوانٍ نغلق شاشته، أو نُبقي بطاقة التحقق فقط عند تفعيلها. */
    private void showLockOnlyMode() {
        if (!lockMode || lockPanel == null || !AdhanPrefs.lockPending(this)) {
            finish();
            return;
        }
        if (pulse != null) { pulse.setPlaying(false); pulse.setVisibility(View.GONE); }
        if (titleView != null) titleView.setVisibility(View.GONE);
        if (subView != null) subView.setVisibility(View.GONE);
        if (phrase != null) phrase.setVisibility(View.GONE);
        if (dua != null) dua.setVisibility(View.GONE);
        if (controlsRow != null) controlsRow.setVisibility(View.GONE);
        if (lockPanel != null) lockPanel.setVisibility(View.VISIBLE);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (contentColumn != null) {
            contentColumn.setGravity(Gravity.CENTER);
            contentColumn.setPadding(dp(18), dp(18), dp(18), dp(18));
        }
        if (voiceStatus != null) voiceStatus.setText("بعد أداء الصلاة اضغط زر الاستماع وقل العبارة الظاهرة.");
    }

    private void startVoiceConfirmation() {
        if (!lockMode || isFinishing()) return;
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            if (voiceStatus != null) voiceStatus.setText("نحتاج إذن الميكروفون لتأكيد الصلاة بالصوت.");
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, RC_MIC);
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            if (voiceStatus != null) voiceStatus.setText("خدمة التعرّف الصوتي غير متاحة على هذا الجهاز. فعّل خدمة تحويل الكلام إلى نص من إعدادات أندرويد.");
            return;
        }
        stopVoiceRecognition();
        try {
            prayerRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
            prayerRecognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) {
                    if (voiceStatus != null) voiceStatus.setText("استمع الآن… قل: والله العظيم صليت صلاة " + AdhanScheduler.NAMES[idx]);
                }
                @Override public void onBeginningOfSpeech() {
                    if (voiceStatus != null) voiceStatus.setText("جارٍ الاستماع والتحقق من العبارة…");
                }
                @Override public void onRmsChanged(float rmsdB) { }
                @Override public void onBufferReceived(byte[] buffer) { }
                @Override public void onEndOfSpeech() {
                    if (voiceStatus != null) voiceStatus.setText("انتهى الكلام، جارٍ التحقق…");
                }
                @Override public void onError(int error) {
                    voiceListening = false;
                    setVoiceButtonReady();
                    if (voiceStatus != null) voiceStatus.setText(speechError(error) + " يمكنك المحاولة مرة أخرى.");
                    destroyRecognizer();
                }
                @Override public void onResults(Bundle results) {
                    ArrayList<String> heard = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    boolean matched = false;
                    if (heard != null) for (String line : heard) if (matchesPrayerPhrase(line)) { matched = true; break; }
                    voiceListening = false;
                    destroyRecognizer();
                    if (matched) {
                        AdhanPrefs.recordVoiceConfirmation(AdhanActivity.this, idx, epoch);
                        AdhanPrefs.clearLock(AdhanActivity.this);
                        AdhanScheduler.cancelLockReminder(AdhanActivity.this);
                        if (voiceStart != null) voiceStart.setLabel("تم التأكيد", "✓  ");
                        if (voiceStatus != null) voiceStatus.setText("تم التعرّف على العبارة وتسجيل إقرارك الشخصي. جزاك الله خيرًا.");
                        dismissHandler.postDelayed(new Runnable() { @Override public void run() { finish(); } }, 1400L);
                    } else {
                        setVoiceButtonReady();
                        if (voiceStatus != null) voiceStatus.setText("لم نتعرّف على العبارة كاملة أو اسم الصلاة. حاول مرة أخرى.");
                    }
                }
                @Override public void onPartialResults(Bundle partialResults) { }
                @Override public void onEvent(int eventType, Bundle params) { }
            });

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-EG");
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ar-EG");
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            voiceListening = true;
            if (voiceStart != null) {
                voiceStart.setEnabled(false);
                voiceStart.setLabel("جارٍ الاستماع…", "●  ");
            }
            if (voiceStatus != null) voiceStatus.setText("الميكروفون يعمل الآن بعد ضغطك. قل العبارة كاملة.");
            prayerRecognizer.startListening(intent);
        } catch (Exception e) {
            voiceListening = false;
            destroyRecognizer();
            setVoiceButtonReady();
            if (voiceStatus != null) voiceStatus.setText("تعذّر تشغيل التعرّف الصوتي. تحقق من خدمة الكلام وحاول مجددًا.");
        }
    }

    private boolean matchesPrayerPhrase(String spoken) {
        String text = normalizeSpeech(spoken);
        String name = normalizeSpeech(AdhanScheduler.NAMES[idx]);
        String shortName = name.startsWith("ال") ? name.substring(2) : name;
        boolean oath = text.contains("واللهالعظيم") || text.contains("واللهعظيم");
        boolean prayer = text.contains("صليتصلاة" + name) || text.contains("صليتصلاة" + shortName)
                || text.contains("صليت" + name) || text.contains("صليت" + shortName);
        return oath && prayer;
    }

    private String normalizeSpeech(String value) {
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]", "")
                .replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ٱ', 'ا')
                .replace('ى', 'ي').replace('ة', 'ه')
                .replaceAll("[^\\p{L}\\p{N}]", "");
    }

    private String speechError(int error) {
        if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) return "إذن الميكروفون غير متاح.";
        if (error == SpeechRecognizer.ERROR_NETWORK || error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) return "خدمة التعرّف الصوتي تحتاج اتصالًا أو انتهت مهلة الشبكة.";
        if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) return "لم نسمع العبارة بوضوح.";
        if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) return "خدمة الصوت مشغولة؛ انتظر قليلًا.";
        return "حدث خطأ في التعرّف الصوتي.";
    }

    private void setVoiceButtonReady() {
        if (voiceStart != null && !isFinishing()) {
            voiceStart.setEnabled(true);
            voiceStart.setLabel("إعادة محاولة التأكيد", "🎙  ");
        }
    }

    private void destroyRecognizer() {
        if (prayerRecognizer != null) {
            try { prayerRecognizer.setRecognitionListener(null); } catch (Exception ignored) { }
            try { prayerRecognizer.cancel(); } catch (Exception ignored) { }
            try { prayerRecognizer.destroy(); } catch (Exception ignored) { }
            prayerRecognizer = null;
        }
    }

    private void stopVoiceRecognition() {
        voiceListening = false;
        destroyRecognizer();
        setVoiceButtonReady();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == RC_MIC) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) startVoiceConfirmation();
            else if (voiceStatus != null) voiceStatus.setText("لم يتم منح إذن الميكروفون. يمكنك السماح به من إعدادات التطبيق ثم المحاولة.");
        }
    }

    /**
     * التأجيل لا يُسجّل الصلاة كمؤكدة: يظل التذكير معلّقًا ويعود بعد 15 دقيقة.
     * يظل بإمكان المستخدم استخدام الهاتف بحرية، وإيقاف الميزة نهائيًا من إعداداتها.
     */
    private void deferReminder() {
        if (lockMode && AdhanPrefs.lockPending(this)) {
            AdhanScheduler.scheduleLockReminder(this, idx, epoch);
            Toast.makeText(this, "تم التأجيل 15 دقيقة — لم يتم تسجيل تأكيد الصلاة", Toast.LENGTH_LONG).show();
        }
        hh.removeCallbacksAndMessages(null);
        dismissHandler.removeCallbacksAndMessages(null);
        stopVoiceRecognition();
        finish();
    }

    private void markEnded() {
        if (ended) return;
        ended = true;
        if (pulse != null) pulse.setPlaying(false);
        if (stop != null) stop.setLabel("إعادة الأذان", "▶  ");
        if (phrase != null) phrase.setVisibility(View.GONE);
        if (dua != null) {
            dua.setVisibility(View.VISIBLE);
            dua.setAlpha(0f);
            dua.animate().alpha(1f).setDuration(300).start();
        }
        dismissHandler.removeCallbacks(closeOrSwitch);
        dismissHandler.postDelayed(closeOrSwitch, 5000L);
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
    protected void onPause() {
        if (voiceListening) {
            stopVoiceRecognition();
            if (voiceStatus != null) voiceStatus.setText("توقف الاستماع عند مغادرة الشاشة. اضغط لإعادة المحاولة.");
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        hh.removeCallbacksAndMessages(null);
        dismissHandler.removeCallbacksAndMessages(null);
        stopVoiceRecognition();
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
