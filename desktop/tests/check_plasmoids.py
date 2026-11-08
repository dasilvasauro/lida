"""Carrega os widgets do Plasma fora do Plasma (com módulos de mentira em tests/qmlstub) e falha se o
QML tiver erro ou aviso: propriedade FINAL sobrescrita, tipo inexistente, binding quebrado etc.

    pip install PySide6 && QT_QPA_PLATFORM=offscreen python desktop/tests/check_plasmoids.py

Não substitui testar no Plasma de verdade (ícones, painel, tema), mas pega os erros que impedem o
widget de abrir. Os módulos de mentira imitam só o que os widgets usam.
"""

import json
import os
import re
import sys
import tempfile
import time
from pathlib import Path

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
from PySide6.QtCore import QTimer, QUrl  # noqa: E402
from PySide6.QtGui import QGuiApplication  # noqa: E402
from PySide6.QtQuick import QQuickView  # noqa: E402

HERE = Path(__file__).resolve().parent
PLASMOIDS = HERE.parent / "plasmoids"

now = time.time() * 1000
FIXTURE = {
    "running": True, "date": time.strftime("%Y-%m-%d"), "ipl": 52,
    "glance": {"tasks": {"done": 2, "total": 7, "overdue": 1, "inbox": 2}, "habits": {"done": 1, "total": 3}, "water": {"ml": 750, "goal": 2000}},
    "focus": {"task": {"id": "t1", "title": "Revisar a proposta do cliente", "priority": "P1"}, "since": now - 600000,
              "pomo": {"mode": "focus", "running": True, "endsAt": now + 900000, "leftSec": 900, "focusMin": 25, "breakMin": 5, "active": True}, "timer": None},
    "today": [{"id": "t1", "title": "Revisar a proposta do cliente", "priority": "P1", "due": "2000-01-01", "time": "10:00", "kind": "normal", "subtasks": [{"title": "a", "done": True}, {"title": "b", "done": False}]},
              {"id": "t2", "title": "Caminhada", "priority": "P4", "due": None, "time": None, "kind": "normal", "subtasks": []}],
    "inboxList": [{"id": "t3", "title": "Ideias para as férias", "priority": "P4", "kind": "normal", "subtasks": []}],
    "inbox": 1,
    "habits": [{"id": "h1", "title": "Ler", "icon": "📚", "goal": 10, "count": 4, "done": False, "scheduled": True, "streak": 5}],
    "water": {"ml": 750, "goal": 2000, "glass": 250, "bottle": 500},
}


def check(widget):
    src = PLASMOIDS / widget / "contents" / "ui"
    tmp = Path(tempfile.mkdtemp())
    for f in src.glob("*.qml"):
        # "Plasmoid.icon: …" é propriedade anexada do Plasma; o módulo de mentira não tem.
        (tmp / f.name).write_text(re.sub(r"^\s*Plasmoid\.icon:.*$", "", f.read_text(encoding="utf-8"), flags=re.M), encoding="utf-8")
    view = QQuickView()
    view.engine().addImportPath(str(HERE / "qmlstub"))
    view.rootContext().setContextProperty("fixtureState", json.dumps(FIXTURE))
    msgs = []
    view.engine().warnings.connect(lambda ws: msgs.extend(w.toString() for w in ws))
    view.setSource(QUrl.fromLocalFile(str(tmp / "main.qml")))
    msgs += [e.toString() for e in view.errors()]
    view.resize(900, 700)
    view.show()
    return view, msgs, tmp


def main():
    app = QGuiApplication(sys.argv)
    results = {w: check(w) for w in ("org.lida.foco", "org.lida.aneis")}
    failed = []

    def done():
        for w, (view, msgs, tmp) in results.items():
            msgs = [m.replace(str(tmp), w) for m in msgs]
            print(("FALHOU " if msgs else "ok     ") + w)
            for m in msgs:
                print("   ", m)
            if msgs:
                failed.append(w)
        app.exit(1 if failed else 0)

    QTimer.singleShot(2000, done)
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
