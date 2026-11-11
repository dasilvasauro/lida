package io.github.dasilvasauro.lida;

import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Coisas do sistema que a página não faz sozinha:
 * - atualizar o app sem sair dele: baixa o APK da Release do GitHub, confere o SHA-256 publicado e
 *   entrega ao instalador do Android (PackageInstaller). Do Android 12 em diante, depois que o próprio
 *   Lida fez uma atualização, as próximas podem dispensar a confirmação (o sistema decide);
 * - buscar textos fora do alcance do fetch da página (o GitHub não libera CORS nos arquivos da Release);
 * - salvar arquivos em Downloads (backup .lida);
 * - conversar com a nuvem da pessoa (Dropbox, OneDrive, WebDAV/Nextcloud) sem as travas de CORS da
 *   página e com os métodos do WebDAV (PROPFIND, MKCOL), que o HttpURLConnection não aceita;
 * - abrir um endereço no navegador do sistema (login do Dropbox e da Microsoft).
 * Na variante do F-Droid o atualizador fica desligado (lá quem atualiza é o próprio F-Droid).
 */
@CapacitorPlugin(name = "LidaApp")
public class LidaAppPlugin extends Plugin {

    static final String ACTION_INSTALL_STATUS = "io.github.dasilvasauro.lida.INSTALL_STATUS";

    @PluginMethod
    public void info(PluginCall call) {
        Context ctx = getContext();
        JSObject r = new JSObject();
        try {
            PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            r.put("versionName", pi.versionName);
            long code = pi.versionCode;
            if (Build.VERSION.SDK_INT >= 28) code = pi.getLongVersionCode();
            r.put("versionCode", code);
        } catch (Exception e) {
            r.put("versionCode", 0);
        }
        r.put("sdk", Build.VERSION.SDK_INT);
        boolean canInstall = true;
        if (Build.VERSION.SDK_INT >= 26) canInstall = ctx.getPackageManager().canRequestPackageInstalls();
        r.put("canInstall", canInstall);
        r.put("updater", BuildConfig.LIDA_UPDATER);
        call.resolve(r);
    }

    /* ---------- Rede ---------- */

    private HttpURLConnection open(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setInstanceFollowRedirects(true);
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setRequestProperty("User-Agent", "Lida-Android");
        c.setRequestProperty("Accept", "application/json, application/octet-stream, */*");
        // O GitHub redireciona os arquivos da Release para outro host (https → https): segue até 5 vezes.
        for (int i = 0; i < 5; i++) {
            int code = c.getResponseCode();
            if (code < 300 || code >= 400) break;
            String loc = c.getHeaderField("Location");
            c.disconnect();
            c = (HttpURLConnection) new URL(new URL(url), loc).openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setRequestProperty("User-Agent", "Lida-Android");
        }
        return c;
    }

