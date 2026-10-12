package com.atharqurani.app;

import android.app.Application;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;

public class CrashApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        final Thread.UncaughtExceptionHandler old = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread t, Throwable e) {
                try {
                    StringWriter sw = new StringWriter();
                    e.printStackTrace(new PrintWriter(sw));
                    String txt = "Device: " + Build.MANUFACTURER + " " + Build.MODEL
                        + " | Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")"
                        + "\nThread: " + t.getName() + "\n\n" + sw.toString();
                    save(txt);
                } catch (Throwable ignored) {
                }
                if (old != null) old.uncaughtException(t, e);
            }
        });
    }

    private void save(String txt) throws Exception {
        String name = "athar-crash-" + System.currentTimeMillis() + ".txt";
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Downloads.DISPLAY_NAME, name);
            v.put(MediaStore.Downloads.MIME_TYPE, "text/plain");
            v.put(MediaStore.Downloads.RELATIVE_PATH, "Download");
            Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (u != null) {
                OutputStream os = getContentResolver().openOutputStream(u);
                os.write(txt.getBytes("UTF-8"));
                os.close();
            }
        } else {
            File f = new File(getExternalFilesDir(null), name);
            FileOutputStream os = new FileOutputStream(f);
            os.write(txt.getBytes("UTF-8"));
            os.close();
        }
    }
}
