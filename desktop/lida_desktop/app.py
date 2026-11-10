"""Lida para Linux (Qt/PySide6).

A janela mostra o mesmo Lida da web (QtWebEngine, o Chromium do Qt) servido em http://localhost.
Em volta dele, o que só um app nativo dá:
- menu global do KDE (QMenuBar: o Plasma exporta o menu da janela para o painel, no X11 e no Wayland);
- ícone na bandeja, com o foco e o Pomodoro, e fechar a janela sem fechar o Lida;
- notificações do sistema para os lembretes;
- a CLI `lida` e os widgets do Plasma, que conversam com o app (ver server.py).

Uso: lida-desktop [--background] [--action nova-tarefa|pomodoro|focar|buscar] [--debug]
"""

import argparse
import json
import os
import secrets
import socket
import sys

from . import APP_ID, VERSION, paths
from .server import Hub, make_http, make_socket, mark_stopped, serve

# Com a janela escondida na bandeja, o Chromium segura os temporizadores (lembretes, Pomodoro).
_FLAGS = "--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = (os.environ.get("QTWEBENGINE_CHROMIUM_FLAGS", "") + " " + _FLAGS).strip()

from PySide6.QtCore import QObject, QSettings, Qt, QTimer, QUrl, Signal  # noqa: E402
from PySide6.QtGui import QAction, QActionGroup, QDesktopServices, QGuiApplication, QIcon, QKeySequence  # noqa: E402
from PySide6.QtWebEngineCore import (  # noqa: E402
    QWebEnginePage,
    QWebEngineProfile,
    QWebEngineScript,
    QWebEngineSettings,
)
from PySide6.QtWebEngineWidgets import QWebEngineView  # noqa: E402
from PySide6.QtWidgets import QApplication, QMainWindow, QMenu, QMessageBox, QSystemTrayIcon  # noqa: E402

ACTIONS = {"nova-tarefa": ("ui", {"action": "new-task"}), "pomodoro": ("ui", {"action": "tool", "value": "focus"}), "focar": ("ui", {"action": "tool", "value": "pick-focus"}), "buscar": ("ui", {"action": "search"}), "mente": ("ui", {"action": "tool", "value": "brain"})}


def send_to_running(req):
    """Se já existe um Lida aberto, entrega o pedido a ele. Devolve True se entregou."""
    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
            s.settimeout(3)
            s.connect(str(paths.SOCKET))
            s.sendall((json.dumps(req) + "\n").encode())
            s.recv(65536)
        return True
    except OSError:
        return False


