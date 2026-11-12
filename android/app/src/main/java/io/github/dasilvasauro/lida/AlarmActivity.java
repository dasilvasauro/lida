package io.github.dasilvasauro.lida;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;

/**
 * Tela do alarme: alarm.html (a mesma do app) ocupando a tela toda, por cima da tela de bloqueio, com o
 * brilho no máximo. "Concluir" abre o Lida com o link que conclui; "Ignorar" (ou voltar) só para o som.
 */
public class AlarmActivity extends Activity {
    private int id;
    private String kind;
    private String ref;
    private boolean answered;

    @SuppressLint({ "SetJavaScriptEnabled", "AddJavascriptInterface" })
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_FULL; // brilho no máximo
        getWindow().setAttributes(lp);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

        Intent in = getIntent();
        id = in.getIntExtra("id", 0);
        kind = in.getStringExtra("kind");
        ref = in.getStringExtra("ref");
        String payload = in.getStringExtra("payload");
        if (payload == null) payload = "{}";

        WebView web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Bridge(), "LidaAlarmNative");
        setContentView(web);
        web.loadUrl("file:///android_asset/public/alarm.html#" + android.net.Uri.encode(payload));
    }

    private void finishAlarm(boolean done) {
        if (answered) return;
        answered = true;
        AlarmScheduler.stop(this, id);
        if (done) {
            try {
                JSONObject a = new JSONObject();
                a.put("kind", kind);
                a.put("ref", ref);
                startActivity(AlarmScheduler.doneIntent(this, a));
            } catch (Exception ignored) {
                // sem como abrir o app agora
            }
        }
        finish();
    }

    @Override
    public void onBackPressed() {
        finishAlarm(false);
    }

    private class Bridge {
        @JavascriptInterface
        public void done() {
            runOnUiThread(() -> finishAlarm(true));
        }

        @JavascriptInterface
        public void ignore() {
            runOnUiThread(() -> finishAlarm(false));
        }
    }
}
