package io.github.dasilvasauro.lida;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

/** Alarmes de tela cheia: o app manda a lista (sync) e o Android toca na hora, mesmo com o app fechado. */
@CapacitorPlugin(name = "LidaAlarm")
public class LidaAlarmPlugin extends Plugin {

    @PluginMethod
    public void sync(PluginCall call) {
        try {
            JSONArray alarms = call.getArray("alarms", new com.getcapacitor.JSArray());
            JSONObject look = call.getObject("look", new JSObject());
            JSONObject t = call.getObject("t", new JSObject());
            AlarmScheduler.replaceAll(getContext(), alarms, look, t);
            call.resolve(status());
        } catch (Exception e) {
            call.reject("Não consegui agendar os alarmes: " + e.getMessage());
        }
    }

    // Toca em alguns segundos (botão "Testar" em Ajustes).
    @PluginMethod
    public void test(PluginCall call) {
        try {
            JSONObject a = call.getObject("alarm", new JSObject());
            JSONObject look = call.getObject("look", new JSObject());
            JSONObject t = call.getObject("t", new JSObject());
            Context ctx = getContext();
            JSONObject texts = new JSONObject(AlarmScheduler.prefs(ctx).getString("t", "{}"));
            if (texts.length() == 0) texts = t;
            AlarmScheduler.prefs(ctx).edit().putString("test", a.toString()).putString("look", look.toString()).putString("t", texts.toString()).apply();
            AlarmScheduler.schedule(ctx, a.optInt("id", 1), System.currentTimeMillis() + 3000);
            call.resolve(status());
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(status());
    }

    private JSObject status() {
        Context ctx = getContext();
        JSObject r = new JSObject();
        boolean full = true;
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            full = nm.canUseFullScreenIntent();
        }
        boolean exact = true;
        if (Build.VERSION.SDK_INT >= 31) exact = ((AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE)).canScheduleExactAlarms();
        r.put("fullScreen", full);
        r.put("exact", exact);
        r.put("count", AlarmScheduler.stored(ctx).length());
        return r;
    }

    // Android 14+: "Notificações em tela cheia" para o Lida (sem isso, o alarme vira só notificação).
    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        Context ctx = getContext();
        Intent i;
        if (Build.VERSION.SDK_INT >= 34) i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + ctx.getPackageName()));
        else i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(i);
        } catch (Exception e) {
            // aparelho sem essa tela
        }
        call.resolve();
    }
}
