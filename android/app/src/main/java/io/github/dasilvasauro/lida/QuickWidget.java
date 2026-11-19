package io.github.dasilvasauro.lida;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget "Adição rápida".
 *   - O botão + abre a QuickAddActivity: uma janelinha com o campo de texto, sem abrir o app.
 *   - A lista mostra as tarefas de hoje (e atrasadas) que o app mandou; o círculo conclui ali mesmo.
 * O que é feito aqui entra na fila (QuickStore) e aparece no widget na hora: a tarefa concluída some,
 * a anotada aparece como "anotada". O app aplica a fila quando abre (ou na hora, se estiver aberto).
 */
public class QuickWidget extends AppWidgetProvider {

    static final String ACTION_DONE = "io.github.dasilvasauro.lida.QUICK_DONE";
    private static final int[] ROWS = { R.id.q_row0, R.id.q_row1, R.id.q_row2, R.id.q_row3, R.id.q_row4, R.id.q_row5 };
    private static final int[] CHK = { R.id.q_chk0, R.id.q_chk1, R.id.q_chk2, R.id.q_chk3, R.id.q_chk4, R.id.q_chk5 };
    private static final int[] TXT = { R.id.q_txt0, R.id.q_txt1, R.id.q_txt2, R.id.q_txt3, R.id.q_txt4, R.id.q_txt5 };
    private static final int[] TIME = { R.id.q_time0, R.id.q_time1, R.id.q_time2, R.id.q_time3, R.id.q_time4, R.id.q_time5 };

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (ACTION_DONE.equals(intent.getAction())) {
            String task = intent.getStringExtra("task");
            if (task != null && !task.isEmpty()) {
                QuickStore.done(ctx, task);
                refreshAll(ctx);
                LidaWidgetPlugin.queueChanged();
            }
        }
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, QuickWidget.class));
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    private static PendingIntent open(Context ctx, String route, int code) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("lida://" + route), ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent addIntent(Context ctx) {
        Intent i = new Intent(ctx, QuickAddActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NO_ANIMATION);
        return PendingIntent.getActivity(ctx, 300, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent doneIntent(Context ctx, String task, int row) {
        Intent i = new Intent(ctx, QuickWidget.class);
        i.setAction(ACTION_DONE);
        i.putExtra("task", task);
        // um código por linha: cada círculo leva o id da sua tarefa
        return PendingIntent.getBroadcast(ctx, 310 + row, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static int prioColor(String p, int fallback) {
        switch (p == null ? "" : p) {
            case "P0": return Color.parseColor("#E5484D");
            case "P1": return Color.parseColor("#F08A24");
            case "P2": return Color.parseColor("#3E8EDE");
            default: return fallback;
        }
    }

    static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_quick);
        v.setOnClickPendingIntent(R.id.q_add, addIntent(ctx));
        v.setOnClickPendingIntent(R.id.q_head, open(ctx, "hoje", 301));
        v.setOnClickPendingIntent(R.id.q_more, open(ctx, "hoje", 302));
        int accent = ctx.getResources().getColor(R.color.widget_accent, null);
        int muted = ctx.getResources().getColor(R.color.widget_muted, null);
        SharedPreferences sp = ctx.getSharedPreferences(TodayWidget.PREFS, Context.MODE_PRIVATE);
        String raw = sp.getString("data", null);
        String today = QuickStore.today();
        JSONArray queue = QuickStore.read(ctx);
        Set<String> doneIds = QuickStore.doneIds(queue);
        try {
            JSONObject d = raw == null ? null : new JSONObject(raw);
            JSONObject tx = d == null ? null : d.optJSONObject("txt");
            if (tx == null) tx = new JSONObject();
            boolean fresh = d != null && today.equals(d.optString("date"));
            v.setTextViewText(R.id.q_title, tx.optString("today", ctx.getString(R.string.widget_today)));
            // tarefas do app (sem as concluídas aqui) + as anotadas aqui que o app ainda não leu
            JSONArray list = fresh ? d.optJSONArray("quick") : null;
            int shown = 0;
            int hiddenDone = 0;
            int total = list == null ? 0 : list.length();
            for (int i = 0; list != null && i < list.length() && shown < ROWS.length; i++) {
                JSONObject t = list.getJSONObject(i);
                String id = t.optString("id");
                if (doneIds.contains(id)) { hiddenDone++; continue; }
                v.setViewVisibility(ROWS[shown], View.VISIBLE);
                v.setTextViewText(CHK[shown], "○");
                v.setTextColor(CHK[shown], prioColor(t.optString("p"), accent));
                v.setTextViewText(TXT[shown], t.optString("t"));
                v.setTextViewText(TIME[shown], t.optString("time", ""));
                v.setOnClickPendingIntent(CHK[shown], doneIntent(ctx, id, shown));
                v.setOnClickPendingIntent(TXT[shown], open(ctx, "hoje", 320 + shown));
                shown++;
            }
            int pending = 0;
            for (int i = 0; i < queue.length(); i++) {
                JSONObject o = queue.optJSONObject(i);
                if (o == null || !"add".equals(o.optString("op"))) continue;
                pending++;
                if (shown >= ROWS.length) continue;
                v.setViewVisibility(ROWS[shown], View.VISIBLE);
                v.setTextViewText(CHK[shown], "+");
                v.setTextColor(CHK[shown], muted);
                v.setTextViewText(TXT[shown], o.optString("text"));
                v.setTextViewText(TIME[shown], tx.optString("noted", ctx.getString(R.string.quick_pending)));
                v.setOnClickPendingIntent(CHK[shown], open(ctx, "hoje", 330 + shown));
                v.setOnClickPendingIntent(TXT[shown], open(ctx, "hoje", 320 + shown));
                shown++;
            }
            for (int i = shown; i < ROWS.length; i++) v.setViewVisibility(ROWS[i], View.GONE);
            int left = (total - hiddenDone) + pending - shown;
            v.setViewVisibility(R.id.q_more, left > 0 ? View.VISIBLE : View.GONE);
            v.setTextViewText(R.id.q_more, tx.optString("more", "+{0}").replace("{0}", String.valueOf(left)));
            v.setViewVisibility(R.id.q_empty, shown == 0 ? View.VISIBLE : View.GONE);
            if (!fresh) v.setTextViewText(R.id.q_empty, tx.optString("tapDay", ctx.getString(R.string.widget_tap)));
            else v.setTextViewText(R.id.q_empty, tx.optString("quickEmpty", ctx.getString(R.string.quick_empty)));
            int done = fresh ? d.optInt("done") + hiddenDone : 0;
            int all = fresh ? d.optInt("total") : 0;
            v.setTextViewText(R.id.q_sub, all == 0 ? "" : tx.optString("ofN", "{0} de {1}").replace("{0}", String.valueOf(done)).replace("{1}", String.valueOf(all)));
            v.setProgressBar(R.id.q_bar, Math.max(1, all), Math.min(done, Math.max(1, all)), false);
        } catch (Exception e) {
            for (int r : ROWS) v.setViewVisibility(r, View.GONE);
            v.setViewVisibility(R.id.q_empty, View.VISIBLE);
        }
        return v;
    }
}
