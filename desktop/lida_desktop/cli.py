"""`lida`: o Lida no terminal.

Fala com o app (que fica na bandeja) pelo socket local; se o app não estiver aberto, abre na bandeja
e espera. Tudo passa pelas regras do Lida: recompensas, punições, foco global e sincronização.

    lida                         resumo do dia + modo interativo
    lida ls [hoje|entrada|atrasadas|proximos|feitas|tudo] [-p PROJETO]
    lida add "pagar a luz amanhã 10h p1 #casa"
    lida done 2 | lida done "relatório"
    lida foco "relatório"        põe em foco (lida foco sozinho abre a tela de foco ao vivo)
    lida pomo start|pause|reset|skip|status
    lida habitos | lida habito ler | lida agua copo | lida ipl

Referências a tarefas: o número da última lista mostrada, o id, o título ou um pedaço único dele.
Use --json para scripts (e para os widgets). Só biblioteca padrão: abre rápido.
"""

import argparse
import json
import os
import select
import shutil
import socket
import subprocess
import sys
import time
from datetime import date, datetime

from . import VERSION, paths

# ---------------------------------------------------------------- cores e símbolos
COLOR = sys.stdout.isatty() and os.environ.get("TERM") != "dumb" and not os.environ.get("NO_COLOR")


def c(code, s):
    return f"\033[{code}m{s}\033[0m" if COLOR else str(s)


def bold(s): return c("1", s)
def dim(s): return c("2", s)
def red(s): return c("31", s)
def green(s): return c("32", s)
def yellow(s): return c("33", s)
def blue(s): return c("34", s)
def magenta(s): return c("35", s)
def cyan(s): return c("36", s)
def italic(s): return c("3", s)
def strike(s): return c("9", s)


PRIO = {"P0": ("P0", "1;31"), "P1": ("P1", "33"), "P2": ("P2", "34"), "P3": ("P3", "36"), "P4": ("", "2")}
G_OPEN, G_DONE, G_LATE, G_SPRINT, G_FOCUS = "○", "✔", "⚠︎", "◆", "◉"
WD = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]
MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]


def err(msg):
    print(red("✖ ") + msg, file=sys.stderr)


def ok(msg):
    print(green("✔ ") + msg)


def bar(frac, width=16, color="32"):
    frac = max(0.0, min(1.0, frac))
    full = round(frac * width)
    return c(color, "█" * full) + dim("░" * (width - full))


def fmt_left(sec):
    sec = int(sec)
    sign = "-" if sec < 0 else ""
    sec = abs(sec)
    h, r = divmod(sec, 3600)
    m, s = divmod(r, 60)
    return f"{sign}{h}:{m:02d}:{s:02d}" if h else f"{sign}{m:02d}:{s:02d}"


def rel_day(iso):
    if not iso:
        return ""
    d = date.fromisoformat(iso)
    t = date.today()
    n = (d - t).days
    if n == 0:
        return "hoje"
    if n == 1:
        return "amanhã"
    if n == -1:
        return "ontem"
    if 1 < n < 7:
        return WD[d.weekday()]
    return f"{d.day}/{d.month:02d}"


def fmt_ml(ml):
    return f"{ml / 1000:.2f}".rstrip("0").rstrip(".").replace(".", ",") + " L" if ml >= 1000 else f"{ml} ml"


# ---------------------------------------------------------------- conexão com o app
class AppError(Exception):
    def __init__(self, msg, candidates=None, code=None):
        super().__init__(msg)
        self.candidates = candidates or []
        self.code = code


def _send(req, timeout=25):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        s.connect(str(paths.SOCKET))
        s.sendall((json.dumps(req) + "\n").encode())
        buf = b""
        while not buf.endswith(b"\n"):
            chunk = s.recv(1 << 16)
            if not chunk:
                break
            buf += chunk
    return json.loads(buf or b"{}")


def _launch():
    exe = shutil.which("lida-desktop")
    cmd = [exe, "--background"] if exe else [sys.executable, "-m", "lida_desktop.app", "--background"]
    subprocess.Popen(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)


def call(cmd, args=None, timeout=25, launch=True):
    req = {"cmd": cmd, "args": args or {}, "timeout": timeout}
    try:
        out = _send(req, timeout + 5)
    except (FileNotFoundError, ConnectionRefusedError):
        if not launch:
            raise AppError("O Lida não está aberto.", code="not-running")
        print(dim("Abrindo o Lida na bandeja…"), file=sys.stderr)
        _launch()
        for _ in range(60):
            time.sleep(0.5)
            try:
                out = _send(req, timeout + 25)
                break
            except (FileNotFoundError, ConnectionRefusedError):
                continue
        else:
            raise AppError("Não consegui abrir o Lida. Tente `lida-desktop` para ver o erro.")
    except socket.timeout:
        raise AppError("O Lida não respondeu a tempo.")
    if not out.get("ok"):
        raise AppError(out.get("error") or "Erro desconhecido.", out.get("candidates"), out.get("code"))
    return out.get("data")


