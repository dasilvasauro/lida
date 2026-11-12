package io.github.dasilvasauro.lida;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONArray;
import org.json.JSONObject;

/** Hora do alarme (toca e agenda o próximo, se repetir), "Ignorar" da notificação e reinício do celular. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            AlarmScheduler.rescheduleStored(ctx);
            return;
        }
        int id = intent.getIntExtra("id", 0);
        if (AlarmScheduler.ACTION_IGNORE.equals(action)) {
            AlarmScheduler.stop(ctx, id);
            return;
        }
        if (!AlarmScheduler.ACTION_FIRE.equals(action)) return;
        JSONObject a = AlarmScheduler.find(ctx, id);
        if (a == null) {
            JSONObject test = null;
            try {
                test = new JSONObject(AlarmScheduler.prefs(ctx).getString("test", "{}"));
            } catch (Exception ignored) {
                // sem teste
            }
            if (test != null && test.optInt("id") == id) AlarmScheduler.ring(ctx, test);
            return;
        }
        AlarmScheduler.ring(ctx, a);
        if (a.optJSONArray("repeat") != null) {
            try {
                long next = AlarmScheduler.next(a, System.currentTimeMillis());
                a.put("at", next);
                JSONArray all = AlarmScheduler.stored(ctx);
                for (int i = 0; i < all.length(); i++) if (all.optJSONObject(i) != null && all.optJSONObject(i).optInt("id") == id) all.put(i, a);
                AlarmScheduler.prefs(ctx).edit().putString("alarms", all.toString()).apply();
                AlarmScheduler.schedule(ctx, id, next);
            } catch (Exception ignored) {
                // o app reagenda ao abrir
            }
        }
    }
}
