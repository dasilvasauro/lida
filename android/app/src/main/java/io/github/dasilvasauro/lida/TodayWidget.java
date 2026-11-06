package io.github.dasilvasauro.lida;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget "Hoje": mostra o progresso do dia, as próximas tarefas e os hábitos.
 * Só exibe informação. Tocar abre o Lida na seção correspondente (lida://hoje, lida://habitos).
 * Os dados vêm do app (LidaWidgetPlugin). Depois da meia-noite, até o app abrir de novo,
 * o widget avisa que precisa atualizar em vez de mostrar o dia anterior.
 */
public class TodayWidget extends AppWidgetProvider {

    static final String PREFS = "lida_widget";
    private static final int[] ROWS = { R.id.w_task1, R.id.w_task2, R.id.w_task3, R.id.w_task4 };

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) {
            mgr.updateAppWidget(id, build(ctx));
        }
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, TodayWidget.class));
        for (int id : ids) {
            mgr.updateAppWidget(id, build(ctx));
        }
    }

    private static PendingIntent open(Context ctx, String route, int code) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("lida://" + route), ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_today);
        v.setOnClickPendingIntent(R.id.w_root, open(ctx, "hoje", 1));
        v.setOnClickPendingIntent(R.id.w_footer, open(ctx, "habitos", 2));
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = sp.getString("data", null);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        try {
            JSONObject d = raw == null ? null : new JSONObject(raw);
            if (d == null || !today.equals(d.optString("date"))) {
                v.setTextViewText(R.id.w_title, "Hoje");
                v.setTextViewText(R.id.w_sub, "");
                v.setProgressBar(R.id.w_bar, 1, 0, false);
                for (int r : ROWS) {
                    v.setViewVisibility(r, View.GONE);
                }
                v.setTextViewText(R.id.w_empty, "Toque para abrir o Lida e ver o seu dia.");
                v.setViewVisibility(R.id.w_empty, View.VISIBLE);
                v.setTextViewText(R.id.w_footer, "");
                return v;
            }
            int done = d.optInt("done");
            int total = d.optInt("total");
            v.setTextViewText(R.id.w_title, d.optString("title", "Hoje"));
            v.setTextViewText(R.id.w_sub, total == 0 ? "" : done + " de " + total);
            v.setProgressBar(R.id.w_bar, Math.max(1, total), done, false);
            JSONArray tasks = d.optJSONArray("tasks");
            int n = tasks == null ? 0 : tasks.length();
            for (int i = 0; i < ROWS.length; i++) {
                if (i < n) {
                    JSONObject t = tasks.getJSONObject(i);
                    String time = t.optString("time", "");
                    v.setTextViewText(ROWS[i], (time.isEmpty() ? "○  " : time + "  ") + t.optString("t"));
                    v.setViewVisibility(ROWS[i], View.VISIBLE);
                } else {
                    v.setViewVisibility(ROWS[i], View.GONE);
                }
            }
            v.setTextViewText(R.id.w_empty, total > 0 && n == 0 ? "Tudo feito por hoje." : "Dia livre. Toque para planejar.");
            v.setViewVisibility(R.id.w_empty, n == 0 ? View.VISIBLE : View.GONE);
            v.setTextViewText(R.id.w_footer, d.optString("footer", ""));
        } catch (Exception e) {
            v.setTextViewText(R.id.w_empty, "Toque para abrir o Lida.");
            v.setViewVisibility(R.id.w_empty, View.VISIBLE);
        }
        return v;
    }
}
