package io.github.dasilvasauro.lida;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte entre o app e o widget "Hoje".
 * O app manda um resumo pronto (JSON) sempre que algo muda; o widget só lê e desenha.
 */
@CapacitorPlugin(name = "LidaWidget")
public class LidaWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("Sem dados");
            return;
        }
        Context ctx = getContext();
        SharedPreferences sp = ctx.getSharedPreferences(TodayWidget.PREFS, Context.MODE_PRIVATE);
        sp.edit().putString("data", data).apply();
        TodayWidget.refreshAll(ctx);
        RingsWidget.refreshAll(ctx);
        call.resolve();
    }
}
