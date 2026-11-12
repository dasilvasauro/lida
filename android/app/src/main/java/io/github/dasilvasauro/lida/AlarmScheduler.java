package io.github.dasilvasauro.lida;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Alarmes de tela cheia (tarefas, rotinas e hábitos) agendados no sistema.
 * A lista vem do app (sync) e fica guardada aqui, para tocar com o app fechado e voltar depois de
 * reiniciar o celular. Rotina e hábito repetem nos dias deles: ao tocar, o próximo já é agendado.
 * O som é o da notificação (um canal por toque, uso "alarme", repetindo até a pessoa responder);
 * a tela é a AlarmActivity (alarm.html numa WebView, com a fonte e as cores do tema).
 */
final class AlarmScheduler {
    static final String PREFS = "lida_alarms";
    static final String ACTION_FIRE = "io.github.dasilvasauro.lida.ALARM_FIRE";
    static final String ACTION_IGNORE = "io.github.dasilvasauro.lida.ALARM_IGNORE";
    static final String[] TONES = { "classico", "digital", "sinos", "marimba", "amanhecer", "passaros" };

    private AlarmScheduler() {}

    static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONArray stored(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString("alarms", "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    static JSONObject find(Context ctx, int id) {
        JSONArray a = stored(ctx);
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && o.optInt("id") == id) return o;
        }
        return null;
    }

    static PendingIntent fireIntent(Context ctx, int id) {
        Intent i = new Intent(ctx, AlarmReceiver.class).setAction(ACTION_FIRE).putExtra("id", id);
        return PendingIntent.getBroadcast(ctx, id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Troca tudo o que estava agendado pela lista nova. */
    static void replaceAll(Context ctx, JSONArray alarms, JSONObject look, JSONObject t) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        JSONArray old = stored(ctx);
        for (int i = 0; i < old.length(); i++) {
            JSONObject o = old.optJSONObject(i);
            if (o != null) am.cancel(fireIntent(ctx, o.optInt("id")));
        }
        prefs(ctx).edit().putString("alarms", alarms.toString()).putString("look", look.toString()).putString("t", t.toString()).apply();
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject o = alarms.optJSONObject(i);
            if (o != null) schedule(ctx, o.optInt("id"), o.optLong("at"));
        }
    }

    static void rescheduleStored(Context ctx) {
        JSONArray a = stored(ctx);
        long now = System.currentTimeMillis();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o == null) continue;
            long at = o.optLong("at");
            if (at < now - 60000 && o.optJSONArray("repeat") != null) {
                at = next(o, now);
                try {
                    o.put("at", at);
                } catch (Exception ignored) {
                    // segue com o horário antigo
                }
            }
            if (at > now - 60000) schedule(ctx, o.optInt("id"), at);
        }
        prefs(ctx).edit().putString("alarms", a.toString()).apply();
    }

    static void schedule(Context ctx, int id, long at) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        PendingIntent op = fireIntent(ctx, id);
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        if (exact) {
            Intent show = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent showPi = PendingIntent.getActivity(ctx, id, show, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, showPi), op);
        } else {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, op);
        }
    }

    /** Próximo dia da semana permitido (repeat: 0 = domingo), no mesmo horário. */
    static long next(JSONObject o, long after) {
        JSONArray rep = o.optJSONArray("repeat");
        String time = o.optString("time", "08:00");
        int hh = 8;
        int mm = 0;
        try {
            hh = Integer.parseInt(time.substring(0, 2));
            mm = Integer.parseInt(time.substring(3, 5));
        } catch (Exception ignored) {
            // horário padrão
        }
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(after);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        for (int i = 0; i < 9; i++) {
            c.set(Calendar.HOUR_OF_DAY, hh);
            c.set(Calendar.MINUTE, mm);
            int wd = c.get(Calendar.DAY_OF_WEEK) - 1;
            boolean ok = false;
            for (int k = 0; rep != null && k < rep.length(); k++) if (rep.optInt(k) == wd) ok = true;
            if (ok && c.getTimeInMillis() > after + 30000) return c.getTimeInMillis();
            c.add(Calendar.DAY_OF_MONTH, 1);
        }
        return after + 86400000L;
    }

    // Nome do toque no idioma do sistema (res/values*/strings.xml), para o nome do canal.
    static String toneName(Context ctx, String tone) {
        int id = ctx.getResources().getIdentifier("tone_" + tone, "string", ctx.getPackageName());
        return id != 0 ? ctx.getString(id) : tone;
    }

    static String channelFor(Context ctx, String tone) {
        boolean known = false;
        for (String x : TONES) if (x.equals(tone)) known = true;
        if (!known) tone = "classico";
        String id = "lida_alarm_" + tone;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(id) == null) {
            NotificationChannel ch = new NotificationChannel(id, ctx.getString(R.string.ch_alarm, toneName(ctx, tone)), NotificationManager.IMPORTANCE_HIGH);
            int res = ctx.getResources().getIdentifier("alarm_" + tone, "raw", ctx.getPackageName());
            Uri snd = Uri.parse("android.resource://" + ctx.getPackageName() + "/" + res);
            AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
            ch.setSound(snd, aa);
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[] { 0, 700, 500, 700, 500, 700 });
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setDescription(ctx.getString(R.string.ch_alarm_desc));
            nm.createNotificationChannel(ch);
        }
        return id;
    }

    /** Monta o JSON que a tela do alarme (alarm.html) recebe. */
    static String payload(Context ctx, JSONObject alarm) {
        try {
            JSONObject look = new JSONObject(prefs(ctx).getString("look", "{}"));
            JSONObject t = new JSONObject(prefs(ctx).getString("t", "{}"));
            String kind = alarm.optString("kind", "task");
            JSONObject texts = new JSONObject();
            texts.put("kind", t.optString(kind, "Alarme"));
            texts.put("done", "habit".equals(kind) ? t.optString("doneHabit", "Feito") : t.optString("done", "Concluir"));
            texts.put("ignore", t.optString("ignore", "Ignorar"));
            look.put("title", alarm.optString("title"));
            look.put("desc", alarm.optString("desc"));
            look.put("kind", kind);
            look.put("key", alarm.optString("key"));
            look.put("sound", "");
            look.put("t", texts);
            return look.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    /** Toca: notificação de tela cheia (abre a AlarmActivity, inclusive com o celular bloqueado). */
    static void ring(Context ctx, JSONObject alarm) {
        int id = alarm.optInt("id");
        String channel = channelFor(ctx, alarm.optString("tone", "classico"));
        Intent full = new Intent(ctx, AlarmActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION)
            .putExtra("id", id)
            .putExtra("payload", payload(ctx, alarm))
            .putExtra("kind", alarm.optString("kind"))
            .putExtra("ref", alarm.optString("ref"));
        PendingIntent fullPi = PendingIntent.getActivity(ctx, id, full, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent donePi = PendingIntent.getActivity(ctx, id + 1, doneIntent(ctx, alarm), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent ign = new Intent(ctx, AlarmReceiver.class).setAction(ACTION_IGNORE).putExtra("id", id);
        PendingIntent ignPi = PendingIntent.getBroadcast(ctx, id + 2, ign, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        JSONObject t;
        try {
            t = new JSONObject(prefs(ctx).getString("t", "{}"));
        } catch (Exception e) {
            t = new JSONObject();
        }
        String kind = alarm.optString("kind", "task");
        int icon = ctx.getResources().getIdentifier("ic_stat_lida", "drawable", ctx.getPackageName());
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(ctx, channel) : new Notification.Builder(ctx);
        String desc = alarm.optString("desc", "");
        b.setSmallIcon(icon != 0 ? icon : ctx.getApplicationInfo().icon)
            .setContentTitle(alarm.optString("title"))
            .setContentText(desc.isEmpty() ? alarm.optString("time", "") : desc)
            .setCategory(Notification.CATEGORY_ALARM)
            .setPriority(Notification.PRIORITY_MAX)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullPi)
            .setFullScreenIntent(fullPi, true)
            .addAction(new Notification.Action.Builder(null, "habit".equals(kind) ? t.optString("doneHabit", "Feito") : t.optString("done", "Concluir"), donePi).build())
            .addAction(new Notification.Action.Builder(null, t.optString("ignore", "Ignorar"), ignPi).build());
        if (Build.VERSION.SDK_INT >= 26) b.setTimeoutAfter(10 * 60 * 1000);
        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        try {
            nm.notify(id, n);
        } catch (SecurityException ignored) {
            // sem permissão de notificações: ao menos tenta abrir a tela
        }
    }

    /** Abre o app com o link que conclui a tarefa/rotina/hábito (o app aplica as regras e a recompensa). */
    static Intent doneIntent(Context ctx, JSONObject alarm) {
        Uri u = Uri.parse("lida://alarme?feito=" + alarm.optString("kind", "task") + ":" + Uri.encode(alarm.optString("ref")));
        return new Intent(Intent.ACTION_VIEW, u, ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    }

    static void stop(Context ctx, int id) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(id);
    }
}
