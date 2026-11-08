package io.github.dasilvasauro.lida;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte do foco com o Android: notificação fixa (tarefa em foco, Pomodoro, modo foco), feita por
 * um serviço em primeiro plano (FocusService), e o relógio flutuante sobre os outros apps.
 *
 * A contagem é do próprio Android (cronômetro do sistema): continua certa com o app minimizado
 * ou fechado, sem gastar bateria. No Android 16+ a notificação pede para virar Live Update.
 */
@CapacitorPlugin(name = "LidaTimer")
public class LidaTimerPlugin extends Plugin {

    private Bundle extrasOf(PluginCall call) {
        Bundle b = new Bundle();
        b.putString("title", call.getString("title", "Foco"));
        b.putString("body", call.getString("body", ""));
        String chip = call.getString("chip");
        if (chip != null) b.putString("chip", chip);
        Long endsAt = call.getLong("endsAt");
        if (endsAt != null) b.putLong("endsAt", endsAt);
        Long startedAt = call.getLong("startedAt");
        if (startedAt != null) b.putLong("startedAt", startedAt);
        Long leftMs = call.getLong("leftMs");
        if (leftMs != null) b.putLong("leftMs", leftMs);
        Long timeoutMs = call.getLong("timeoutMs");
        if (timeoutMs != null) b.putLong("timeoutMs", timeoutMs);
        b.putBoolean("paused", call.getBoolean("paused", false));
        b.putBoolean("focus", call.getBoolean("focus", false));
        return b;
    }

    private void send(String action, Bundle extras) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, FocusService.class);
        i.setAction(action);
        if (extras != null) i.putExtras(extras);
        if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i);
        else ctx.startService(i);
    }

    @PluginMethod
    public void show(PluginCall call) {
        Bundle b = extrasOf(call);
        try {
            send(FocusService.ACTION_SHOW, b);
        } catch (Exception e) {
            // Android 12+ não deixa iniciar o serviço com o app em segundo plano: notificação comum.
            FocusService.notifyPlain(getContext(), b);
        }
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Context ctx = getContext();
        if (FocusService.running) {
            Intent i = new Intent(ctx, FocusService.class);
            i.setAction(FocusService.ACTION_HIDE);
            try {
                ctx.startService(i);
            } catch (Exception e) {
                ctx.stopService(new Intent(ctx, FocusService.class));
            }
        }
        FocusService.manager(ctx).cancel(FocusService.ID);
        call.resolve();
    }

    /* ---------- Relógio flutuante ---------- */

    @PluginMethod
    public void overlayStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", FocusService.canOverlay(getContext()));
        r.put("on", FocusService.overlayWanted(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void setOverlay(PluginCall call) {
        boolean on = call.getBoolean("on", false);
        getContext().getSharedPreferences(FocusService.PREFS, Context.MODE_PRIVATE).edit().putBoolean("overlay", on).apply();
        JSObject r = new JSObject();
        r.put("granted", FocusService.canOverlay(getContext()));
        r.put("on", on);
        call.resolve(r);
    }

    // Abre a tela do Android "Sobrepor a outros apps" para o Lida.
    @PluginMethod
    public void requestOverlay(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 23 && !FocusService.canOverlay(getContext())) {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    /* ---------- App visível ou não (o relógio flutuante só aparece com o app minimizado) ---------- */

    @Override
    protected void handleOnPause() {
        FocusService.appInForeground = false;
        if (FocusService.running) {
            try {
                send(FocusService.ACTION_BG, null);
            } catch (Exception ignored) {
                // serviço indisponível
            }
        }
    }

    @Override
    protected void handleOnResume() {
        FocusService.appInForeground = true;
        if (FocusService.running) {
            try {
                send(FocusService.ACTION_FG, null);
            } catch (Exception ignored) {
                // serviço indisponível
            }
        }
    }
}
