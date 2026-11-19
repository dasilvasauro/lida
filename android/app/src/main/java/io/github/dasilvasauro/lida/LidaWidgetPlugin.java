package io.github.dasilvasauro.lida;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;

/**
 * Ponte entre o app e os widgets.
 * O app manda um resumo pronto (JSON) sempre que algo muda; os widgets só leem e desenham.
 * Do widget de adição rápida vem uma fila (QuickStore): o app lê com queue(), aplica e confirma com
 * ack(). Com o app aberto, o evento "quickQueue" avisa na hora que a fila mudou.
 */
@CapacitorPlugin(name = "LidaWidget")
public class LidaWidgetPlugin extends Plugin {

    private static LidaWidgetPlugin live;

    @Override
    public void load() {
        live = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (live == this) live = null;
    }

    /** A fila mudou (pelo widget). Devolve true se o app estava aberto para receber o aviso. */
    static boolean queueChanged() {
        LidaWidgetPlugin p = live;
        if (p == null || p.getBridge() == null) return false;
        try {
            p.notifyListeners("quickQueue", new JSObject());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void queue(PluginCall call) {
        JSObject r = new JSObject();
        try {
            r.put("ops", new JSArray(QuickStore.read(getContext()).toString()));
        } catch (Exception e) {
            r.put("ops", new JSArray());
        }
        call.resolve(r);
    }

    @PluginMethod
    public void ack(PluginCall call) {
        JSArray ids = call.getArray("ids");
        Set<String> set = new HashSet<>();
        try {
            JSONArray a = ids == null ? new JSONArray() : ids;
            for (int i = 0; i < a.length(); i++) set.add(a.getString(i));
        } catch (Exception ignored) {
            // nada a confirmar
        }
        QuickStore.ack(getContext(), set);
        QuickWidget.refreshAll(getContext());
        call.resolve();
    }

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
        StreakWidget.refreshAll(ctx);
        WeekWidget.refreshAll(ctx);
        QuickWidget.refreshAll(ctx);
        call.resolve();
    }
}