# ---------------------------------------------------------------- números da última lista
def save_last(tasks):
    try:
        paths.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        paths.LAST_FILE.write_text(json.dumps([t["id"] for t in tasks]), encoding="utf-8")
    except OSError:
        pass


def ref_of(ref):
    """'3' → id do 3º item da última lista; o resto vai como está (id, título ou pedaço)."""
    r = str(ref).strip()
    if r.isdigit():
        try:
            ids = json.loads(paths.LAST_FILE.read_text(encoding="utf-8"))
            i = int(r) - 1
            if 0 <= i < len(ids):
                return ids[i]
        except (OSError, ValueError):
            pass
        raise AppError(f"Não há item {r} na última lista. Rode `lida ls` antes.")
    return r


# ---------------------------------------------------------------- desenho
def task_line(t, n=None, focus_id=None, show_due=True, ids=False):
    today = date.today().isoformat()
    late = t.get("due") and t["due"] < today and not t.get("done")
    if t.get("done"):
        g = green(G_DONE)
    elif t.get("kind") == "sprint":
        g = magenta(G_SPRINT)
    elif late:
        g = red(G_LATE)
    else:
        g = yellow(G_OPEN)
    title = strike(dim(t["title"])) if t.get("done") else bold(t["title"]) if t.get("priority") in ("P0", "P1") else t["title"]
    parts = [g, title]
    p, pc = PRIO.get(t.get("priority") or "P4", ("", "2"))
    if p and not t.get("done"):
        parts.append(c(pc, p))
    if focus_id and t["id"] == focus_id:
        parts.append(red(G_FOCUS + " em foco"))
    meta = []
    if show_due and t.get("due") and t["due"] != today:
        meta.append((red if late else dim)(rel_day(t["due"])))
    if t.get("time"):
        meta.append(dim(t["time"]))
    if t.get("project"):
        meta.append(cyan("@" + t["project"]))
    meta += [blue("#" + x) for x in t.get("tags") or []]
    subs = t.get("subtasks") or []
    if subs:
        meta.append(dim(f"[{sum(1 for s in subs if s['done'])}/{len(subs)}]"))
    if t.get("recurring"):
        meta.append(dim("↻"))
    if ids:
        meta.append(dim(t["id"]))
    num = dim(f"{n:>3} ") if n is not None else ""
    return num + " ".join(parts) + ("  " + " ".join(meta) if meta else "")


def print_tasks(tasks, focus_id=None, ids=False, numbered=True, subtasks=True, show_due=True):
    if not tasks:
        print(dim("  (nada aqui)"))
        return
    for i, t in enumerate(tasks, 1):
        print(task_line(t, i if numbered else None, focus_id, show_due, ids))
        if subtasks and t.get("subtasks") and not t.get("done"):
            for j, s in enumerate(t["subtasks"], 1):
                mark = green("☑") if s["done"] else dim("☐")
                print(f"        {mark} {dim(s['title']) if s['done'] else s['title']} {dim(f'({j})')}")
    if numbered:
        save_last(tasks)


def focus_text(f, now_ms=None):
    """Linha do foco: tarefa + cronômetro (Pomodoro, modo foco ou tempo desde o início)."""
    now_ms = now_ms or time.time() * 1000
    task = f.get("task")
    pomo = f.get("pomo") or {}
    timer = f.get("timer")
    bits = []
    if task:
        bits.append(red(G_FOCUS) + " " + bold(task["title"]))
    if timer:
        left = (timer["endsAt"] - now_ms) / 1000 if timer.get("running") else timer.get("leftSec", 0)
        bits.append(("⏱ " if timer.get("running") else "⏸ ") + fmt_left(left))
    elif pomo.get("running") or pomo.get("active"):
        left = (pomo["endsAt"] - now_ms) / 1000 if pomo.get("running") else pomo.get("leftSec", 0)
        label = "foco" if pomo.get("mode") == "focus" else "pausa"
        bits.append((c("31", "🍅 ") if COLOR else "Pomodoro ") + f"{label} {fmt_left(left)}" + ("" if pomo.get("running") else dim(" (parado)")))
    elif task and f.get("since"):
        bits.append(dim("há " + fmt_left((now_ms - f["since"]) / 1000)))
    return "  ".join(bits)


