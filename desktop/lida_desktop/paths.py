"""Onde o Lida desktop guarda as coisas (padrão XDG) e por onde app, CLI e widgets conversam.

Sem dependências do Qt: a CLI importa este módulo e precisa abrir rápido.
"""

import os
from pathlib import Path

HOME = Path.home()
XDG_DATA = Path(os.environ.get("XDG_DATA_HOME") or HOME / ".local/share")
XDG_CONFIG = Path(os.environ.get("XDG_CONFIG_HOME") or HOME / ".config")
XDG_CACHE = Path(os.environ.get("XDG_CACHE_HOME") or HOME / ".cache")
RUNTIME = Path(os.environ.get("XDG_RUNTIME_DIR") or f"/tmp/lida-{os.getuid()}")

DATA_DIR = XDG_DATA / "lida"            # app web instalado, perfil do navegador embutido
CONFIG_DIR = XDG_CONFIG / "lida"        # google-oauth.json, preferências do app
CACHE_DIR = XDG_CACHE / "lida"          # state.json (widgets), last.json (números da CLI)

WEB_DIR = Path(os.environ.get("LIDA_WEB_DIR") or DATA_DIR / "app")
PROFILE_DIR = DATA_DIR / "webengine"
STATE_FILE = CACHE_DIR / "state.json"   # lido pelos widgets do Plasma (cat)
LAST_FILE = CACHE_DIR / "last.json"     # última lista numerada da CLI
SOCKET = RUNTIME / "lida-desktop.sock"  # CLI ↔ app
OAUTH_FILE = CONFIG_DIR / "google-oauth.json"
AUTOSTART_FILE = XDG_CONFIG / "autostart" / "io.github.dasilvasauro.lida.desktop"

# Porta fixa: a origem (http://localhost:PORTA) é onde ficam os dados do navegador embutido,
# então ela não pode mudar entre uma execução e outra.
PORT = int(os.environ.get("LIDA_PORT") or 47390)


def ensure_dirs():
    for d in (DATA_DIR, CONFIG_DIR, CACHE_DIR, PROFILE_DIR):
        d.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True, mode=0o700)