def fmt_left(sec):
    sec = max(0, int(sec))
    h, r = divmod(sec, 3600)
    m, s = divmod(r, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


class Bridge(QObject):
    exec_js = Signal(int, str, str)
    state = Signal(str)
    show = Signal(str)
    quit = Signal()
    shot = Signal(str, int, int)


class Page(QWebEnginePage):
    """Links para fora do Lida abrem no navegador do sistema."""

    def acceptNavigationRequest(self, url, nav_type, is_main):
        if url.scheme() in ("http", "https") and url.host() not in ("localhost", "127.0.0.1"):
            QDesktopServices.openUrl(url)
            return False
        return super().acceptNavigationRequest(url, nav_type, is_main)

    def createWindow(self, _type):
        # target=_blank / window.open: página descartável que só repassa o endereço ao navegador.
        page = Page(self.profile(), self)
        page.urlChanged.connect(lambda u: (QDesktopServices.openUrl(u), page.deleteLater()))
        return page


class View(QWebEngineView):
    """Menu de contexto só onde faz sentido (campos de texto e texto selecionado)."""

    def contextMenuEvent(self, event):
        req = self.lastContextMenuRequest()
        if req and (req.isContentEditable() or req.selectedText()):
            self.createStandardContextMenu().popup(event.globalPos())


class Window(QMainWindow):
    def __init__(self, app, background=False, debug=False, demo=False):
        super().__init__()
        self.app = app
        self.debug = debug
        self.settings = QSettings("Lida", "desktop")
        self.state = {}
        self.token = secrets.token_urlsafe(24)
        self.setWindowTitle("Lida")
        self.setMinimumSize(380, 560)
        self.resize(1280, 820)
        geo = self.settings.value("geometry")
        if geo is not None:
            self.restoreGeometry(geo)

        self.bridge = Bridge()
        self.bridge.exec_js.connect(self._exec_js)
        self.bridge.state.connect(self._on_state)
        self.bridge.show.connect(self.show_window)
        self.bridge.quit.connect(self.quit)
        self.bridge.shot.connect(lambda p, w, h: (self.resize(w, h), QTimer.singleShot(900, lambda: self.grab().save(p))))

        # Perfil persistente: os dados do Lida (IndexedDB, sessão do Firebase) ficam em ~/.local/share/lida.
        self.profile = QWebEngineProfile("lida", self)
        self.profile.setPersistentStoragePath(str(paths.PROFILE_DIR / "storage"))
        self.profile.setCachePath(str(paths.PROFILE_DIR / "cache"))
        self.profile.setPersistentCookiesPolicy(QWebEngineProfile.PersistentCookiesPolicy.ForcePersistentCookies)
        self.profile.setNotificationPresenter(self._notify)
        script = QWebEngineScript()
        script.setName("lida-desktop")
        src = f"window.__LIDA_DESKTOP__ = {json.dumps({'token': self.token, 'version': VERSION, 'platform': 'linux'})};"
        if demo:  # modo demo: dados de exemplo, relógio ajustável, nada vai para a nuvem
            src += "try{localStorage.setItem('lida.demo','1')}catch(e){}"
        script.setSourceCode(src)
        script.setInjectionPoint(QWebEngineScript.InjectionPoint.DocumentCreation)
        script.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
        script.setRunsOnSubFrames(False)
        self.profile.scripts().insert(script)

        self.view = View(self)
        self.page = Page(self.profile, self.view)
        s = self.page.settings()
        s.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        s.setAttribute(QWebEngineSettings.WebAttribute.ScrollAnimatorEnabled, True)
        s.setAttribute(QWebEngineSettings.WebAttribute.PlaybackRequiresUserGesture, False)
        if hasattr(self.page, "permissionRequested"):  # Qt 6.8+
            self.page.permissionRequested.connect(self._permission)
        else:
            self.page.featurePermissionRequested.connect(self._feature_permission)
        self.view.setPage(self.page)
        self.page.loadStarted.connect(lambda: self.hub.ready.clear())
        self.setCentralWidget(self.view)
        # Janela com fundo transparente: a página pinta tudo de opaco, menos a barra lateral quando
        # "Barra lateral translúcida" está ligada. O desfoque do que fica atrás é do KWin (ver README).
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.page.setBackgroundColor(Qt.GlobalColor.transparent)
        self._blur_hint()

        self.hub = Hub(
            run_js=lambda rid, cmd, args: self.bridge.exec_js.emit(rid, cmd, json.dumps(args)),
            on_state=lambda data: self.bridge.state.emit(json.dumps(data)),
            on_python=self._python_cmd,
        )
        try:
            self.http = make_http(self.hub, self.token, self._google_login)
        except OSError as e:
            QMessageBox.critical(None, "Lida", f"A porta {paths.PORT} já está em uso ({e}). Feche o outro programa ou defina LIDA_PORT.")
            sys.exit(1)
        serve(self.http)
        self.sock = make_socket(self.hub)
        serve(self.sock)

        self._build_menus()
        self._build_tray()
        self.tick = QTimer(self)
        self.tick.timeout.connect(self._tick)
        self.tick.start(1000)

        self.view.load(QUrl(f"http://localhost:{paths.PORT}/"))
        if not background:
            self.show()

    # ---------- Comandos ----------
    def _python_cmd(self, cmd, args):
        """Comandos que o app resolve sem a página. Roda numa thread do servidor."""
        if cmd == "app":
            return {"ok": True, "data": {"running": True, "ready": self.hub.ready.is_set(), "version": VERSION, "pid": os.getpid()}}
        if cmd == "show":
            self.bridge.show.emit(args.get("route") or "")
            return {"ok": True, "data": {"shown": True}}
        if cmd == "shot" and self.debug:  # captura da janela (testes)
            self.bridge.shot.emit(args.get("path") or "/tmp/lida.png", int(args.get("w") or 1280), int(args.get("h") or 820))
            return {"ok": True, "data": {"path": args.get("path")}}
        if cmd == "quit":
            self.bridge.quit.emit()
            return {"ok": True, "data": {"quit": True}}
        return None

    def _exec_js(self, rid, cmd, args_json):
        self.page.runJavaScript(f"window.lidaDesktop ? window.lidaDesktop.exec({rid}, {json.dumps(cmd)}, {args_json}) : null")

    def _blur_hint(self):
        """No X11, pede ao KWin para desfocar o que fica atrás da janela (_KDE_NET_WM_BLUR_BEHIND_REGION com um
        retângulo maior que a tela = a janela toda). No Wayland não há como pedir daqui: o efeito "Better Blur" do KWin faz isso
        pela classe da janela (ver README). Falhar aqui não atrapalha nada."""
        if QGuiApplication.platformName() != "xcb":
            return
        try:
            import subprocess

            wid = int(self.winId())
            subprocess.run(["xprop", "-id", str(wid), "-f", "_KDE_NET_WM_BLUR_BEHIND_REGION", "32c", "-set", "_KDE_NET_WM_BLUR_BEHIND_REGION", "0, 0, 16384, 16384"], check=False, timeout=3, capture_output=True)
        except Exception:
            pass

    def ui(self, action, value=None):
        self._exec_js(0, "ui", json.dumps({"action": action, "value": value}))

    def _google_login(self):
        from .oauth import login

        return login()

    # ---------- Notificações (lembretes da página) ----------
    def _notify(self, notification):
        self._last_notification = notification
        self.tray.showMessage(notification.title(), notification.message(), self.windowIcon(), 9000)
        notification.show()

    def _permission(self, permission):
        permission.grant()

    def _feature_permission(self, origin, feature):
        self.page.setFeaturePermission(origin, feature, QWebEnginePage.PermissionPolicy.PermissionGrantedByUser)

    # ---------- Janela ----------
    def show_window(self, route=""):
        self.show()
        self.setWindowState((self.windowState() & ~Qt.WindowState.WindowMinimized) | Qt.WindowState.WindowActive)
        self.raise_()
        self.activateWindow()
        if route:
            self.ui("nav", route)

    def toggle_window(self):
        if self.isVisible() and self.isActiveWindow():
            self.hide()
        else:
            self.show_window()

    def closeEvent(self, event):
        self.settings.setValue("geometry", self.saveGeometry())
        if self.settings.value("closeToTray", True, type=bool) and QSystemTrayIcon.isSystemTrayAvailable():
            event.ignore()
            self.hide()
        else:
            event.accept()
            self.quit()

    def quit(self):
        self.settings.setValue("geometry", self.saveGeometry())
        mark_stopped()
        for srv in (getattr(self, "http", None), getattr(self, "sock", None)):
            if srv:
                srv.shutdown()
                srv.server_close()
        try:
            paths.SOCKET.unlink()
        except OSError:
            pass
        self.tray.hide()
        self.app.quit()

    # ---------- Menu global ----------
    def _act(self, menu, text, fn, shortcut=None, checkable=False):
        a = QAction(text, self)
        if shortcut:
            a.setShortcut(QKeySequence(shortcut))
        a.setCheckable(checkable)
        a.triggered.connect(fn)
        menu.addAction(a)
        return a

    def _build_menus(self):
        mb = self.menuBar()
        m = mb.addMenu("&Lida")
        self._act(m, "Nova tarefa", lambda: self.ui("new-task"), "Ctrl+N")
        self._act(m, "Buscar", lambda: self.ui("search"), "Ctrl+K")
        self._act(m, "Esvaziar a mente", lambda: self.ui("tool", "brain"), "Ctrl+B")
        m.addSeparator()
        self._act(m, "Ajustes", lambda: self.ui("nav", "ajustes"), "Ctrl+,")
        m.addSeparator()
        self._act(m, "Fechar janela", self.close, "Ctrl+W")
        self._act(m, "Sair do Lida", self.quit, "Ctrl+Q")

        v = mb.addMenu("&Exibir")
        for i, (route, label) in enumerate([("hoje", "Hoje / Painel"), ("planejar", "Planejar"), ("habitos", "Hábitos"), ("loja", "Loja"), ("eu", "Eu")], 1):
            self._act(v, label, lambda _=False, r=route: self.ui("nav", r), f"Ctrl+{i}")
        v.addSeparator()
        self.m_theme = v.addMenu("Tema")
        self.m_font = v.addMenu("Fonte")
        self.m_size = v.addMenu("Tamanho")
        self.g_theme = QActionGroup(self)
        self.g_font = QActionGroup(self)
        self.g_size = QActionGroup(self)
        self.a_showdone = self._act(v, "Mostrar concluídas em Hoje", lambda on: self.ui("showDone", on), checkable=True)
        self.a_glass = self._act(v, "Barra lateral translúcida", lambda on: self.ui("glass", on), checkable=True)
        v.addSeparator()
        self._act(v, "Tela cheia", lambda: self.showNormal() if self.isFullScreen() else self.showFullScreen(), "F11")
        if self.debug:
            self._act(v, "Recarregar", lambda: self.view.reload(), "Ctrl+R")
            self._act(v, "Ferramentas do desenvolvedor", self._devtools, "F12")

        f = mb.addMenu("&Foco")
        self.a_pick = self._act(f, "Focar numa tarefa…", lambda: (self.show_window(), self.ui("tool", "pick-focus")), "Ctrl+Shift+F")
        self.a_stopfocus = self._act(f, "Parar foco", lambda: self._exec_js(0, "focus", json.dumps({"action": "stop"})))
        self.a_donefocus = self._act(f, "Concluir a tarefa em foco", lambda: self._exec_js(0, "focus", json.dumps({"action": "done"})), "Ctrl+Shift+D")
        f.addSeparator()
        self.a_pomo = self._act(f, "Iniciar Pomodoro", lambda: self._exec_js(0, "pomo", json.dumps({"action": "toggle"})), "Ctrl+P")
        self._act(f, "Reiniciar Pomodoro", lambda: self._exec_js(0, "pomo", json.dumps({"action": "reset"})))
        self._act(f, "Pular para a pausa / foco", lambda: self._exec_js(0, "pomo", json.dumps({"action": "skip"})))
        self._act(f, "Abrir o Pomodoro", lambda: (self.show_window(), self.ui("tool", "focus")))

        s = mb.addMenu("&Ajustes")
        self.a_sound = self._act(s, "Sons", lambda on: self.ui("sound", on), checkable=True)
        self.a_punish = self._act(s, "Punições por tarefa vencida", lambda on: self.ui("punish", on), checkable=True)
        n = s.addMenu("Lembretes")
        self.a_notify = {}
        for key, label in [("on", "Lembretes ligados"), ("tasks", "Tarefas com horário"), ("habits", "Hábitos pendentes"), ("morning", "Resumo da manhã"), ("daily", "Fechamento do dia"), ("water", "Água"), ("inApp", "Aviso com o app aberto")]:
            self.a_notify[key] = self._act(n, label, lambda on, k=key: self.ui("notify", {k: on}), checkable=True)
        s.addSeparator()
        self.a_tray = self._act(s, "Fechar para a bandeja", lambda on: self.settings.setValue("closeToTray", on), checkable=True)
        self.a_tray.setChecked(self.settings.value("closeToTray", True, type=bool))
        self.a_autostart = self._act(s, "Abrir com o sistema (na bandeja)", self._set_autostart, checkable=True)
        self.a_autostart.setChecked(paths.AUTOSTART_FILE.exists())

        h = mb.addMenu("Aj&uda")
        self._act(h, "Comandos do terminal (lida --help)", self._cli_help)
        self._act(h, "Sobre o Lida", lambda: QMessageBox.about(self, "Lida", f"<b>Lida {VERSION}</b><br>Tarefas e hábitos, com jogo.<br>App Linux em Qt/PySide6."))

    def _devtools(self):
        self._dev = QWebEngineView()
        self.page.setDevToolsPage(self._dev.page())
        self._dev.resize(1000, 700)
        self._dev.show()

    def _cli_help(self):
        QMessageBox.information(
            self,
            "Lida no terminal",
            "lida                      resumo do dia e modo interativo\n"
            "lida ls [hoje|entrada|atrasadas|proximos|tudo]\n"
            "lida add \"comprar pão amanhã 8h p1 #casa\"\n"
            "lida done 2               (número da última lista, título ou parte dele)\n"
            "lida foco \"relatório\"     põe em foco; lida foco abre a tela de foco\n"
            "lida pomo start|pause|reset|skip\n"
            "lida habito ler · lida agua copo · lida ipl\n\n"
            "Tudo aceita --json. Veja lida --help.",
        )

    def _set_autostart(self, on):
        f = paths.AUTOSTART_FILE
        if on:
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text(
                "[Desktop Entry]\nType=Application\nName=Lida\nExec=lida-desktop --background\nIcon=io.github.dasilvasauro.lida\n"
                "X-GNOME-Autostart-enabled=true\nX-KDE-autostart-after=panel\n",
                encoding="utf-8",
            )
        elif f.exists():
            f.unlink()

    def _fill_group(self, menu, group, items, current, action):
        if [a.data() for a in menu.actions()] != [it["id"] for it in items]:
            menu.clear()
            for it in items:
                a = QAction(it["name"], self)
                a.setData(it["id"])
                a.setCheckable(True)
                a.triggered.connect(lambda _=False, i=it["id"]: self.ui(action, i))
                group.addAction(a)
                menu.addAction(a)
        for a, it in zip(menu.actions(), items):
            a.setChecked(it["id"] == current)
            a.setEnabled(not it.get("locked"))
            a.setText(it["name"] + ("  🔒" if it.get("locked") else ""))

    def _on_state(self, raw):
        st = json.loads(raw)
        self.state = st
        ui = st.get("ui") or {}
        self._fill_group(self.m_theme, self.g_theme, ui.get("themes", []), ui.get("theme"), "theme")
        self._fill_group(self.m_font, self.g_font, ui.get("fonts", []), ui.get("font"), "font")
        self._fill_group(self.m_size, self.g_size, ui.get("sizes", []), ui.get("size"), "size")
        self.a_sound.setChecked(bool(ui.get("sound")))
        self.a_punish.setChecked(bool(ui.get("punish")))
        self.a_showdone.setChecked(bool(ui.get("showDone")))
        self.a_glass.setChecked(bool(ui.get("glass")))
        for k, a in self.a_notify.items():
            a.setChecked(bool((ui.get("notify") or {}).get(k)))
            if k != "on":
                a.setEnabled(bool((ui.get("notify") or {}).get("on")))
        self._tick()

    # ---------- Bandeja ----------
    def _tray_icon(self):
        """Contorno do alfa: pelo nome do tema (o Plasma pinta na cor do painel); senão, PNG branco."""
        icon = QIcon.fromTheme(APP_ID + "-tray")
        if icon.isNull():
            icon = QIcon()
            for s in (22, 44, 64):
                f = paths.WEB_DIR / "icons" / f"tray-{s}.png"
                if f.exists():
                    icon.addFile(str(f))
        return icon if not icon.isNull() else self.windowIcon()

    def _build_tray(self):
        self.tray = QSystemTrayIcon(self._tray_icon(), self)
        self.tray.setToolTip("Lida")
        menu = QMenu()
        menu.addAction("Mostrar o Lida", self.show_window)
        menu.addAction("Nova tarefa", lambda: (self.show_window(), self.ui("new-task")))
        menu.addSeparator()
        self.t_focus = menu.addAction("Focar numa tarefa…", lambda: (self.show_window(), self.ui("tool", "pick-focus")))
        self.t_stop = menu.addAction("Parar foco", lambda: self._exec_js(0, "focus", json.dumps({"action": "stop"})))
        self.t_pomo = menu.addAction("Iniciar Pomodoro", lambda: self._exec_js(0, "pomo", json.dumps({"action": "toggle"})))
        menu.addSeparator()
        menu.addAction("Sair do Lida", self.quit)
        self.tray.setContextMenu(menu)
        self._tray_menu = menu
        self.tray.activated.connect(lambda r: self.toggle_window() if r == QSystemTrayIcon.ActivationReason.Trigger else None)
        self.tray.messageClicked.connect(self.show_window)
        if QSystemTrayIcon.isSystemTrayAvailable():
            self.tray.show()

    def _tick(self):
        """Uma vez por segundo: tempo do foco/Pomodoro na bandeja e nos itens do menu."""
        import time

        st = self.state or {}
        f = st.get("focus") or {}
        task = f.get("task")
        pomo = f.get("pomo") or {}
        now = time.time() * 1000
        running = bool(pomo.get("running"))
        left = (pomo.get("endsAt", 0) - now) / 1000 if running else pomo.get("leftSec", 0)
        timer = f.get("timer")
        parts = []
        if task:
            parts.append(f"Em foco: {task['title']}")
        if timer:
            tl = (timer["endsAt"] - now) / 1000 if timer.get("running") and timer.get("endsAt") else timer.get("leftSec", 0)
            parts.append(f"Modo foco {fmt_left(tl)}")
        elif running or pomo.get("active"):
            parts.append(f"Pomodoro {'· ' if running else '(parado) · '}{fmt_left(left)}")
        g = st.get("glance") or {}
        t = g.get("tasks") or {}
        if t:
            parts.append(f"Hoje: {t.get('done', 0)} de {t.get('total', 0)} tarefas")
        tip = "\n".join(parts) or "Lida"
        self.tray.setToolTip(tip)
        title = "Lida"
        if running:
            title = f"{fmt_left(left)} · Lida"
        self.setWindowTitle(title)
        label = "Pausar Pomodoro" if running else ("Continuar Pomodoro" if pomo.get("active") else "Iniciar Pomodoro")
        self.a_pomo.setText(label)
        self.t_pomo.setText(label)
        self.a_stopfocus.setEnabled(bool(task))
        self.a_donefocus.setEnabled(bool(task))
        self.t_stop.setEnabled(bool(task))


def main():
    ap = argparse.ArgumentParser(prog="lida-desktop", description="Lida para Linux")
    ap.add_argument("--background", action="store_true", help="abre só na bandeja (sem janela)")
    ap.add_argument("--action", choices=sorted(ACTIONS), help="abre direto numa ação")
    ap.add_argument("--debug", action="store_true", help="menu de desenvolvedor (recarregar, DevTools)")
    ap.add_argument("--demo", action="store_true", help="abre o modo demo (dados de exemplo)")
    args = ap.parse_args()
    paths.ensure_dirs()

    # Já está aberto? Só mostra (ou executa a ação) e sai.
    if send_to_running({"cmd": "show"} if not args.background else {"cmd": "app"}):
        if args.action:
            cmd, a = ACTIONS[args.action]
            send_to_running({"cmd": cmd, "args": a})
        return

    if not (paths.WEB_DIR / "index.html").exists():
        print(f"Arquivos do Lida não encontrados em {paths.WEB_DIR}. Rode o install.sh de novo.", file=sys.stderr)
        sys.exit(1)

    QApplication.setApplicationName("Lida")
    QApplication.setOrganizationName("Lida")
    QApplication.setApplicationVersion(VERSION)
    QApplication.setDesktopFileName(APP_ID)
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    icon = QIcon.fromTheme(APP_ID)
    if icon.isNull():
        icon = QIcon(str(paths.WEB_DIR / "icons" / "pwa-512x512.png"))
    app.setWindowIcon(icon)
    win = Window(app, background=args.background, debug=args.debug, demo=args.demo)
    if args.action:
        cmd, a = ACTIONS[args.action]
        QTimer.singleShot(2500, lambda: win.show_window() or win._exec_js(0, cmd, json.dumps(a)))
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