def header(st):
    d = date.today()
    g = st.get("glance") or {}
    t, h, w = g.get("tasks", {}), g.get("habits", {}), g.get("water", {})
    print(bold(f"Hoje · {['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'][d.weekday()]}, {d.day} de {MONTHS[d.month - 1]}") + dim(f"   nível {st.get('money', {}).get('level', '?')} · IPL {st.get('ipl') if st.get('ipl') is not None else '–'}"))
    tt = t.get("total") or 0
    print(f"  Tarefas {bar((t.get('done', 0) / tt) if tt else 0, 14, '34')} {t.get('done', 0)}/{tt}" + (red(f"  {t.get('overdue')} atrasada(s)") if t.get("overdue") else "") + (dim(f"  {st.get('inbox')} na entrada") if st.get("inbox") else ""))
    ht = h.get("total") or 0
    print(f"  Hábitos {bar((h.get('done', 0) / ht) if ht else 0, 14, '32')} {h.get('done', 0)}/{ht}")
    wg = w.get("goal") or 2000
    print(f"  Água    {bar(w.get('ml', 0) / wg, 14, '36')} {fmt_ml(w.get('ml', 0))} de {fmt_ml(wg)}")
    ft = focus_text(st.get("focus") or {})
    if ft:
        print("  " + ft)
        print_focus_subs((st.get("focus") or {}).get("task"))


def print_focus_subs(task, indent="      "):
    """Subtarefas (ou itens da rotina) da tarefa em foco, numeradas para `lida sub foco N`."""
    subs = (task or {}).get("subtasks") or []
    if not subs:
        return
    n = sum(1 for s in subs if s["done"])
    print(indent + dim(("Itens da rotina" if task.get("kind") == "routine" else "Subtarefas") + f" {n}/{len(subs)}"))
    for j, s in enumerate(subs, 1):
        print(f"{indent}{green('☑') if s['done'] else dim('☐')} {dim(s['title']) if s['done'] else s['title']} {dim(f'({j})')}")


