package app.athar.islamic;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** يفتح موقع أَثَر داخل WebView، ويوفّر window.AtharNative للأذان في الخلفية. */
public class MainActivity extends Activity {
    static final String HOME = "https://athar-silk.vercel.app/";
    static final String HOST = "athar-silk.vercel.app";
    static volatile boolean foreground = false;

    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Notifs.ensureChannels(this);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.addJavascriptInterface(new AtharBridge(this), "AtharNative");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOffline(view);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) { }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(HOME);

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            getSharedPreferences(AdhanScheduler.PREFS, MODE_PRIVATE).edit().putBoolean("asked_notif", true).apply();
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 100);
        }

        AdhanScheduler.scheduleNext(this);
    }

    private void showOffline(WebView view) {
        String html = "<html dir='rtl'><body style='margin:0;background:#000;color:#efe9da;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center'>"
                + "<div style='font-size:28px;color:#D4AF37;font-weight:bold'>أَثَر</div>"
                + "<p>لا يوجد اتصال بالإنترنت</p>"
                + "<a href='" + HOME + "' style='padding:12px 28px;border-radius:14px;background:#D4AF37;color:#000;text-decoration:none;font-weight:bold'>إعادة المحاولة</a>"
                + "</body></html>";
        view.loadDataWithBaseURL(HOME, html, "text/html", "utf-8", null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }

    @Override
    protected void onStart() { super.onStart(); foreground = true; }

    @Override
    protected void onStop() { foreground = false; super.onStop(); }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.removeJavascriptInterface("AtharNative"); }
        super.onDestroy();
    }
}
