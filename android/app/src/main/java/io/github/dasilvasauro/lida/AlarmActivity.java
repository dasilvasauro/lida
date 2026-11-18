package io.github.dasilvasauro.lida;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
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
 * A própria tela toca o som (canal de alarme, em loop) e vibra: assim o alarme funciona mesmo sem a
 * permissão de notificações. Não pede para desbloquear ao abrir (o PIN cobria o alarme); só em "Concluir".
 */
public class AlarmActivity extends Activity {
    private int id;
    private String kind;
    private String ref;
    private boolean answered;
    private MediaPlayer player;
    private Vibrator vibrator;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @SuppressLint({ "SetJavaScriptEnabled", "AddJavascriptInterface" })
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
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

        startSound(in.getStringExtra("tone"));
        AlarmScheduler.quiet(this, id); // a notificação continua (botões), sem tocar por cima
        handler.postDelayed(() -> finishAlarm(false), 10 * 60 * 1000); // ninguém respondeu em 10 min
    }

    private void startSound(String tone) {
        try {
            int res = getResources().getIdentifier("alarm_" + (tone == null ? "classico" : tone), "raw", getPackageName());
            if (res == 0) res = getResources().getIdentifier("alarm_classico", "raw", getPackageName());
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            player.setDataSource(this, Uri.parse("android.resource://" + getPackageName() + "/" + res));
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            player = null;
        }
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            long[] pattern = { 0, 700, 500, 700, 1200 };
            if (vibrator != null) {
                if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                else vibrator.vibrate(pattern, 0);
            }
        } catch (Exception ignored) {
            // sem vibração
        }
    }

    private void stopSound() {
        try {
            if (player != null) {
                player.stop();
                player.release();
            }
        } catch (Exception ignored) {
            // já parou
        }
        player = null;
        try {
            if (vibrator != null) vibrator.cancel();
        } catch (Exception ignored) {
            // sem vibração
        }
    }

    @Override
    protected void onDestroy() {
        stopSound();
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    private void finishAlarm(boolean done) {
        if (answered) return;
        answered = true;
        stopSound();
        AlarmScheduler.stop(this, id);
        if (!done) {
            finish();
            return;
        }
        Runnable open = () -> {
            try {
                JSONObject a = new JSONObject();
                a.put("kind", kind);
                a.put("ref", ref);
                startActivity(AlarmScheduler.doneIntent(this, a));
            } catch (Exception ignored) {
                // sem como abrir o app agora
            }
            finish();
        };
        // Concluir abre o Lida: com o celular bloqueado, pede o desbloqueio primeiro.
        KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && km != null && km.isKeyguardLocked()) {
            km.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
                @Override
                public void onDismissSucceeded() {
                    open.run();
                }

                @Override
                public void onDismissCancelled() {
                    open.run(); // abre do mesmo jeito: o app conclui ao ser aberto
                }
            });
        } else open.run();
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
