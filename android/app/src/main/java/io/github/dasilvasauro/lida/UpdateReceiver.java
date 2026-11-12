package io.github.dasilvasauro.lida;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;

/**
 * Resultado da instalação da atualização e reabertura do Lida depois dela.
 * - INSTALL_STATUS: se o Android pedir confirmação, abre a tela dele ("Atualizar este app?").
 * - MY_PACKAGE_REPLACED: a versão nova foi instalada (o processo antigo foi encerrado). Tenta reabrir o
 *   Lida; se o Android não deixar abrir em segundo plano, deixa uma notificação "toque para abrir".
 */
public class UpdateReceiver extends BroadcastReceiver {

    static final String CHANNEL = "lida_update";
    static final int ID = 734200;

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (LidaAppPlugin.ACTION_INSTALL_STATUS.equals(action)) {
            int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
            if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                if (confirm != null) {
                    confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try {
                        ctx.startActivity(confirm);
                    } catch (Exception ignored) {
                        // sem como mostrar agora
                    }
                }
            }
            return;
        }
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            open.putExtra("lida.updated", true);
            try {
                ctx.startActivity(open); // funciona quando o Android permite (ex.: com "Sobrepor a outros apps")
            } catch (Exception ignored) {
                // bloqueado em segundo plano
            }
            notifyUpdated(ctx, open);
        }
    }

    private static void notifyUpdated(Context ctx, Intent open) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, ctx.getString(R.string.ch_update), NotificationManager.IMPORTANCE_DEFAULT);
            ch.setSound(null, null);
            nm.createNotificationChannel(ch);
        }
        PendingIntent pi = PendingIntent.getActivity(ctx, ID, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        int icon = ctx.getResources().getIdentifier("ic_stat_lida", "drawable", ctx.getPackageName());
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, CHANNEL) : new Notification.Builder(ctx);
        b.setSmallIcon(icon != 0 ? icon : ctx.getApplicationInfo().icon)
            .setContentTitle(ctx.getString(R.string.updated_title))
            .setContentText(ctx.getString(R.string.updated_text))
            .setContentIntent(pi)
            .setAutoCancel(true);
        if (Build.VERSION.SDK_INT >= 26) b.setTimeoutAfter(10 * 60 * 1000);
        try {
            nm.notify(ID, b.build());
        } catch (SecurityException ignored) {
            // sem permissão de notificações
        }
    }
}
