package io.github.dasilvasauro.lida;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.reflect.Method;

/**
 * Notificação fixa do Pomodoro / modo foco, com contagem regressiva que o próprio Android atualiza
 * (cronômetro do sistema): continua certa com o app minimizado ou fechado, sem gastar bateria.
 *
 * No Android 16+ ela pede para virar "Live Update" (atualização ao vivo): aparece como um chip
 * com o tempo na barra de status e em destaque na tela de bloqueio. Em versões anteriores é uma
 * notificação fixa comum, com o cronômetro.
 */
@CapacitorPlugin(name = "LidaTimer")
public class LidaTimerPlugin extends Plugin {

    static final String CHANNEL = "foco_ativo";
    static final int ID = 734100;

    private NotificationManager manager() {
        Context ctx = getContext();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            // Importância padrão sem som nem vibração: discreta, mas elegível a Live Update.
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Cronômetro em andamento", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Contagem do Pomodoro e do modo foco enquanto estão rodando");
            ch.setSound(null, null);
            ch.enableVibration(false);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        return nm;
    }

    @PluginMethod
    public void show(PluginCall call) {
        Context ctx = getContext();
        String title = call.getString("title", "Foco");
        String body = call.getString("body", "");
        Long endsAt = call.getLong("endsAt");
        Boolean paused = call.getBoolean("paused", false);
        String chip = call.getString("chip");
        Long timeoutMs = call.getLong("timeoutMs");

        NotificationManager nm = manager();
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("lida://hoje"));
        open.setPackage(ctx.getPackageName());
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, ID, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        int icon = ctx.getResources().getIdentifier("ic_stat_lida", "drawable", ctx.getPackageName());
        b.setSmallIcon(icon != 0 ? icon : ctx.getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(body)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setAutoCancel(false)
            .setContentIntent(pi)
            .setColor(0xFF7C8CFF)
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setVisibility(Notification.VISIBILITY_PUBLIC);

        if (endsAt != null && !paused) {
            b.setWhen(endsAt).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true);
        } else {
            b.setShowWhen(false);
        }
        // Some sozinha quando o ciclo acaba (o aviso de fim chega pelo lembrete agendado).
        if (timeoutMs != null && timeoutMs > 0 && Build.VERSION.SDK_INT >= 26) b.setTimeoutAfter(timeoutMs);

        // Android 16 (API 36): pedido de promoção a Live Update. Feito por extra/reflexão para
        // compilar e rodar igual em qualquer versão (nas antigas é simplesmente ignorado).
        Bundle extras = new Bundle();
        extras.putBoolean("android.requestPromotedOngoing", true);
        b.addExtras(extras);
        if (Build.VERSION.SDK_INT >= 36) {
            try {
                Method m = Notification.Builder.class.getMethod("setRequestPromotedOngoing", boolean.class);
                m.invoke(b, true);
            } catch (Exception ignored) {
                // sem a API: fica como notificação fixa comum
            }
            if (chip != null && (paused || endsAt == null)) {
                try {
                    Method m = Notification.Builder.class.getMethod("setShortCriticalText", String.class);
                    m.invoke(b, chip);
                } catch (Exception ignored) {
                    // opcional
                }
            }
        }

        try {
            nm.notify(ID, b.build());
            call.resolve();
        } catch (SecurityException e) {
            call.reject("Sem permissão para notificações");
        }
    }

    @PluginMethod
    public void hide(PluginCall call) {
        manager().cancel(ID);
        call.resolve();
    }
}