# ---------------------------------------------------------------- comandos
def cmd_status(a):
    if a.cached:
        try:
            st = json.loads(paths.STATE_FILE.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            st = {"running": False}
    else:
        st = call("status")
    if a.json:
        return print(json.dumps(st, ensure_ascii=False))
    header(st)


def cmd_ls(a):
    data = call("tasks", {"view": a.view, "project": a.project})
    if a.json:
        return print(json.dumps(data["tasks"], ensure_ascii=False))
    names = {"hoje": "Hoje", "atrasadas": "Atrasadas", "entrada": "Entrada", "proximos": "Próximos dias", "feitas": "Concluídas hoje", "tudo": "Todas as abertas"}
    print(bold(names.get(a.view, a.view)) + (cyan(f"  @{a.project}") if a.project else "") + dim(f"  {len(data['tasks'])}"))
    st = None
    try:
        st = json.loads(paths.STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pass
    fid = ((st or {}).get("focus") or {}).get("task", {}) or {}
    print_tasks(data["tasks"], fid.get("id"), a.ids, subtasks=not a.compact, show_due=a.view != "hoje" or True)


def cmd_add(a):
    t = call("add", {"text": " ".join(a.text), "due": a.due, "project": a.project, "priority": a.priority})
    if a.json:
        return print(json.dumps(t, ensure_ascii=False))
    ok("Adicionada: " + task_line(t))


def _reward(r):
    if not r:
        return ""
    bits = []
    if r.get("xp"):
        bits.append(f"+{r['xp']} XP")
    if r.get("gold"):
        bits.append(f"+{r['gold']} de ouro")
    return yellow("  " + ", ".join(bits)) if bits else ""


def cmd_done(a):
    for ref in a.refs:
        r = call("done", {"ref": ref_of(ref)})
        if a.json:
            print(json.dumps(r, ensure_ascii=False))
            continue
        ok(f"Concluída: {r['task']['title']}{_reward(r.get('reward'))}")
        if r.get("levelUp"):
            print(magenta(f"  ★ Subiu para o nível {r['levelUp'].get('level', r['levelUp']) if isinstance(r['levelUp'], dict) else r['levelUp']}!"))


def cmd_undone(a):
    r = call("undone", {"ref": ref_of(a.ref)})
    print(json.dumps(r, ensure_ascii=False)) if a.json else ok(f"Reaberta: {r['task']['title']}")


def cmd_rm(a):
    ref = ref_of(a.ref)
    if not a.yes and sys.stdin.isatty():
        ans = input(f"Excluir {bold(a.ref)}? [s/N] ").strip().lower()
        if ans not in ("s", "sim", "y", "yes"):
            return print(dim("Nada foi excluído."))
    r = call("rm", {"ref": ref})
    print(json.dumps(r, ensure_ascii=False)) if a.json else ok(f"Excluída: {r['removed']['title']}")


def cmd_edit(a):
    args = {"ref": ref_of(a.ref), "title": a.title, "due": a.due, "time": a.time, "priority": a.priority, "notes": a.notes}
    t = call("edit", {k: v for k, v in args.items() if v is not None})
    print(json.dumps(t, ensure_ascii=False)) if a.json else ok("Atualizada: " + task_line(t))


def cmd_sub(a):
    t = call("sub", {"ref": ref_of(a.ref), "n": a.n})
    if a.json:
        return print(json.dumps(t, ensure_ascii=False))
    print(task_line(t))
    for j, s in enumerate(t.get("subtasks") or [], 1):
        print(f"        {green('☑') if s['done'] else dim('☐')} {s['title']} {dim(f'({j})')}")


def cmd_focus(a):
    if a.what in ("parar", "stop"):
        f = call("focus", {"action": "stop"})
        return print(json.dumps(f)) if a.json else ok("Foco encerrado.")
    if a.what in ("concluir", "done"):
        r = call("focus", {"action": "done"})
        return print(json.dumps(r, ensure_ascii=False)) if a.json else ok(f"Concluída: {r['done']['title']}{_reward(r.get('reward'))}")
    if a.what in ("status",) or (not a.what and (a.json or not sys.stdout.isatty())):
        f = call("focus", {})
        if a.json:
            return print(json.dumps(f, ensure_ascii=False))
        print(focus_text(f) or dim("Nada em foco."))
        return print_focus_subs(f.get("task"), "  ")
    if a.what:
        f = call("focus", {"ref": ref_of(" ".join([a.what] + a.rest))})
        if a.json:
            return print(json.dumps(f, ensure_ascii=False))
        ok(f"Em foco: {bold(f['task']['title'])}" + dim("  (aparece no celular, na bandeja e no widget)"))
        if not sys.stdout.isatty() or a.no_screen:
            return
    focus_screen()


def cmd_pomo(a):
    args = {"action": {"iniciar": "start", "pausar": "pause", "reiniciar": "reset", "pular": "skip"}.get(a.action, a.action)}
    if a.foco:
        args["focusMin"] = a.foco
    if a.pausa:
        args["breakMin"] = a.pausa
    p = call("pomo", args)
    if a.json:
        return print(json.dumps(p))
    left = (p["endsAt"] - time.time() * 1000) / 1000 if p.get("running") else p.get("leftSec", 0)
    label = "Foco" if p.get("mode") == "focus" else "Pausa"
    state = "rodando" if p.get("running") else "parado"
    print(f"🍅 Pomodoro · {label} {bold(fmt_left(left))} {dim(state)}  {dim(f'(foco {p.get('focusMin')} min, pausa {p.get('breakMin')} min)')}")


def cmd_habits(a):
    hs = call("habits")
    if a.json:
        return print(json.dumps(hs, ensure_ascii=False))
    print(bold("Hábitos"))
    for i, h in enumerate(hs, 1):
        mark = green(G_DONE) if h["done"] else (yellow(G_OPEN) if h["scheduled"] else dim("–"))
        prog = f" {h['count']}/{h['goal']}" if h["goal"] > 1 else ""
        streak = yellow(f" 🔥{h['streak']}") if h["streak"] else ""
        rest = dim(" (folga hoje)") if not h["scheduled"] else ""
        print(f"{dim(f'{i:>3} ')}{mark} {(h['icon'] + ' ') if h.get('icon') else ''}{h['title']}{dim(prog)}{streak}{rest}")


def cmd_habit(a):
    r = call("habit", {"ref": " ".join(a.ref), "undo": a.undo})
    if a.json:
        return print(json.dumps(r, ensure_ascii=False))
    h = r["habit"]
    msg = f"{h['title']}: {h['count']}/{h['goal']}" if h["goal"] > 1 else h["title"] + (" feito" if h["done"] else " desmarcado")
    ok(msg + (yellow("  meta do dia!") if r.get("completed") else "") + (yellow(f"  🔥{h['streak']}") if h.get("streak") else ""))


def cmd_water(a):
    r = call("water", {"ml": a.amount, "undo": a.undo})
    if a.json:
        return print(json.dumps(r))
    if a.undo:
        return ok(f"Removido o último registro ({fmt_ml(r.get('removed') or 0)}). Total: {fmt_ml(r['total'])}")
    ok(f"+{fmt_ml(r['added'])} · {fmt_ml(r['total'])} de {fmt_ml(r['goal'])}" + (yellow("  meta batida! +20 XP") if r.get("hit") else ""))


def cmd_ipl(a):
    r = call("ipl")
    if a.json:
        return print(json.dumps(r))
    print(bold("IPL · Índice de Produtividade do Lida"))
    print(f"  Hoje, até agora: {bold(r['today']) if r['today'] is not None else '–'} {dim(r.get('grade') or '')}")
    if r.get("month"):
        print(f"  Média do mês:    {bold(r['month']['score'])} {dim(r['month']['grade'])} {dim(f'({r['month']['days']} dias)')}")
    names = {"exec": "Execução", "habits": "Hábitos e rotinas", "steady": "Constância", "proj": "Projetos e sprints", "plan": "Planejamento", "focus": "Foco"}
    for k, v in (r.get("parts") or {}).items():
        if v is not None:
            print(f"  {names.get(k, k):<20} {bar(v, 12, '34')} {round(v * 100)}%")
    days = r.get("days") or []
    if days:
        spark = "▁▂▃▄▅▆▇█"
        print("  Últimos dias:     " + "".join(spark[min(7, max(0, int(d["score"] / 12.5)))] for d in days) + dim(f"  {days[0]['date'][5:]} → {days[-1]['date'][5:]}"))


def cmd_brain(a):
    r = call("brain", {"text": " ".join(a.text)})
    print(json.dumps(r)) if a.json else ok(f"Anotado em \"Esvaziar a mente\" ({r['added']}).")


def cmd_projects(a):
    ps = call("projects")
    if a.json:
        return print(json.dumps(ps, ensure_ascii=False))
    for p in ps:
        tot = p["open"] + p["done"]
        print(f"{cyan('@' + p['name']):<30} {bar(p['done'] / tot if tot else 0, 12)} {p['open']} abertas")


def cmd_search(a):
    ts = call("search", {"q": " ".join(a.q)})
    if a.json:
        return print(json.dumps(ts, ensure_ascii=False))
    print_tasks(ts)


def cmd_open(a):
    call("show", {"route": a.route or ""})


def cmd_quit(a):
    try:
        call("quit", launch=False)
        ok("Lida fechado.")
    except AppError:
        print(dim("O Lida já estava fechado."))


# ---------------------------------------------------------------- tela de foco ao vivo
def _raw_keys():
    import termios
    import tty

    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    tty.setcbreak(fd)
    return fd, old


def focus_screen():
    """Tela de foco no terminal, ligada ao foco global (muda junto com o app, o celular e o widget).

    espaço: iniciar/pausar Pomodoro   c: concluir   s: parar foco   ↑/↓ ou j/k: subtarefas
    enter: marcar subtarefa   q: sair (o foco continua)
    """
    import termios

    fd, old = _raw_keys()
    sel = 0
    frames = "◐◓◑◒"
    tick = 0
    last = 0
    st = {}
    prev = ""
    try:
        sys.stdout.write("\033[?25l")
        while True:
            if time.time() - last > 1.5:
                try:
                    st = call("status")
                except AppError as e:
                    st = {"error": str(e)}
                last = time.time()
            f = st.get("focus") or {}
            task = f.get("task")
            full = task or next((t for t in st.get("today") or [] if task and t["id"] == task["id"]), None) or {}
            subs = full.get("subtasks") or []
            sel = min(sel, max(0, len(subs) - 1))
            cols = shutil.get_terminal_size((80, 24)).columns
            out = ["\033[H\033[J"]
            out.append(red(" ● ") + dim("LIDA · FOCO") + dim("   " + datetime.now().strftime("%H:%M")))
            out.append("")
            if st.get("error"):
                out.append(red("  " + st["error"]))
            elif not task:
                out.append(dim("  Nada em foco. Escolha uma tarefa com `lida foco \"tarefa\"` ou no app."))
            else:
                spin = red(frames[tick % 4]) if (f.get("pomo") or {}).get("running") or (f.get("timer") or {}).get("running") else red("●")
                out.append(f"  {spin} {bold(task['title'][: cols - 6])}")
                out.append("  " + focus_text(dict(f, task=None)))
                if subs:
                    out.append("")
                    for i, s in enumerate(subs):
                        cur = cyan("›") if i == sel else " "
                        mark = green("☑") if s["done"] else "☐"
                        out.append(f"  {cur} {mark} {dim(s['title']) if s['done'] else s['title']}")
            pomo = f.get("pomo") or {}
            if not task and (pomo.get("running") or pomo.get("active")):
                out.append("  " + focus_text(f))
            out.append("")
            keys = ["espaço Pomodoro", "c concluir", "s parar foco"] + (["↑↓ subtarefas", "enter marcar"] if subs else []) + ["q sair"]
            out.append(dim("  " + "  ·  ".join(keys)))
            frame = "\n".join(out) + "\n"
            if frame != prev:  # só redesenha quando muda (sem piscar)
                sys.stdout.write(frame)
                sys.stdout.flush()
                prev = frame
            tick += 1
            r, _, _ = select.select([sys.stdin], [], [], 0.25)
            if not r:
                continue
            ch = os.read(fd, 8).decode(errors="ignore")
            try:
                if ch in ("q", "\x03", "\x1b"):
                    break
                if ch == " ":
                    call("pomo", {"action": "toggle"})
                elif ch in ("c", "\x04") and task:
                    res = call("focus", {"action": "done"})
                    sys.stdout.write("\033[H\033[J")
                    ok(f"Concluída: {res['done']['title']}{_reward(res.get('reward'))}")
                    return
                elif ch == "s" and task:
                    call("focus", {"action": "stop"})
                elif ch in ("j", "\x1b[B") and subs:
                    sel = min(len(subs) - 1, sel + 1)
                elif ch in ("k", "\x1b[A") and subs:
                    sel = max(0, sel - 1)
                elif ch in ("\n", "\r") and subs and task:
                    call("sub", {"ref": task["id"], "n": sel + 1})
                last = 0
            except AppError as e:
                st = {"error": str(e)}
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)
        sys.stdout.write("\033[?25h")
        sys.stdout.flush()


# ---------------------------------------------------------------- modo interativo
def interactive():
    while True:
        st = call("status")
        print()
        header(st)
        print()
        fid = ((st.get("focus") or {}).get("task") or {}).get("id")
        print_tasks(st.get("today") or [], fid, subtasks=False)
        print()
        print(dim("  número concluir · f N focar · a texto adicionar · p Pomodoro · h N hábito · w água · F tela de foco · q sair"))
        try:
            line = input(cyan("lida› ")).strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if not line:
            continue
        try:
            if line in ("q", "sair", "exit"):
                return
            if line.isdigit():
                r = call("done", {"ref": ref_of(line)})
                ok(f"Concluída: {r['task']['title']}{_reward(r.get('reward'))}")
            elif line.startswith("f "):
                f = call("focus", {"ref": ref_of(line[2:])})
                ok(f"Em foco: {f['task']['title']}")
            elif line == "F":
                focus_screen()
            elif line.startswith("a "):
                t = call("add", {"text": line[2:]})
                ok("Adicionada: " + task_line(t))
            elif line == "p":
                call("pomo", {"action": "toggle"})
            elif line.startswith("h"):
                hs = call("habits")
                if line == "h":
                    for i, h in enumerate(hs, 1):
                        print(f"{dim(f'{i:>3} ')}{green(G_DONE) if h['done'] else yellow(G_OPEN)} {h['title']}")
                    continue
                i = int(line[1:].strip()) - 1
                r = call("habit", {"ref": hs[i]["id"]})
                ok(f"{r['habit']['title']}: {r['habit']['count']}/{r['habit']['goal']}")
            elif line == "w":
                r = call("water", {"ml": "copo"})
                ok(f"+{fmt_ml(r['added'])} · {fmt_ml(r['total'])} de {fmt_ml(r['goal'])}")
            else:
                err("Não entendi. Exemplos: 2 · f 3 · a comprar pão amanhã · p · q")
        except (AppError, ValueError, IndexError) as e:
            err(str(e))


# ---------------------------------------------------------------- completions
COMMANDS = ["ls", "hoje", "add", "done", "undone", "rm", "edit", "sub", "foco", "pomo", "habitos", "habito", "agua", "ipl", "mente", "projetos", "buscar", "abrir", "status", "fechar", "completions", "interativo"]


def completion(shell):
    cmds = " ".join(COMMANDS)
    if shell == "bash":
        return f"""# lida: completar comandos (bash)
_lida() {{
  local cur prev
  cur="${{COMP_WORDS[COMP_CWORD]}}"; prev="${{COMP_WORDS[COMP_CWORD-1]}}"
  if [ "$COMP_CWORD" -eq 1 ]; then COMPREPLY=( $(compgen -W "{cmds}" -- "$cur") ); return; fi
  case "$prev" in
    ls) COMPREPLY=( $(compgen -W "hoje atrasadas entrada proximos feitas tudo" -- "$cur") ) ;;
    pomo) COMPREPLY=( $(compgen -W "start pause toggle reset skip status iniciar pausar reiniciar pular" -- "$cur") ) ;;
    foco) COMPREPLY=( $(compgen -W "parar concluir status" -- "$cur") ) ;;
    agua) COMPREPLY=( $(compgen -W "copo garrafa" -- "$cur") ) ;;
    abrir) COMPREPLY=( $(compgen -W "hoje planejar habitos loja eu ajustes entrada em-breve projetos" -- "$cur") ) ;;
    completions) COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") ) ;;
  esac
}}
complete -F _lida lida
"""
    if shell == "zsh":
        return f"""#compdef lida
# lida: completar comandos (zsh)
_lida() {{
  local -a cmds; cmds=({cmds})
  if (( CURRENT == 2 )); then _describe 'comando' cmds; return; fi
  case $words[2] in
    ls) _values 'lista' hoje atrasadas entrada proximos feitas tudo ;;
    pomo) _values 'ação' start pause toggle reset skip status ;;
    foco) _values 'ação' parar concluir status ;;
    agua) _values 'quantidade' copo garrafa ;;
    abrir) _values 'seção' hoje planejar habitos loja eu ajustes ;;
    completions) _values 'shell' bash zsh fish ;;
  esac
}}
_lida "$@"
"""
    if shell == "fish":
        lines = ["# lida: completar comandos (fish)", "complete -c lida -f"]
        lines += [f"complete -c lida -n '__fish_use_subcommand' -a {x}" for x in COMMANDS]
        for sub, vals in {"ls": "hoje atrasadas entrada proximos feitas tudo", "pomo": "start pause toggle reset skip status", "foco": "parar concluir status", "agua": "copo garrafa", "abrir": "hoje planejar habitos loja eu ajustes", "completions": "bash zsh fish"}.items():
            lines.append(f"complete -c lida -n '__fish_seen_subcommand_from {sub}' -a '{vals}'")
        return "\n".join(lines) + "\n"
    raise AppError("Use bash, zsh ou fish.")


def cmd_completions(a):
    print(completion(a.shell), end="")


# ---------------------------------------------------------------- argumentos
def parser():
    p = argparse.ArgumentParser(prog="lida", description="Lida no terminal: tarefas, foco, Pomodoro, hábitos e água. Sem argumentos: resumo do dia e modo interativo.")
    p.add_argument("--json", action="store_true", help="saída em JSON (para scripts e widgets)")
    p.add_argument("--no-color", action="store_true", help="sem cores")
    p.add_argument("--version", action="version", version=f"lida {VERSION}")
    sp = p.add_subparsers(dest="cmd", metavar="comando")

    def add(name, fn, help, aliases=()):
        s = sp.add_parser(name, help=help, aliases=list(aliases))
        s.set_defaults(fn=fn)
        s.add_argument("--json", action="store_true", default=argparse.SUPPRESS, help=argparse.SUPPRESS)
        return s

    s = add("ls", cmd_ls, "lista tarefas", ["list", "tarefas"])
    s.add_argument("view", nargs="?", default="hoje", choices=["hoje", "atrasadas", "entrada", "proximos", "feitas", "tudo"])
    s.add_argument("-p", "--projeto", dest="project")
    s.add_argument("--ids", action="store_true", help="mostra os ids")
    s.add_argument("-c", "--compacto", dest="compact", action="store_true", help="sem subtarefas")
    s = add("hoje", lambda a: cmd_ls(argparse.Namespace(**{**vars(a), "view": "hoje"})), "tarefas de hoje (e atrasadas)", ["today"])
    s.add_argument("-p", "--projeto", dest="project")
    s.add_argument("--ids", action="store_true")
    s.add_argument("-c", "--compacto", dest="compact", action="store_true")

    s = add("add", cmd_add, "adiciona em linguagem natural: \"pagar a luz amanhã 10h p1 #casa @Trabalho\"", ["nova", "a"])
    s.add_argument("text", nargs="+")
    s.add_argument("-d", "--data", dest="due", help="hoje, amanhã, sexta, 15/11, 2026-11-15...")
    s.add_argument("-p", "--projeto", dest="project")
    s.add_argument("-P", "--prioridade", dest="priority", help="P0 a P4 (ou 0 a 4)")

    s = add("done", cmd_done, "conclui (número, título ou pedaço)", ["feito", "concluir", "d"])
    s.add_argument("refs", nargs="+")
    s = add("undone", cmd_undone, "reabre uma concluída", ["reabrir"])
    s.add_argument("ref")
    s = add("rm", cmd_rm, "exclui uma tarefa", ["excluir"])
    s.add_argument("ref")
    s.add_argument("-y", "--sim", dest="yes", action="store_true", help="sem confirmar")
    s = add("edit", cmd_edit, "altera título, data, hora, prioridade ou notas", ["editar", "update"])
    s.add_argument("ref")
    s.add_argument("-t", "--titulo", dest="title")
    s.add_argument("-d", "--data", dest="due", help="nova data (ou 'nenhuma')")
    s.add_argument("-H", "--hora", dest="time", help="HH:MM (ou 'nenhum')")
    s.add_argument("-P", "--prioridade", dest="priority")
    s.add_argument("-n", "--notas", dest="notes")
    s = add("sub", cmd_sub, "marca/desmarca a subtarefa N de uma tarefa (\"foco\" = a tarefa em foco)", ["subtarefa"])
    s.add_argument("ref")
    s.add_argument("n", type=int)

    s = add("foco", cmd_focus, "põe uma tarefa em foco (sem nada: tela de foco ao vivo); parar | concluir | status", ["focus", "doing"])
    s.add_argument("what", nargs="?")
    s.add_argument("rest", nargs="*")
    s.add_argument("--sem-tela", dest="no_screen", action="store_true", help="não abre a tela de foco depois")
    s = add("pomo", cmd_pomo, "Pomodoro: start | pause | toggle | reset | skip | status", ["pomodoro"])
    s.add_argument("action", nargs="?", default="status", choices=["start", "pause", "toggle", "reset", "skip", "status", "iniciar", "pausar", "reiniciar", "pular"])
    s.add_argument("--foco", type=int, help="minutos de foco (5 a 90)")
    s.add_argument("--pausa", type=int, help="minutos de pausa (1 a 30)")

    add("habitos", cmd_habits, "hábitos de hoje", ["habits", "h"])
    s = add("habito", cmd_habit, "marca um hábito (+1 na meta do dia)", ["habit"])
    s.add_argument("ref", nargs="+")
    s.add_argument("-u", "--desfazer", dest="undo", action="store_true", help="tira 1")
    s = add("agua", cmd_water, "registra água: copo, garrafa ou ml", ["água", "water", "w"])
    s.add_argument("amount", nargs="?", default="copo")
    s.add_argument("-u", "--desfazer", dest="undo", action="store_true", help="remove o último registro")
    add("ipl", cmd_ipl, "Índice de Produtividade do Lida")
    s = add("mente", cmd_brain, "anota em \"Esvaziar a mente\"", ["brain"])
    s.add_argument("text", nargs="+")
    add("projetos", cmd_projects, "projetos e progresso", ["projects"])
    s = add("buscar", cmd_search, "busca tarefas", ["search", "s"])
    s.add_argument("q", nargs="+")
    s = add("abrir", cmd_open, "mostra a janela (numa seção)", ["open"])
    s.add_argument("route", nargs="?")
    s = add("status", cmd_status, "resumo do dia (com --json: estado completo)")
    s.add_argument("--cached", action="store_true", help="lê o último estado salvo, sem falar com o app")
    add("fechar", cmd_quit, "fecha o app Lida", ["quit"])
    s = add("completions", cmd_completions, "script de completar comandos")
    s.add_argument("shell", choices=["bash", "zsh", "fish"])
    add("interativo", lambda a: interactive(), "modo interativo", ["i"])
    return p


def main(argv=None):
    global COLOR
    p = parser()
    a = p.parse_args(argv)
    if a.no_color or getattr(a, "json", False):
        COLOR = False
    try:
        if not a.cmd:
            st = call("status")
            header(st)
            print()
            fid = ((st.get("focus") or {}).get("task") or {}).get("id")
            print_tasks(st.get("today") or [], fid, subtasks=False)
            if sys.stdin.isatty() and sys.stdout.isatty():
                print()
                print(dim("  Modo interativo: digite um número para concluir, ou q para sair."))
                interactive()
            return 0
        a.fn(a)
        return 0
    except AppError as e:
        if getattr(a, "json", False):
            print(json.dumps({"error": str(e), "candidates": e.candidates}, ensure_ascii=False))
        else:
            err(str(e))
            for cnd in e.candidates:
                print(dim(f"   · {cnd['title']}  ({cnd['id']})"), file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
