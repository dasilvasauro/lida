package io.github.dasilvasauro.lida;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Chronometer;
import android.widget.LinearLayout;

/**
 * Serviço em primeiro plano do foco: mantém a notificação fixa da tarefa em foco / Pomodoro
 * (com cor própria, contagem do sistema e, no Android 16, pedido de Live Update) e o relógio
 * flutuante que aparece por cima dos outros apps quando o Lida é minimizado com um cronômetro
 * rodando (precisa da permissão "Sobrepor a outros apps").
 *
 * O estado chega do app (LidaTimerPlugin) como extras: title, body, endsAt (contagem regressiva),
 * startedAt (contagem progressiva), paused, leftMs, chip, focus, timeoutMs.
 */
public class FocusService extends Service {

    static final String CHANNEL = "foco_ativo";
    static final int ID = 734100;
    static final String PREFS = "lida_focus";
    static final String ACTION_SHOW = "lida.focus.SHOW";
    static final String ACTION_HIDE = "lida.focus.HIDE";
    static final String ACTION_BG = "lida.focus.BG";
    static final String ACTION_FG = "lida.focus.FG";

    static boolean running = false;
    static boolean appInForeground = true;
    private Bundle current;
    private View overlay;
    private Chronometer overlayClock;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_HIDE.equals(action)) {
            ticker.removeCallbacks(tick);
            removeOverlay();
            running = false;
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (ACTION_SHOW.equals(action) && intent.getExtras() != null) current = intent.getExtras();
        if (ACTION_BG.equals(action)) appInForeground = false;
        if (ACTION_FG.equals(action)) appInForeground = true;
        if (current == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        Notification n = build(this, current, true);
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(ID, n);
            running = true;
        } catch (Exception e) {
            // Sem permissão para serviço em primeiro plano agora: fica a notificação comum.
            notifyPlain(this, current);
            stopSelf();
            return START_NOT_STICKY;
        }
        refreshOverlay();
        scheduleTick();
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        ticker.removeCallbacks(tick);
        removeOverlay();
        running = false;
        super.onDestroy();
    }

    /* ---------- Notificação ---------- */

    static NotificationManager manager(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, ctx.getString(R.string.ch_focus), NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription(ctx.getString(R.string.ch_focus_desc));
            ch.setSound(null, null);
            ch.enableVibration(false);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        return nm;
    }

    static void notifyPlain(Context ctx, Bundle b) {
        try {
            manager(ctx).notify(ID, build(ctx, b, false));
        } catch (SecurityException ignored) {
            // sem permissão de notificações
        }
    }

    static Notification build(Context ctx, Bundle s, boolean foreground) {
        String title = s.getString("title", "Foco");
        String body = s.getString("body", "");
        long endsAt = s.getLong("endsAt", 0);
        long startedAt = s.getLong("startedAt", 0);
        boolean paused = s.getBoolean("paused", false);
        boolean focus = s.getBoolean("focus", false);
        String chip = s.getString("chip");
        long timeoutMs = s.getLong("timeoutMs", 0);

        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("lida://hoje"));
        open.setPackage(ctx.getPackageName());
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, ID, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        manager(ctx);
        int icon = ctx.getResources().getIdentifier("ic_stat_lida", "drawable", ctx.getPackageName());
        int color = focus ? 0xFFE5484D : 0xFF7C8CFF;
        b.setSmallIcon(icon != 0 ? icon : ctx.getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(body)
            .setSubText(ctx.getString(focus ? R.string.focus_sub_focus : R.string.focus_sub_timer))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setAutoCancel(false)
            .setContentIntent(pi)
            .setColor(color)
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setVisibility(Notification.VISIBILITY_PUBLIC);

        if (endsAt > 0 && !paused) {
            b.setWhen(endsAt).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true);
        } else if (startedAt > 0 && !paused) {
            b.setWhen(startedAt).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(false);
        } else {
            b.setShowWhen(false);
        }
        if (timeoutMs > 0 && Build.VERSION.SDK_INT >= 26) b.setTimeoutAfter(timeoutMs);

        if (Build.VERSION.SDK_INT >= 36) {
            // Android 16: Live Update (chip na barra de status, Now Bar da Samsung, ilha da Xiaomi).
            // Regras para ser promovida: contínua, com título, sem cor de fundo (setColorized),
            // sem layout próprio, canal acima de IMPORTANCE_MIN e a permissão POST_PROMOTED_NOTIFICATIONS.
            // (APIs do Android 16 chamadas por reflexão: o build não depende da versão exata do SDK.)
            Bundle extras = new Bundle();
            extras.putBoolean("android.requestPromotedOngoing", true);
            b.addExtras(extras);
            invoke(b, "setRequestPromotedOngoing", new Class<?>[] { boolean.class }, true);
            // Com duração conhecida, estilo de progresso: a barra anda conforme o tempo passa.
            long totalMs = s.getLong("totalMs", 0);
            if (totalMs > 0 && (endsAt > 0 || paused)) {
                long left = paused ? s.getLong("leftMs", 0) : Math.max(0, endsAt - System.currentTimeMillis());
                int max = 1000;
                int done = (int) Math.max(0, Math.min(max, Math.round((1 - (double) left / totalMs) * max)));
                Object style = progressStyle(max, done, color);
                if (style != null) b.setStyle((Notification.Style) style);
            }
            // O texto curto do chip. Pausado: "Pausa". Na Xiaomi (HyperOS), a ilha não mostra o
            // cronômetro do sistema, então o chip leva o tempo em texto (atualizado pelo serviço).
            String critical = paused ? chip : (isXiaomi() ? clockText(endsAt, startedAt) : null);
            if (critical != null) invoke(b, "setShortCriticalText", new Class<?>[] { String.class }, critical);
        } else if (foreground && focus) {
            // Até o Android 15: notificação de serviço em primeiro plano pode ser toda colorida.
            b.setColorized(true);
        }
        return b.build();
    }

    static Object invoke(Object target, String name, Class<?>[] types, Object... args) {
        try {
            return target.getClass().getMethod(name, types).invoke(target, args);
        } catch (Exception e) {
            return null; // API ausente neste Android
        }
    }

    // Notification.ProgressStyle (Android 16) com um segmento na cor do foco.
    static Object progressStyle(int max, int progress, int color) {
        try {
            Class<?> ps = Class.forName("android.app.Notification$ProgressStyle");
            Class<?> seg = Class.forName("android.app.Notification$ProgressStyle$Segment");
            Object segment = seg.getConstructor(int.class).newInstance(max);
            seg.getMethod("setColor", int.class).invoke(segment, color);
            Object style = ps.getConstructor().newInstance();
            ps.getMethod("setStyledByProgress", boolean.class).invoke(style, true);
            ps.getMethod("setProgressSegments", java.util.List.class).invoke(style, java.util.Collections.singletonList(segment));
            ps.getMethod("setProgress", int.class).invoke(style, progress);
            return style;
        } catch (Exception e) {
            return null;
        }
    }

    static boolean isXiaomi() {
        String m = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase();
        return m.contains("xiaomi") || m.contains("redmi") || m.contains("poco");
    }

    // "24 min", "45 s" (contagem) ou "1h05" / "12 min" (tempo desde o início do foco). Cabe no chip (até ~7 letras).
    static String clockText(long endsAt, long startedAt) {
        long now = System.currentTimeMillis();
        long ms = endsAt > 0 ? Math.max(0, endsAt - now) : startedAt > 0 ? Math.max(0, now - startedAt) : -1;
        if (ms < 0) return null;
        long sec = ms / 1000;
        if (endsAt > 0 && sec < 60) return sec + " s";
        long min = endsAt > 0 ? (sec + 59) / 60 : sec / 60;
        if (min >= 60) return (min / 60) + "h" + String.format(java.util.Locale.ROOT, "%02d", min % 60);
        return min + " min";
    }

    // Enquanto roda, refaz a notificação de tempos em tempos: a barra de progresso anda e, na Xiaomi,
    // o texto do chip acompanha o relógio. Sem nada disso (Android até o 15, fora da Xiaomi), não roda.
    private final android.os.Handler ticker = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            if (!running || current == null || current.getBoolean("paused", false)) return;
            long endsAt = current.getLong("endsAt", 0);
            try {
                manager(FocusService.this).notify(ID, build(FocusService.this, current, true));
            } catch (Exception ignored) {
                // sem permissão
            }
            long left = endsAt > 0 ? endsAt - System.currentTimeMillis() : Long.MAX_VALUE;
            if (endsAt > 0 && left <= 0) return;
            ticker.postDelayed(this, isXiaomi() && left < 70000 ? 5000 : isXiaomi() ? 30000 : 15000);
        }
    };

    private void scheduleTick() {
        ticker.removeCallbacks(tick);
        boolean wants = Build.VERSION.SDK_INT >= 36 && current != null && !current.getBoolean("paused", false) && (current.getLong("totalMs", 0) > 0 || isXiaomi());
        if (wants) ticker.postDelayed(tick, isXiaomi() ? 5000 : 15000);
    }

    /* ---------- Relógio flutuante ---------- */

    static boolean overlayWanted(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("overlay", false);
    }

    static boolean canOverlay(Context ctx) {
        return Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(ctx);
    }

    private boolean hasClock() {
        return current != null && (current.getLong("endsAt", 0) > 0 || current.getLong("startedAt", 0) > 0 || current.getBoolean("paused", false));
    }

    private void refreshOverlay() {
        if (appInForeground || !overlayWanted(this) || !canOverlay(this) || !hasClock()) {
            removeOverlay();
            return;
        }
        if (overlay == null) createOverlay();
        if (overlayClock == null) return;
        long now = System.currentTimeMillis();
        long endsAt = current.getLong("endsAt", 0);
        long startedAt = current.getLong("startedAt", 0);
        boolean paused = current.getBoolean("paused", false);
        long leftMs = current.getLong("leftMs", 0);
        overlayClock.stop();
        if (paused) {
            overlayClock.setCountDown(true);
            overlayClock.setBase(SystemClock.elapsedRealtime() + leftMs);
        } else if (endsAt > 0) {
            overlayClock.setCountDown(true);
            overlayClock.setBase(SystemClock.elapsedRealtime() + (endsAt - now));
            overlayClock.start();
        } else {
            overlayClock.setCountDown(false);
            overlayClock.setBase(SystemClock.elapsedRealtime() - (now - startedAt));
            overlayClock.start();
        }
        overlay.setAlpha(paused ? 0.7f : 1f);
    }

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    private void createOverlay() {
        final WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        if (wm == null) return;
        boolean focus = current.getBoolean("focus", false);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.HORIZONTAL);
        box.setGravity(Gravity.CENTER_VERTICAL);
        box.setPadding(dp(12), dp(7), dp(14), dp(7));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xEE151920);
        bg.setCornerRadius(dp(20));
        bg.setStroke(dp(1.5f), focus ? 0xFFE5484D : 0xFF7C8CFF);
        box.setBackground(bg);
        box.setElevation(dp(6));

        View dot = new View(this);
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(focus ? 0xFFE5484D : 0xFF7C8CFF);
        dot.setBackground(d);
        LinearLayout.LayoutParams dl = new LinearLayout.LayoutParams(dp(8), dp(8));
        dl.setMargins(0, 0, dp(8), 0);
        box.addView(dot, dl);

        Chronometer clock = new Chronometer(this);
        clock.setTextColor(Color.WHITE);
        clock.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        clock.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        box.addView(clock);
        overlayClock = clock;

        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        final WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        lp.gravity = Gravity.TOP | Gravity.START;
        final SharedPreferences sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        lp.x = sp.getInt("x", dp(16));
        lp.y = sp.getInt("y", dp(120));

        // Arrastar move o relógio (a posição fica guardada); um toque abre o Lida.
        box.setOnTouchListener(new View.OnTouchListener() {
            float sx, sy;
            int ox, oy;
            boolean moved;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        sx = e.getRawX();
                        sy = e.getRawY();
                        ox = lp.x;
                        oy = lp.y;
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = Math.round(e.getRawX() - sx);
                        int dy = Math.round(e.getRawY() - sy);
                        if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) moved = true;
                        lp.x = ox + dx;
                        lp.y = oy + dy;
                        try {
                            wm.updateViewLayout(v, lp);
                        } catch (Exception ignored) {
                            // a janela já saiu
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        sp.edit().putInt("x", lp.x).putInt("y", lp.y).apply();
                        if (!moved) {
                            Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("lida://hoje"));
                            open.setPackage(getPackageName());
                            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                            startActivity(open);
                        }
                        return true;
                    default:
                        return false;
                }
            }
        });
        try {
            wm.addView(box, lp);
            overlay = box;
        } catch (Exception e) {
            overlay = null;
            overlayClock = null;
        }
    }

    private void removeOverlay() {
        if (overlay == null) return;
        try {
            ((WindowManager) getSystemService(Context.WINDOW_SERVICE)).removeView(overlay);
        } catch (Exception ignored) {
            // já removida
        }
        overlay = null;
        overlayClock = null;
    }
}