    @PluginMethod
    public void fetchText(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("URL inválida");
            return;
        }
        new Thread(() -> {
            try {
                HttpURLConnection c = open(url);
                int code = c.getResponseCode();
                InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
                java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while (in != null && (n = in.read(buf)) > 0 && bos.size() < 2_000_000) bos.write(buf, 0, n);
                if (in != null) in.close();
                c.disconnect();
                JSObject r = new JSObject();
                r.put("status", code);
                r.put("text", bos.toString("UTF-8"));
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Sem conexão: " + e.getMessage());
            }
        }).start();
    }

    /* ---------- Nuvem da pessoa ---------- */

    private static OkHttpClient client;

    private static synchronized OkHttpClient client() {
        if (client == null) {
            client = new OkHttpClient.Builder()
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(90, TimeUnit.SECONDS)
                .writeTimeout(90, TimeUnit.SECONDS)
                .followRedirects(true)
                .followSslRedirects(false)
                .build();
        }
        return client;
    }

    // { method, url, headers, body } -> { status, text, headers }. Só https e só texto.
    @PluginMethod
    public void http(PluginCall call) {
        String url = call.getString("url");
        String method = call.getString("method", "GET").toUpperCase();
        String body = call.getString("body");
        JSObject headers = call.getObject("headers", new JSObject());
        int timeout = call.getInt("timeout", 45000);
        if (url == null || !url.startsWith("https://")) {
            call.reject("Use um endereço https://");
            return;
        }
        new Thread(() -> {
            try {
                String ctype = null;
                Request.Builder b = new Request.Builder().url(url);
                Iterator<String> keys = headers.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    String v = headers.getString(k);
                    if (v == null) continue;
                    if (k.equalsIgnoreCase("Content-Type")) ctype = v;
                    else b.header(k, v);
                }
                b.header("User-Agent", "Lida-Android");
                RequestBody rb = null;
                boolean needsBody = method.equals("POST") || method.equals("PUT") || method.equals("PATCH") || method.equals("PROPFIND");
                if (body != null || needsBody) {
                    byte[] bytes = body == null ? new byte[0] : body.getBytes("UTF-8");
                    rb = RequestBody.create(bytes, ctype == null ? null : MediaType.parse(ctype));
                }
                b.method(method, rb);
                OkHttpClient c = client().newBuilder().callTimeout(Math.max(5000, timeout), TimeUnit.MILLISECONDS).build();
                try (Response r = c.newCall(b.build()).execute()) {
                    JSObject out = new JSObject();
                    out.put("status", r.code());
                    out.put("text", r.body() != null ? r.body().string() : "");
                    JSObject h = new JSObject();
                    for (String name : r.headers().names()) h.put(name.toLowerCase(), r.header(name));
                    out.put("headers", h);
                    call.resolve(out);
                }
            } catch (Exception e) {
                call.reject("Sem conexão: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("URL inválida");
            return;
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Não há navegador para abrir o endereço.");
        }
    }

    /* ---------- Atualização ---------- */

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String sha = call.getString("sha256", "");
        if (!BuildConfig.LIDA_UPDATER) {
            call.reject("Atualizador desligado nesta versão");
            return;
        }
        if (url == null || !url.startsWith("https://")) {
            call.reject("URL inválida");
            return;
        }
        new Thread(() -> {
            File dir = new File(getContext().getCacheDir(), "update");
            dir.mkdirs();
            File out = new File(dir, "lida.apk");
            try {
                HttpURLConnection c = open(url);
                if (c.getResponseCode() >= 400) throw new Exception("HTTP " + c.getResponseCode());
                long total = c.getContentLengthLong();
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                try (InputStream in = c.getInputStream(); OutputStream os = new FileOutputStream(out)) {
                    byte[] buf = new byte[65536];
                    long done = 0;
                    long last = 0;
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        os.write(buf, 0, n);
                        md.update(buf, 0, n);
                        done += n;
                        if (done - last > 262144 || done == total) {
                            last = done;
                            JSObject p = new JSObject();
                            p.put("done", done);
                            p.put("total", total);
                            notifyListeners("progress", p);
                        }
                    }
                }
                c.disconnect();
                StringBuilder hex = new StringBuilder();
                for (byte x : md.digest()) hex.append(String.format("%02x", x));
                if (!sha.isEmpty() && !hex.toString().equalsIgnoreCase(sha)) {
                    out.delete();
                    call.reject("O arquivo baixado não confere (SHA-256). Tente de novo.");
                    return;
                }
                JSObject r = new JSObject();
                r.put("path", out.getAbsolutePath());
                r.put("sha256", hex.toString());
                call.resolve(r);
            } catch (Exception e) {
                out.delete();
                call.reject("Não consegui baixar a atualização: " + e.getMessage());
            }
        }).start();
    }

    // Abre a tela "Instalar apps desconhecidos" para o Lida (precisa uma vez).
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 26) {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        Context ctx = getContext();
        if (!BuildConfig.LIDA_UPDATER) {
            call.reject("Atualizador desligado nesta versão");
            return;
        }
        if (Build.VERSION.SDK_INT >= 26 && !ctx.getPackageManager().canRequestPackageInstalls()) {
            call.reject("need-permission");
            return;
        }
        new Thread(() -> {
            try {
                File f = new File(path);
                PackageInstaller pi = ctx.getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(ctx.getPackageName());
                params.setSize(f.length());
                if (Build.VERSION.SDK_INT >= 31) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                int id = pi.createSession(params);
                try (PackageInstaller.Session s = pi.openSession(id)) {
                    try (InputStream in = new FileInputStream(f); OutputStream os = s.openWrite("lida.apk", 0, f.length())) {
                        byte[] buf = new byte[65536];
                        int n;
                        while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
                        s.fsync(os);
                    }
                    Intent cb = new Intent(ctx, UpdateReceiver.class).setAction(ACTION_INSTALL_STATUS);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
                    PendingIntent pend = PendingIntent.getBroadcast(ctx, id, cb, flags);
                    s.commit(pend.getIntentSender());
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("Não consegui instalar: " + e.getMessage());
            }
        }).start();
    }

    /* ---------- Arquivos ---------- */

    // Salva em Downloads (backup .lida). data: base64.
    @PluginMethod
    public void saveFile(PluginCall call) {
        String name = call.getString("name", "lida.bin");
        String mime = call.getString("mime", "application/octet-stream");
        String data = call.getString("data", "");
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            JSObject r = new JSObject();
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = getContext().getContentResolver();
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, "Download");
                Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) throw new Exception("sem acesso a Downloads");
                try (OutputStream os = cr.openOutputStream(uri)) {
                    os.write(bytes);
                }
                r.put("where", "Downloads/" + name);
            } else {
                File dir = getContext().getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS);
                File f = new File(dir, name);
                try (OutputStream os = new FileOutputStream(f)) {
                    os.write(bytes);
                }
                r.put("where", f.getAbsolutePath());
            }
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Não consegui salvar o arquivo: " + e.getMessage());
        }
    }
}
