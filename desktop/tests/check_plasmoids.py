"""Carrega os widgets do Plasma fora do Plasma (com módulos de mentira em tests/qmlstub) e falha se o
QML tiver erro ou aviso: propriedade FINAL sobrescrita, tipo inexistente, binding quebrado etc.

    pip install PySide6 && QT_QPA_PLATFORM=offscreen python desktop/tests/check_plasmoids.py

Não substitui testar no Plasma de verdade (ícones, painel, tema), mas pega os erros que impedem o
widget de abrir. Os módulos de mentira imitam só o que os widgets usam.
"""

import json
import shutil
import os
import re
import sys
import tempfile
import time
from pathlib import Path

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
from PySide6.QtCore import QObject, QTimer, QUrl, QMetaObject, Q_ARG, qInstallMessageHandler  # noqa: E402
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
    "streak": {"count": 12, "best": 20, "todayMet": False, "broken": 0, "lastActive": "2000-01-01", "pct": 40, "goal": 50, "line": "Faltam 2 para a meta de hoje",
               "week": [{"l": l, "state": s} for l, s in zip("DSTQQSS", ["met", "met", "off", "met", "met", "met", "open"])]},
    "iplWeek": {"title": "IPL da semana", "avg": "Média 71", "note": "Melhor dia: 88",
                "days": [{"d": "x", "l": l, "s": s, "today": i == 6} for i, (l, s) in enumerate(zip("DSTQQSS", [62, 88, None, 74, 55, 70, 41]))]},
}

# Mesmo estado, com um Flow em andamento (o widget de foco muda de cor e de jeito)
FLOW_FIXTURE = json.loads(json.dumps(FIXTURE))
FLOW_FIXTURE["focus"]["flow"] = {"active": True, "paused": False, "startedAt": now - 1500000, "elapsedSec": 1380, "done": 3, "left": 5, "total": 8, "order": "priority",
                                 "cur": {"id": "t1", "title": "Revisar a proposta do cliente", "kind": "normal", "priority": "P1"}, "next": ["Caminhada", "Responder e-mails", "Organizar a despensa"]}


def check(widget, fixture=FIXTURE):
    src = PLASMOIDS / widget / "contents" / "ui"
    base = Path(tempfile.mkdtemp())
    tmp = base / "ui"
    tmp.mkdir()
    img = PLASMOIDS / widget / "contents" / "images"
    if img.exists():
        shutil.copytree(img, base / "images")
    for f in src.glob("*.js"):
        (tmp / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")
    shared = (PLASMOIDS / "shared" / "LidaState.qml").read_text(encoding="utf-8")
    if (src / "LidaState.qml").read_text(encoding="utf-8") != shared:
        raise SystemExit(f"{widget}: LidaState.qml diferente de plasmoids/shared/LidaState.qml (copie de novo)")
    for f in src.glob("*.qml"):
        # "Plasmoid.icon: …" é propriedade anexada do Plasma; o módulo de mentira não tem.
        (tmp / f.name).write_text(re.sub(r"^\s*Plasmoid\.icon:.*$", "", f.read_text(encoding="utf-8"), flags=re.M), encoding="utf-8")
    view = QQuickView()
    view.engine().addImportPath(str(HERE / "qmlstub"))
    view.rootContext().setContextProperty("fixtureState", json.dumps(fixture))
    msgs = []
    view.engine().warnings.connect(lambda ws: msgs.extend(w.toString() for w in ws))
    view.setSource(QUrl.fromLocalFile(str(tmp / "main.qml")))
    msgs += [e.toString() for e in view.errors()]
    view.resize(900, 700)
    view.show()
    return view, msgs, tmp


def shoot(results, out_dir):
    for w, (view, _, _) in results.items():
        view.grabWindow().save(str(Path(out_dir) / f"{w}.png"))


# Avisos do DataSource de mentira (console.warn) também reprovam: vazamento de nomes, reconexão.
DS_WARN = []


def on_msg(mode, ctx, msg):
    if "DataSource:" in msg:
        DS_WARN.append(msg)
    elif not msg.startswith("CMD:"):
        sys.stderr.write(msg + "\n")


def main():
    qInstallMessageHandler(on_msg)
    app = QGuiApplication(sys.argv)
    results = {w: check(w) for w in ("org.lida.foco", "org.lida.aneis", "org.lida.ofensiva", "org.lida.semana")}
    results["org.lida.foco-flow"] = check("org.lida.foco", FLOW_FIXTURE)
    failed = []

    def done():
        if os.environ.get("LIDA_SHOTS"):
            shoot(results, os.environ["LIDA_SHOTS"])
        for w, (view, msgs, tmp) in results.items():
            msgs = [m.replace(str(tmp), w) for m in msgs]
            print(("FALHOU " if msgs else "ok     ") + w)
            for m in msgs:
                print("   ", m)
            if msgs:
                failed.append(w)
        if DS_WARN:
            print("FALHOU DataSource (%d avisos), ex.: %s" % (len(DS_WARN), DS_WARN[0]))
            failed.append("DataSource")
        app.exit(1 if failed else 0)

    # Uso prolongado: centenas de leituras e comandos não podem criar nomes novos sem limite
    # nem trocar o estado quando só o carimbo "at" mudou.
    soak = {"n": 0}

    def tick():
        soak["n"] += 1
        for w, (view, msgs, tmp) in results.items():
            r = view.rootObject().findChild(QObject, "reader") if view.rootObject() else None
            if r is None:
                if soak["n"] == 1:
                    msgs.append("sem LidaState (objectName reader)")
                continue
            r.setProperty("readSince", 0)
            QMetaObject.invokeMethod(r, "refresh")
            QMetaObject.invokeMethod(r, "run", Q_ARG("QVariant", "soak %d" % (soak["n"] % 5)), Q_ARG("QVariant", None))
        if soak["n"] < 300:
            QTimer.singleShot(2, tick)
        else:
            for w, (view, msgs, tmp) in results.items():
                r = view.rootObject().findChild(QObject, "reader")
                if r is not None and r.property("applied") != 1:
                    msgs.append("estado trocado %s vezes (esperado 1)" % r.property("applied"))

    QTimer.singleShot(300, tick)
    QTimer.singleShot(4000, done)
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
