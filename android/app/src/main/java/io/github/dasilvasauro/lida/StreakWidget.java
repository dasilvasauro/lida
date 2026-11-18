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
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

/**
 * Widget "Ofensiva" (estilo Duolingo): o Lidinho com a cara do momento, os dias seguidos e o que falta
 * hoje. Os dados vêm do app (chave "streak"); a cara muda com a hora mesmo com o app fechado:
 * manhã, urgente (18h sem a meta), feito, pijama (meta batida e 21h), quebrada e abandonado.
 */
public class StreakWidget extends AppWidgetProvider {

    static final int LIT = 0xFFFF7A2E;
    static final int OFF = 0xFF9AA2B0;

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, StreakWidget.class));
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    static long daysBetween(String a, String b) {
        try {
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            long da = f.parse(a).getTime();
            long db = f.parse(b).getTime();
            return Math.round((db - da) / 86400000.0);
        } catch (Exception e) {
            return 0;
        }
    }

    static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_streak);
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("lida://ofensiva"), ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.s_root, PendingIntent.getActivity(ctx, 12, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        SharedPreferences sp = ctx.getSharedPreferences(TodayWidget.PREFS, Context.MODE_PRIVATE);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        JSONObject tx = new JSONObject();
        JSONObject s = null;
        String date = today;
        try {
            String raw = sp.getString("data", null);
            JSONObject d = raw == null ? null : new JSONObject(raw);
            if (d != null) {
                s = d.optJSONObject("streak");
                date = d.optString("date", today);
                if (d.optJSONObject("txt") != null) tx = d.optJSONObject("txt");
            }
        } catch (Exception ignored) {
            // dados inválidos: widget vazio
        }
        int count = s == null ? 0 : s.optInt("count");
        boolean met = s != null && s.optBoolean("todayMet");
        int broken = s == null ? 0 : s.optInt("broken");
        String lastActive = s == null ? date : s.optString("lastActive", date);
        int pct = s == null ? 0 : s.optInt("pct");
        String line = s == null ? "" : s.optString("line", "");
        long since = daysBetween(date, today);
        if (since == 1) {
            // dados de ontem: se ontem bateu, a ofensiva segue esperando hoje; se não, quebrou
            if (met) {
                met = false;
                broken = 0;
            } else {
                broken = count >= 2 ? count : 0;
                count = 0;
            }
            pct = 0;
            line = "";
        } else if (since >= 2) {
            count = 0;
            met = false;
            broken = 0;
            pct = 0;
            line = "";
        }
        long idle = daysBetween(lastActive, today);
        String mood;
        if (s == null) mood = "manha";
        else if (idle >= 3 && !met) mood = "abandonado";
        else if (met) mood = hour >= 21 || hour < 4 ? "pijama" : "feito";
        else if (broken >= 2) mood = "quebrada";
        else if (hour >= 18) mood = "urgente";
        else mood = "manha";

        int img = ctx.getResources().getIdentifier("lidinho_" + mood, "drawable", ctx.getPackageName());
        if (img != 0) v.setImageViewResource(R.id.s_lidi, img);
        v.setInt(R.id.s_flame, "setColorFilter", met ? LIT : OFF);
        v.setTextViewText(R.id.s_count, String.valueOf(count));
        v.setTextColor(R.id.s_count, met ? LIT : ctx.getResources().getColor(R.color.widget_text, null));
        v.setTextViewText(R.id.s_label, count == 1 ? tx.optString("streakDay", ctx.getString(R.string.widget_streak_day)) : tx.optString("streakDays", ctx.getString(R.string.widget_streak_days)));
        v.setTextViewText(R.id.s_msg, s == null ? tx.optString("streakOpen", ctx.getString(R.string.widget_streak_open)) : tx.optString("mood_" + mood, ""));
        v.setProgressBar(R.id.s_bar, 100, Math.max(0, Math.min(100, pct)), false);
        v.setViewVisibility(R.id.s_bar, s == null ? View.GONE : View.VISIBLE);
        v.setTextViewText(R.id.s_line, line);
        v.setViewVisibility(R.id.s_line, line.isEmpty() ? View.GONE : View.VISIBLE);
        return v;
    }
}
