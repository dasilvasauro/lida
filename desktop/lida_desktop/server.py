"""Servidores locais do app.

- HTTP em http://localhost:PORTA: entrega os arquivos do Lida (a mesma versão web) e recebe da
  página o estado (/__desktop/state), as respostas dos comandos (/__desktop/reply), o aviso de
  pronto (/__desktop/ready) e o pedido de login com Google (/__desktop/google).
- Socket Unix ($XDG_RUNTIME_DIR/lida-desktop.sock): por onde a CLI `lida` manda comandos. Uma linha
  JSON por pedido, uma linha JSON de resposta.

Os dois rodam em threads; o que precisa da janela passa para a thread do Qt pelo Hub (sinais).
"""

import json
import mimetypes
import os
import socketserver
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import paths

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("audio/wav", ".wav")


def write_state(data):
    """Grava o estado para os widgets (troca atômica: o widget nunca lê um arquivo pela metade)."""
    paths.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = paths.STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, paths.STATE_FILE)


class Hub:
    """Fila de comandos para a página. `run_js(id, cmd, args)` é chamado na thread do Qt."""

    def __init__(self, run_js, on_state, on_python):
        self.run_js = run_js            # emite o sinal que executa o JS na thread do Qt
        self.on_state = on_state        # idem, para menu/bandeja
        self.on_python = on_python      # comandos que o próprio app resolve (mostrar, sair...)
        self.ready = threading.Event()
        self.lock = threading.Lock()
        self.next_id = 1
        self.pending = {}
        self.state = None

    def request(self, cmd, args=None, timeout=20.0):
        local = self.on_python(cmd, args or {})
        if local is not None:
            return local
        if not self.ready.wait(timeout=25):
            return {"ok": False, "error": "O Lida ainda não está pronto: abra a janela (falta entrar ou digitar a senha?).", "code": "not-ready"}
        with self.lock:
            rid = self.next_id
            self.next_id += 1
            ev = threading.Event()
            self.pending[rid] = {"ev": ev, "out": None}
        self.run_js(rid, cmd, args or {})
        if not ev.wait(timeout):
            with self.lock:
                self.pending.pop(rid, None)
            return {"ok": False, "error": "O Lida não respondeu a tempo.", "code": "timeout"}
        with self.lock:
            return self.pending.pop(rid)["out"]

    def reply(self, data):
        rid = data.get("id")
        with self.lock:
            p = self.pending.get(rid)
            if p:
                p["out"] = {k: v for k, v in data.items() if k != "id"}
                p["ev"].set()

    def set_state(self, data):
        self.state = data
        data = dict(data, running=True, pid=os.getpid())
        try:
            write_state(data)
        except OSError:
            pass
        self.on_state(data)


def proxy_http(req):
    """Requisição para a nuvem da pessoa (Dropbox, OneDrive, WebDAV/Nextcloud), feita pelo app.

    A página não consegue sozinha: o WebDAV e o login da Microsoft não liberam CORS, e o fetch não
    manda PROPFIND/MKCOL para fora. Só https e só texto. Devolve {status, text, headers}.
    Usa http.client para mandar exatamente os cabeçalhos pedidos (o urllib inventa um Content-Type
    que o Dropbox recusa).
    """
    import http.client
    import ssl
    from urllib.parse import urljoin, urlsplit

    url = str(req.get("url") or "")
    method = str(req.get("method") or "GET").upper()
    body = req.get("body")
    data = body.encode("utf-8") if isinstance(body, str) else None
    if data is None and method in ("POST", "PUT", "PATCH", "PROPFIND"):
        data = b""
    headers = {str(k): str(v) for k, v in (req.get("headers") or {}).items()}
    headers.setdefault("User-Agent", "Lida-Linux")
    timeout = max(5, min(int(req.get("timeout") or 45), 180))
    ctx = ssl.create_default_context()
    try:
        for _ in range(6):
            if not url.startswith("https://"):
                return {"error": "Use um endereço https://"}
            u = urlsplit(url)
            proxy = urlsplit(os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or "")
            if proxy.hostname:  # proxy do sistema (CONNECT)
                conn = http.client.HTTPSConnection(proxy.hostname, proxy.port or 3128, timeout=timeout, context=ctx)
                conn.set_tunnel(u.hostname, u.port or 443)
            else:
                conn = http.client.HTTPSConnection(u.hostname, u.port or 443, timeout=timeout, context=ctx)
            path = (u.path or "/") + (f"?{u.query}" if u.query else "")
            conn.request(method, path, body=data, headers=headers)
            res = conn.getresponse()
            if res.status in (301, 302, 303, 307, 308) and res.getheader("Location"):
                res.read()
                conn.close()
                url = urljoin(url, res.getheader("Location"))
                if res.status == 303 or (res.status in (301, 302) and method != "GET"):
                    method, data = "GET", None
                # O destino do redirecionamento (download do OneDrive) não recebe o token.
                headers = {k: v for k, v in headers.items() if k.lower() not in ("authorization", "content-type")}
                continue
            raw = res.read(64 * 1024 * 1024)
            out = {"status": res.status, "text": raw.decode("utf-8", "replace"), "headers": {k.lower(): v for k, v in res.getheaders()}}
            conn.close()
            return out
        return {"error": "Redirecionamentos demais."}
    except Exception as e:  # noqa: BLE001 - vai para a tela como "sem conexão"
        return {"error": f"Sem conexão: {e}"}


