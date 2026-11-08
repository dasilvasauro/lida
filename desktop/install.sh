#!/usr/bin/env bash
# Instala o Lida para Linux na sua pasta pessoal (~/.local), sem root.
#
#   ./desktop/install.sh                instala ou atualiza
#   ./desktop/install.sh --venv         instala o PySide6 num ambiente próprio (se a distro não tiver)
#   ./desktop/install.sh --autostart    também abre o Lida (na bandeja) ao entrar na sessão
#   ./desktop/install.sh --uninstall    remove o app (seus dados ficam, a menos que use --purge)
#
# O que vai para onde:
#   ~/.local/share/lida/app           os arquivos do Lida (a mesma versão da web)
#   ~/.local/share/lida/desktop       o app Qt e a CLI (Python)
#   ~/.local/bin/lida-desktop, lida   comandos
#   ~/.local/share/applications       atalho no menu (com ações: Nova tarefa, Pomodoro, Focar)
#   ~/.local/share/icons/hicolor      ícone
#   widgets do Plasma                 Lida · Foco e Lida · Anéis (kpackagetool6)
#   completar comandos                bash, zsh e fish
set -euo pipefail

APP_ID="io.github.dasilvasauro.lida"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
CONF="${XDG_CONFIG_HOME:-$HOME/.config}"
BIN="$HOME/.local/bin"
LIDA="$DATA/lida"
VENV="$LIDA/venv"

USE_VENV=0; AUTOSTART=0; UNINSTALL=0; PURGE=0
for a in "$@"; do
  case "$a" in
    --venv) USE_VENV=1 ;;
    --autostart) AUTOSTART=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --purge) UNINSTALL=1; PURGE=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Opção desconhecida: $a" >&2; exit 2 ;;
  esac
done

say()  { printf '\033[1;34m›\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✖\033[0m %s\n' "$*" >&2; exit 1; }

refresh_menus() {
  command -v update-desktop-database >/dev/null && update-desktop-database "$DATA/applications" >/dev/null 2>&1 || true
  command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q -t "$DATA/icons/hicolor" >/dev/null 2>&1 || true
  command -v kbuildsycoca6 >/dev/null && kbuildsycoca6 >/dev/null 2>&1 || true
}

