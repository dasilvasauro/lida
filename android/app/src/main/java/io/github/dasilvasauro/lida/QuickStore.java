package io.github.dasilvasauro.lida;

import android.content.Context;
import android.content.SharedPreferences;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Fila do widget de adição rápida: o que a pessoa anotou ou concluiu pelo widget com o app fechado.
 * O app lê a fila quando abre (ou na hora, se estiver aberto), aplica e confirma (ack).
 * Fica nas preferências privadas do app até ser aplicada. Operações:
 *   { id, op: "add", text, day, at }   tarefa nova (o texto passa pelo mesmo parser da adição rápida)
 *   { id, op: "done", task, at }       concluir a tarefa de id "task"
 */
final class QuickStore {
    static final String PREFS = "lida_quick";
    private static final String KEY = "queue";
    private static final int MAX = 200;

    private QuickStore() {}

    private static SharedPreferences sp(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized JSONArray read(Context ctx) {
        try {
            return new JSONArray(sp(ctx).getString(KEY, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static void write(Context ctx, JSONArray a) {
        sp(ctx).edit().putString(KEY, a.toString()).apply();
    }

    private static String newId() {
        return "q" + Long.toString(System.currentTimeMillis(), 36) + Integer.toString((int) (Math.random() * 1296), 36);
    }

    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    static synchronized void add(Context ctx, String text) {
        JSONArray a = read(ctx);
        if (a.length() >= MAX) return;
        try {
            JSONObject o = new JSONObject();
            o.put("id", newId());
            o.put("op", "add");
            o.put("text", text);
            o.put("day", today());
            o.put("at", System.currentTimeMillis());
            a.put(o);
        } catch (Exception ignored) {
            return;
        }
        write(ctx, a);
    }

    static synchronized void done(Context ctx, String task) {
        JSONArray a = read(ctx);
        if (a.length() >= MAX || doneIds(a).contains(task)) return;
        try {
            JSONObject o = new JSONObject();
            o.put("id", newId());
            o.put("op", "done");
            o.put("task", task);
            o.put("at", System.currentTimeMillis());
            a.put(o);
        } catch (Exception ignored) {
            return;
        }
        write(ctx, a);
    }

    /** Tira da fila as operações já aplicadas pelo app. */
    static synchronized void ack(Context ctx, Set<String> ids) {
        JSONArray a = read(ctx);
        JSONArray keep = new JSONArray();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && !ids.contains(o.optString("id"))) keep.put(o);
        }
        write(ctx, keep);
    }

    static Set<String> doneIds(JSONArray a) {
        Set<String> out = new HashSet<>();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && "done".equals(o.optString("op"))) out.add(o.optString("task"));
        }
        return out;
    }
}
