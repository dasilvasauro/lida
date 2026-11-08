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
import android.net.Uri;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

/**
 * Widget "Anéis": três anéis concêntricos com o progresso do dia — tarefas (fora), hábitos
 * (meio) e água (dentro). Os dados vêm do app junto com os do widget "Hoje" (chave "rings").
 * Tocar abre o Lida.
 */
public class RingsWidget extends AppWidgetProvider {

    static final int C_TASKS = 0xFF7C8CFF;
    static final int C_HABITS = 0xFF3DD6A3;
    static final int C_WATER = 0xFF5AA9FF;

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, RingsWidget.class));
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    private static CharSequence label(String dot, int color, String text) {
        SpannableString s = new SpannableString(dot + "  " + text);
        s.setSpan(new ForegroundColorSpan(color), 0, dot.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        return s;
    }

    private static float frac(int a, int b) {
        return b <= 0 ? 0f : Math.min(1f, (float) a / b);
    }

    static Bitmap rings(Context ctx, float t, float h, float w) {
        int size = Math.round(160 * ctx.getResources().getDisplayMetrics().density);
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        float stroke = size * 0.085f;
        float gap = stroke * 0.32f;
        int track = ctx.getResources().getColor(R.color.widget_track, null);
        float[] fr = { t, h, w };
        int[] col = { C_TASKS, C_HABITS, C_WATER };
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeWidth(stroke);
        for (int i = 0; i < 3; i++) {
            float inset = stroke / 2 + i * (stroke + gap) + 2;
            RectF r = new RectF(inset, inset, size - inset, size - inset);
            p.setColor(track);
            c.drawArc(r, 0, 360, false, p);
            p.setColor(col[i]);
            if (fr[i] >= 1f) c.drawArc(r, 0, 360, false, p);
            else if (fr[i] > 0f) c.drawArc(r, -90, Math.max(4f, 360 * fr[i]), false, p);
        }
        return bmp;
    }

    static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_rings);
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("lida://hoje"), ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.r_root, PendingIntent.getActivity(ctx, 11, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        SharedPreferences sp = ctx.getSharedPreferences(TodayWidget.PREFS, Context.MODE_PRIVATE);
        String raw = sp.getString("data", null);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        int td = 0, tt = 0, hd = 0, ht = 0, wml = 0, wgoal = 2000;
        try {
            JSONObject d = raw == null ? null : new JSONObject(raw);
            JSONObject r = d == null ? null : d.optJSONObject("rings");
            if (r != null && today.equals(d.optString("date"))) {
                td = r.optInt("tasksDone");
                tt = r.optInt("tasksTotal");
                hd = r.optInt("habitsDone");
                ht = r.optInt("habitsTotal");
                wml = r.optInt("waterMl");
                wgoal = Math.max(1, r.optInt("waterGoal", 2000));
            }
        } catch (Exception ignored) {
            // dados inválidos: anéis vazios
        }
        v.setImageViewBitmap(R.id.r_rings, rings(ctx, frac(td, tt), frac(hd, ht), frac(wml, wgoal)));
        v.setTextViewText(R.id.r_tasks, label("●", C_TASKS, tt == 0 ? "Tarefas –" : "Tarefas " + td + "/" + tt));
        v.setTextViewText(R.id.r_habits, label("●", C_HABITS, ht == 0 ? "Hábitos –" : "Hábitos " + hd + "/" + ht));
        String water = wml >= 1000 ? String.format(Locale.forLanguageTag("pt-BR"), "%.1f L", wml / 1000f) : wml + " ml";
        v.setTextViewText(R.id.r_water, label("●", C_WATER, "Água " + water));
        return v;
    }
}