# ---------------------------------------------------------------- desinstalar
if [ "$UNINSTALL" = 1 ]; then
  say "Removendo o Lida…"
  command -v lida >/dev/null && lida fechar >/dev/null 2>&1 || true
  rm -f "$BIN/lida" "$BIN/lida-desktop"
  rm -f "$DATA/applications/$APP_ID.desktop" "$CONF/autostart/$APP_ID.desktop"
  rm -f "$DATA"/icons/hicolor/*/apps/"$APP_ID".png
  rm -f "$DATA/bash-completion/completions/lida" "$DATA/zsh/site-functions/_lida" "$CONF/fish/completions/lida.fish"
  for w in org.lida.foco org.lida.aneis; do
    if command -v kpackagetool6 >/dev/null; then kpackagetool6 -t Plasma/Applet -r "$w" >/dev/null 2>&1 || true; fi
    rm -rf "$DATA/plasma/plasmoids/$w"
  done
  rm -rf "$LIDA/app" "$LIDA/desktop" "$VENV"
  if [ "$PURGE" = 1 ]; then
    rm -rf "$LIDA" "$CONF/lida" "${XDG_CACHE_HOME:-$HOME/.cache}/lida" "$CONF/Lida"
    ok "Lida removido, com os dados deste computador (os da nuvem continuam na sua conta)."
  else
    ok "Lida removido. Seus dados continuam em $LIDA (use --purge para apagar)."
  fi
  refresh_menus
  exit 0
fi

# ---------------------------------------------------------------- Python + PySide6
[ -f "$REPO/index.html" ] || die "Rode este script de dentro do repositório do Lida (pasta desktop/)."
PY="$(command -v python3 || true)"
[ -n "$PY" ] || die "Python 3 não encontrado. Instale o python3 pelo gerenciador de pacotes."

has_qt() { "$1" -c 'import PySide6.QtWebEngineWidgets' >/dev/null 2>&1; }

if [ "$USE_VENV" = 1 ] || { [ -x "$VENV/bin/python" ] && has_qt "$VENV/bin/python"; }; then
  if ! { [ -x "$VENV/bin/python" ] && has_qt "$VENV/bin/python"; }; then
    say "Criando um ambiente Python só do Lida e instalando o PySide6 (uns 600 MB, uma vez só)…"
    "$PY" -m venv "$VENV"
    "$VENV/bin/pip" install --upgrade --quiet pip
    "$VENV/bin/pip" install --quiet PySide6
  fi
  APP_PY="$VENV/bin/python"
elif has_qt "$PY"; then
  APP_PY="$PY"
else
  warn "O PySide6 (Qt para Python, com o QtWebEngine) não está instalado."
  echo "  Instale pelo gerenciador da sua distro e rode o script de novo:"
  echo "    Arch / Manjaro / EndeavourOS:  sudo pacman -S pyside6"
  echo "    Fedora:                        sudo dnf install python3-pyside6"
  echo "    openSUSE:                      sudo zypper install python3-pyside6"
  echo "    Kubuntu / KDE neon / Debian:   sudo apt install python3-pyside6.qtwebenginewidgets python3-pyside6.qtwebenginecore"
  echo "  Ou deixe o script instalar num ambiente próprio:  ./desktop/install.sh --venv"
  exit 1
fi
ok "Qt: $("$APP_PY" -c 'import PySide6; print("PySide6", PySide6.__version__)')"

# ---------------------------------------------------------------- arquivos
say "Copiando o Lida…"
mkdir -p "$LIDA/app" "$LIDA/desktop" "$BIN"
rm -rf "$LIDA/app"/* "$LIDA/desktop/lida_desktop"
for it in index.html manifest.webmanifest css js fonts icons sounds; do
  cp -r "$REPO/$it" "$LIDA/app/"
done
cp -r "$HERE/lida_desktop" "$LIDA/desktop/"
find "$LIDA/desktop" -name '__pycache__' -prune -exec rm -rf {} +

# Comandos: o app usa o Python com o Qt; a CLI usa o Python do sistema (abre mais rápido).
cat > "$BIN/lida-desktop" <<EOF
#!/bin/sh
# Lida para Linux (gerado pelo install.sh)
PYTHONPATH="$LIDA/desktop\${PYTHONPATH:+:\$PYTHONPATH}" exec "$APP_PY" -m lida_desktop.app "\$@"
EOF
cat > "$BIN/lida" <<EOF
#!/bin/sh
# Lida no terminal (gerado pelo install.sh)
PYTHONPATH="$LIDA/desktop\${PYTHONPATH:+:\$PYTHONPATH}" exec "$PY" -m lida_desktop.cli "\$@"
EOF
chmod +x "$BIN/lida-desktop" "$BIN/lida"
ok "Comandos: lida-desktop e lida (em $BIN)"
case ":$PATH:" in
  *":$BIN:"*) ;;
  *) warn "$BIN não está no PATH. Adicione ao ~/.bashrc ou ~/.zshrc:  export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
esac

# ---------------------------------------------------------------- ícone e atalho
for s in 512 192; do
  mkdir -p "$DATA/icons/hicolor/${s}x${s}/apps"
  cp "$REPO/icons/pwa-${s}x${s}.png" "$DATA/icons/hicolor/${s}x${s}/apps/$APP_ID.png"
done
# Tamanhos menores (painel, bandeja) gerados com o próprio Qt.
"$APP_PY" - "$REPO/icons/pwa-512x512.png" "$DATA/icons/hicolor" "$APP_ID" <<'PYEOF' || true
import sys, os
from PySide6.QtGui import QImage
from PySide6.QtCore import Qt
src, base, app_id = sys.argv[1:4]
img = QImage(src)
for s in (16, 22, 24, 32, 48, 64, 128, 256):
    d = os.path.join(base, f"{s}x{s}", "apps")
    os.makedirs(d, exist_ok=True)
    img.scaled(s, s, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation).save(os.path.join(d, app_id + ".png"))
PYEOF
mkdir -p "$DATA/applications"
cat > "$DATA/applications/$APP_ID.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Lida
GenericName=Tarefas e hábitos
Comment=Tarefas, hábitos, foco e Pomodoro, com jogo
Exec=$BIN/lida-desktop
Icon=$APP_ID
Terminal=false
Categories=Office;ProjectManagement;Utility;
Keywords=tarefas;hábitos;pomodoro;foco;todo;tasks;habits;
StartupWMClass=$APP_ID
StartupNotify=true
Actions=nova-tarefa;focar;pomodoro;

[Desktop Action nova-tarefa]
Name=Nova tarefa
Exec=$BIN/lida-desktop --action nova-tarefa

[Desktop Action focar]
Name=Focar numa tarefa
Exec=$BIN/lida-desktop --action focar

[Desktop Action pomodoro]
Name=Pomodoro
Exec=$BIN/lida-desktop --action pomodoro
EOF
ok "Atalho no menu de aplicativos"

if [ "$AUTOSTART" = 1 ]; then
  mkdir -p "$CONF/autostart"
  printf '[Desktop Entry]\nType=Application\nName=Lida\nExec=%s --background\nIcon=%s\nX-GNOME-Autostart-enabled=true\nX-KDE-autostart-after=panel\n' "$BIN/lida-desktop" "$APP_ID" > "$CONF/autostart/$APP_ID.desktop"
  ok "Abre com a sessão (na bandeja)"
fi

# ---------------------------------------------------------------- widgets do Plasma
for w in org.lida.foco org.lida.aneis; do
  src="$HERE/plasmoids/$w"
  if command -v kpackagetool6 >/dev/null; then
    if kpackagetool6 -t Plasma/Applet -s "$w" >/dev/null 2>&1; then
      kpackagetool6 -t Plasma/Applet -u "$src" >/dev/null
    else
      kpackagetool6 -t Plasma/Applet -i "$src" >/dev/null
    fi
  else
    rm -rf "$DATA/plasma/plasmoids/$w"
    mkdir -p "$DATA/plasma/plasmoids"
    cp -r "$src" "$DATA/plasma/plasmoids/$w"
  fi
done
ok "Widgets do Plasma: Lida · Foco e Lida · Anéis (clique com o botão direito no painel > Adicionar widgets)"

# ---------------------------------------------------------------- completar comandos
mkdir -p "$DATA/bash-completion/completions" "$DATA/zsh/site-functions" "$CONF/fish/completions"
"$BIN/lida" completions bash > "$DATA/bash-completion/completions/lida"
"$BIN/lida" completions zsh > "$DATA/zsh/site-functions/_lida"
"$BIN/lida" completions fish > "$CONF/fish/completions/lida.fish"
ok "Completar comandos (bash, zsh, fish). No zsh: fpath=(~/.local/share/zsh/site-functions \$fpath) antes do compinit."

refresh_menus

# Um Lida aberto da versão anterior continua com os arquivos antigos até fechar.
if [ -S "${XDG_RUNTIME_DIR:-/tmp/lida-$(id -u)}/lida-desktop.sock" ]; then
  warn "O Lida está aberto: feche (lida fechar) e abra de novo para usar esta versão."
fi

echo
ok "Pronto! Abra o Lida pelo menu de aplicativos ou com: lida-desktop"
echo "  No terminal: lida --help"
if [ ! -f "$CONF/lida/google-oauth.json" ]; then
  echo
  warn "Para entrar com a conta Google no app Linux, falta o cliente OAuth em $CONF/lida/google-oauth.json"
  echo "  (passo a passo no README, seção \"Lida para Linux\"). Sem ele, o modo local funciona normalmente."
fi
