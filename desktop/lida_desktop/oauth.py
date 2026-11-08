"""Login com Google no app Linux.

O Google não deixa entrar com a conta dentro de navegadores embutidos (é o caso do QtWebEngine).
Então o app faz o fluxo de "app para computador" do OAuth: abre o navegador do sistema, recebe a
resposta num endereço local (127.0.0.1, porta aleatória), troca o código por um idToken (com PKCE)
e entrega o idToken para o Firebase da página, que faz o resto.

Precisa de um cliente OAuth do tipo "App para computador" criado no MESMO projeto do Firebase
(Google Cloud Console > APIs e serviços > Credenciais). O JSON baixado vai em
~/.config/lida/google-oauth.json.
"""

import base64
import hashlib
import json
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

from . import paths

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"

DONE_PAGE = """<!doctype html><meta charset="utf-8"><title>Lida</title>
<body style="font:16px system-ui;background:#0f1217;color:#e8ebf0;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1 style="font-size:22px">{title}</h1><p style="color:#9aa2b0">{text}</p></div>"""


class LoginError(Exception):
    pass


def load_client():
    f = paths.OAUTH_FILE
    if not f.exists():
        raise LoginError(
            f"Falta o cliente OAuth do Google em {f}. Crie um cliente do tipo \"App para computador\" no "
            "projeto do Firebase (Google Cloud Console > Credenciais), baixe o JSON e salve com esse nome."
        )
    try:
        raw = json.loads(f.read_text(encoding="utf-8"))
    except ValueError as e:
        raise LoginError(f"{f} não é um JSON válido: {e}") from e
    c = raw.get("installed") or raw.get("web") or raw
    if not c.get("client_id"):
        raise LoginError(f"{f} não tem client_id.")
    return c["client_id"], c.get("client_secret", "")


def login(timeout=240):
    client_id, client_secret = load_client()
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)
    result = {}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if "code" not in q and "error" not in q:
                self.send_response(404)
                self.end_headers()
                return
            result.update({k: v[0] for k, v in q.items()})
            ok = "code" in q and q.get("state", [""])[0] == state
            body = DONE_PAGE.format(
                title="Pronto! Pode voltar para o Lida." if ok else "Não deu certo.",
                text="Esta aba pode ser fechada." if ok else "Volte ao Lida e tente de novo.",
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    srv = HTTPServer(("127.0.0.1", 0), Handler)
    srv.timeout = 2
    redirect = f"http://127.0.0.1:{srv.server_address[1]}"
    url = AUTH_URL + "?" + urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": "openid email profile",
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": state,
        "prompt": "select_account",
    })
    webbrowser.open(url)
    deadline = time.monotonic() + timeout
    try:
        while not result:
            if time.monotonic() > deadline:
                raise LoginError("Tempo esgotado esperando o login no navegador (cancelado).")
            srv.handle_request()
    finally:
        srv.server_close()
    if result.get("error"):
        raise LoginError("Login cancelado." if result["error"] == "access_denied" else f"O Google recusou: {result['error']}")
    if result.get("state") != state:
        raise LoginError("Resposta do Google não confere (state). Tente de novo.")
    data = urllib.parse.urlencode({
        "code": result["code"],
        "client_id": client_id,
        "client_secret": client_secret,
        "code_verifier": verifier,
        "redirect_uri": redirect,
        "grant_type": "authorization_code",
    }).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=data), timeout=30) as r:
            tok = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise LoginError(f"Falha ao trocar o código pelo token: {e.read().decode(errors='replace')[:300]}") from e
    except OSError as e:
        raise LoginError(f"Sem conexão com o Google: {e}") from e
    if not tok.get("id_token"):
        raise LoginError("O Google não devolveu o idToken.")
    return tok["id_token"]