def make_http(hub, token, google_login):
    web = paths.WEB_DIR.resolve()

    class Handler(BaseHTTPRequestHandler):
        server_version = "Lida"

        def log_message(self, *a):  # silêncio no terminal
            pass

        def _send(self, code, body=b"", ctype="application/json"):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def do_HEAD(self):
            self.do_GET()

        def do_GET(self):
            path = self.path.split("?", 1)[0].split("#", 1)[0]
            if path.startswith("/__desktop/"):
                return self._send(405, b"{}")
            if path == "/":
                path = "/index.html"
            target = (web / path.lstrip("/")).resolve()
            if web not in target.parents and target != web or not target.is_file():
                return self._send(404, b"not found", "text/plain")
            ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
            if ctype.startswith("text/") or ctype in ("application/json", "application/manifest+json"):
                ctype += "; charset=utf-8"
            self._send(200, target.read_bytes(), ctype)

        def do_POST(self):
            if not self.path.startswith("/__desktop/"):
                return self._send(404, b"{}")
            if self.headers.get("X-Lida-Token") != token:
                return self._send(403, b'{"error":"token"}')
            n = int(self.headers.get("Content-Length") or 0)
            try:
                data = json.loads(self.rfile.read(n) or b"{}")
            except ValueError:
                return self._send(400, b'{"error":"json"}')
            route = self.path[len("/__desktop/"):]
            out = {"ok": True}
            if route == "state":
                hub.set_state(data)
            elif route == "reply":
                hub.reply(data)
            elif route == "ready":
                hub.ready.set()
            elif route == "http":
                out = proxy_http(data)
            elif route == "google":
                try:
                    out = {"idToken": google_login()}
                except Exception as e:  # noqa: BLE001 - a mensagem vai para a tela de login
                    out = {"error": str(e)}
            else:
                return self._send(404, b"{}")
            self._send(200, json.dumps(out).encode())

    srv = ThreadingHTTPServer(("127.0.0.1", paths.PORT), Handler)
    srv.daemon_threads = True
    return srv


def make_socket(hub):
    sock = paths.SOCKET

    class Handler(socketserver.StreamRequestHandler):
        def handle(self):
            for line in self.rfile:
                line = line.strip()
                if not line:
                    continue
                try:
                    req = json.loads(line)
                    out = hub.request(req.get("cmd", ""), req.get("args") or {}, timeout=float(req.get("timeout") or 20))
                except Exception as e:  # noqa: BLE001
                    out = {"ok": False, "error": str(e)}
                self.wfile.write((json.dumps(out, ensure_ascii=False) + "\n").encode())
                self.wfile.flush()

    class Server(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
        daemon_threads = True

    if sock.exists():
        sock.unlink()
    srv = Server(str(sock), Handler)
    os.chmod(sock, 0o600)
    return srv


def serve(srv):
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return t


def mark_stopped():
    """Ao sair, os widgets passam a mostrar que o app está fechado."""
    try:
        data = json.loads(Path(paths.STATE_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        data = {}
    data.update(running=False, stoppedAt=int(time.time() * 1000))
    try:
        write_state(data)
    except OSError:
        pass
