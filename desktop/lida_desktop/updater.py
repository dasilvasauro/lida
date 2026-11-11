"""Atualização do Lida para Linux, de dentro do app.

A página procura a versão nova (o mesmo latest.json da Release que o Android usa) e, com um toque,
pede ao app para: baixar o lida-linux.tar.gz da Release, conferir o SHA-256 publicado, abrir num
diretório temporário e rodar o install.sh que vem nele (o mesmo da instalação manual: troca os
arquivos em ~/.local/share/lida, a CLI e os widgets; os dados ficam). Depois o app reabre sozinho.

Quem instalou pelo git (rodando o install.sh de dentro do repositório clonado) atualiza com git pull:
a página só mostra as instruções, para não misturar as duas formas.
"""

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import threading
import urllib.request
from pathlib import Path

from . import paths

INSTALL_INFO = paths.DATA_DIR / "install.json"
ALLOWED = ("https://github.com/dasilvasauro/lida/releases/",)


def install_info():
    """{"source": "git" | "package", "repo": "...", "version": "..."} (gravado pelo install.sh)."""
    try:
        return json.loads(INSTALL_INFO.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        # Sem o arquivo: instalado antes desta versão. Rodando de dentro de um repositório git?
        here = Path(__file__).resolve().parents[2]
        return {"source": "git" if (here / ".git").exists() else "unknown", "repo": str(here)}


class Updater:
    def __init__(self):
        self.lock = threading.Lock()
        self.state = {"phase": "idle", "done": 0, "total": 0, "error": ""}
        self.thread = None

    def status(self):
        with self.lock:
            return dict(self.state)

    def _set(self, **kw):
        with self.lock:
            self.state.update(kw)

    def start(self, url, sha256):
        url = str(url or "")
        if not url.startswith(ALLOWED):
            return {"error": "Endereço de atualização não permitido."}
        if not sha256:
            return {"error": "A versão nova não informou o SHA-256."}
        if self.thread and self.thread.is_alive():
            return {"ok": True, "running": True}
        self._set(phase="download", done=0, total=0, error="")
        self.thread = threading.Thread(target=self._run, args=(url, sha256.lower()), daemon=True)
        self.thread.start()
        return {"ok": True}

    def _run(self, url, sha256):
        tmp = Path(tempfile.mkdtemp(prefix="lida-update-"))
        try:
            pkg = tmp / "lida-linux.tar.gz"
            h = hashlib.sha256()
            req = urllib.request.Request(url, headers={"User-Agent": "Lida-Linux"})
            with urllib.request.urlopen(req, timeout=60) as res, open(pkg, "wb") as out:
                total = int(res.headers.get("Content-Length") or 0)
                self._set(total=total)
                done = 0
                while True:
                    chunk = res.read(65536)
                    if not chunk:
                        break
                    out.write(chunk)
                    h.update(chunk)
                    done += len(chunk)
                    self._set(done=done)
            self._set(phase="verify")
            if h.hexdigest() != sha256:
                raise RuntimeError("O arquivo baixado não confere (SHA-256). Tente de novo.")
            self._set(phase="install")
            src = tmp / "src"
            src.mkdir()
            safe_extract(pkg, src)
            script = src / "lida" / "desktop" / "install.sh"
            if not script.is_file():
                raise RuntimeError("O pacote não tem o install.sh.")
            r = subprocess.run(["bash", str(script)], cwd=str(script.parent), capture_output=True, text=True, timeout=1800)
            if r.returncode != 0:
                tail = (r.stderr or r.stdout or "").strip().splitlines()[-3:]
                raise RuntimeError("A instalação falhou: " + " ".join(tail))
            self._set(phase="done")
        except Exception as e:  # noqa: BLE001 - a mensagem vai para a tela
            self._set(phase="error", error=str(e))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


def safe_extract(pkg, dest):
    """Abre o .tar.gz sem deixar nada sair da pasta de destino (nem caminhos absolutos, nem links)."""
    dest = Path(dest).resolve()
    with tarfile.open(pkg, "r:gz") as tar:
        for m in tar.getmembers():
            target = (dest / m.name).resolve()
            if dest != target and dest not in target.parents:
                raise RuntimeError(f"Pacote com caminho inválido: {m.name}")
            if m.issym() or m.islnk() or m.isdev():
                raise RuntimeError(f"Pacote com link ou dispositivo: {m.name}")
        if sys.version_info >= (3, 12):
            tar.extractall(dest, filter="data")
        else:
            tar.extractall(dest)  # noqa: S202 - conferido acima


def relaunch():
    """Abre o Lida de novo um instante depois deste processo fechar (a porta e o socket ficam livres)."""
    exe = shutil.which("lida-desktop") or str(paths.HOME / ".local/bin/lida-desktop")
    subprocess.Popen(["sh", "-c", f'sleep 1.5; exec "{exe}"'], start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=os.environ.copy())
