package io.github.dasilvasauro.lida;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget grande "IPL da semana": barras com a nota de cada um dos últimos 7 dias (hoje, parcial e mais
 * clara), a média e uma frase. Os dados vêm do app (chave "iplWeek"). Tocar abre a aba Eu.
 */
public class WeekWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx, mgr, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle opts) {
        mgr.updateAppWidget(id, build(ctx, mgr, id));
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, WeekWidget.class));
        for (int id : ids) mgr.updateAppWidget(id, build(ctx, mgr, id));
    }

    static int color(int score) {
        if (score >= 85) return 0xFF3DD6A3;
        if (score >= 70) return 0xFF7C8CFF;
        if (score >= 50) return 0xFFF2C14E;
        return 0xFFFF7A6B;
    }

    static Bitmap chart(Context ctx, JSONArray days, int wDp, int hDp) {
        float dn = ctx.getResources().getDisplayMetrics().density;
        int w = Math.round(Math.max(180, wDp) * dn);
        int h = Math.round(Math.max(90, hDp) * dn);
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        int text = ctx.getResources().getColor(R.color.widget_text, null);
        int muted = ctx.getResources().getColor(R.color.widget_muted, null);
        int track = ctx.getResources().getColor(R.color.widget_track, null);
        int n = days == null ? 0 : days.length();
        if (n == 0) return bmp;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setTextAlign(Paint.Align.CENTER);
        float labelH = 16 * dn;
        float valueH = 16 * dn;
        float top = valueH;
        float bottom = h - labelH - 4 * dn;
        float slot = (float) w / n;
        float bw = Math.min(slot * 0.56f, 34 * dn);
        for (int i = 0; i < n; i++) {
            JSONObject d = days.optJSONObject(i);
            if (d == null) continue;
            float cx = slot * i + slot / 2;
            boolean has = !d.isNull("s");
            int s = d.optInt("s", 0);
            boolean isToday = d.optBoolean("today");
            RectF bg = new RectF(cx - bw / 2, top, cx + bw / 2, bottom);
            p.setColor(track);
            c.drawRoundRect(bg, bw / 2.6f, bw / 2.6f, p);
            if (has) {
                float y = bottom - (bottom - top) * Math.max(0.04f, Math.min(1f, s / 100f));
                p.setColor(color(s));
                p.setAlpha(isToday ? 140 : 255);
                c.drawRoundRect(new RectF(cx - bw / 2, y, cx + bw / 2, bottom), bw / 2.6f, bw / 2.6f, p);
                p.setAlpha(255);
                t.setColor(text);
                t.setTextSize(11.5f * dn);
                t.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
                c.drawText(String.valueOf(s), cx, Math.max(valueH - 3 * dn, y - 4 * dn), t);
            } else {
                t.setColor(muted);
                t.setTextSize(12 * dn);
                c.drawText("–", cx, bottom - 6 * dn, t);
            }
            t.setColor(isToday ? text : muted);
            t.setTextSize(11 * dn);
            t.setTypeface(Typeface.create(Typeface.DEFAULT, isToday ? Typeface.BOLD : Typeface.NORMAL));
            c.drawText(d.optString("l"), cx, h - 3 * dn, t);
        }
        return bmp;
    }

    static RemoteViews build(Context ctx, AppWidgetManager mgr, int id) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_week);
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("lida://eu"), ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.w7_root, PendingIntent.getActivity(ctx, 13, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        SharedPreferences sp = ctx.getSharedPreferences(TodayWidget.PREFS, Context.MODE_PRIVATE);
        JSONObject wk = null;
        try {
            String raw = sp.getString("data", null);
            JSONObject d = raw == null ? null : new JSONObject(raw);
            if (d != null) wk = d.optJSONObject("iplWeek");
        } catch (Exception ignored) {
            // sem dados
        }
        int wDp = 260;
        int hDp = 120;
        if (mgr != null && id != 0) {
            Bundle o = mgr.getAppWidgetOptions(id);
            if (o != null) {
                wDp = Math.max(160, o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 260) - 28);
                hDp = Math.max(70, o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 180) - 90);
            }
        }
        if (wk == null) {
            v.setTextViewText(R.id.w7_note, ctx.getString(R.string.widget_streak_open));
            return v;
        }
        v.setTextViewText(R.id.w7_title, wk.optString("title", ctx.getString(R.string.widget_week_name)));
        v.setTextViewText(R.id.w7_avg, wk.optString("avg", ""));
        v.setTextViewText(R.id.w7_note, wk.optString("note", ""));
        v.setImageViewBitmap(R.id.w7_chart, chart(ctx, wk.optJSONArray("days"), wDp, hDp));
        return v;
    }
}
