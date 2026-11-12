"""Idioma do app Linux (menus, bandeja e avisos do Qt). A página do Lida traduz a si mesma (js/i18n);
aqui ficam só os textos do lado do Qt. O idioma vem do app (Ajustes > Idioma, enviado no estado) e fica
guardado; antes disso, segue o sistema. A CLI `lida` continua em português.
"""

import locale

LANGS = ("pt", "en", "es")

# "texto em português": ("inglês", "espanhol")
T = {
    "&Exibir": ("&View", "&Ver"),
    "&Foco": ("&Focus", "&Enfoque"),
    "&Ajustes": ("&Settings", "&Ajustes"),
    "Aj&uda": ("&Help", "Ay&uda"),
    "Nova tarefa": ("New task", "Nueva tarea"),
    "Buscar": ("Search", "Buscar"),
    "Esvaziar a mente": ("Empty your mind", "Vaciar la mente"),
    "Ajustes": ("Settings", "Ajustes"),
    "Fechar janela": ("Close window", "Cerrar ventana"),
    "Sair do Lida": ("Quit Lida", "Salir de Lida"),
    "Hoje / Painel": ("Today / Board", "Hoy / Panel"),
    "Planejar": ("Plan", "Planificar"),
    "Hábitos": ("Habits", "Hábitos"),
    "Loja": ("Shop", "Tienda"),
    "Eu": ("Me", "Yo"),
    "Tema": ("Theme", "Tema"),
    "Fonte": ("Font", "Fuente"),
    "Tamanho": ("Size", "Tamaño"),
    "Mostrar concluídas em Hoje": ("Show completed in Today", "Mostrar completadas en Hoy"),
    "Barra lateral translúcida": ("Translucent sidebar", "Barra lateral translúcida"),
    "Tela cheia": ("Full screen", "Pantalla completa"),
    "Focar numa tarefa…": ("Focus on a task…", "Enfocarse en una tarea…"),
    "Parar foco": ("Stop focus", "Detener enfoque"),
    "Concluir a tarefa em foco": ("Complete the task in focus", "Completar la tarea en foco"),
    "Iniciar Pomodoro": ("Start Pomodoro", "Iniciar Pomodoro"),
    "Pausar Pomodoro": ("Pause Pomodoro", "Pausar Pomodoro"),
    "Continuar Pomodoro": ("Resume Pomodoro", "Continuar Pomodoro"),
    "Reiniciar Pomodoro": ("Restart Pomodoro", "Reiniciar Pomodoro"),
    "Pular para a pausa / foco": ("Skip to break / focus", "Saltar a la pausa / enfoque"),
    "Abrir o Pomodoro": ("Open Pomodoro", "Abrir el Pomodoro"),
    "Sons": ("Sounds", "Sonidos"),
    "Punições por tarefa vencida": ("Penalties for overdue tasks", "Castigos por tarea vencida"),
    "Lembretes": ("Reminders", "Recordatorios"),
    "Lembretes ligados": ("Reminders on", "Recordatorios activados"),
    "Tarefas com horário": ("Timed tasks", "Tareas con hora"),
    "Hábitos pendentes": ("Pending habits", "Hábitos pendientes"),
    "Resumo da manhã": ("Morning summary", "Resumen de la mañana"),
    "Fechamento do dia": ("Day closing", "Cierre del día"),
    "Água": ("Water", "Agua"),
    "Aviso com o app aberto": ("Notify with the app open", "Aviso con la app abierta"),
    "Fechar para a bandeja": ("Close to the tray", "Cerrar a la bandeja"),
    "Abrir com o sistema (na bandeja)": ("Open at login (in the tray)", "Abrir con el sistema (en la bandeja)"),
    "Comandos do terminal (lida --help)": ("Terminal commands (lida --help)", "Comandos de terminal (lida --help)"),
    "Sobre o Lida": ("About Lida", "Acerca de Lida"),
    "Tarefas e hábitos, com jogo.": ("Tasks and habits, as a game.", "Tareas y hábitos, como un juego."),
    "App Linux em Qt/PySide6.": ("Linux app in Qt/PySide6.", "App de Linux en Qt/PySide6."),
    "Lida no terminal": ("Lida in the terminal", "Lida en la terminal"),
    "(a CLI fala português)": ("(the CLI speaks Portuguese)", "(la CLI habla portugués)"),
    "Mostrar o Lida": ("Show Lida", "Mostrar Lida"),
    "Em foco: {0}": ("In focus: {0}", "En foco: {0}"),
    "Modo foco {0}": ("Focus mode {0}", "Modo enfoque {0}"),
    "Pomodoro · {0}": ("Pomodoro · {0}", "Pomodoro · {0}"),
    "Pomodoro (parado) · {0}": ("Pomodoro (stopped) · {0}", "Pomodoro (detenido) · {0}"),
    "Hoje: {0} de {1} tarefas": ("Today: {0} of {1} tasks", "Hoy: {0} de {1} tareas"),
    "Arquivo salvo em {0}": ("File saved to {0}", "Archivo guardado en {0}"),
    "A porta {0} já está em uso ({1}). Feche o outro programa ou defina LIDA_PORT.": (
        "Port {0} is already in use ({1}). Close the other program or set LIDA_PORT.",
        "El puerto {0} ya está en uso ({1}). Cierra el otro programa o define LIDA_PORT.",
    ),
}

_lang = "pt"


def system_lang():
    for v in (locale.getlocale()[0], *[__import__("os").environ.get(k) for k in ("LANGUAGE", "LC_ALL", "LC_MESSAGES", "LANG")]):
        k = (v or "").split(":")[0][:2].lower()
        if k in LANGS:
            return k
    return "pt"


def set_lang(lang):
    global _lang
    _lang = lang if lang in LANGS else "pt"


def lang():
    return _lang


def tr(s, *args):
    """Texto em português → idioma atual; {0}, {1}... recebem args."""
    out = s
    if _lang != "pt" and s in T:
        out = T[s][LANGS.index(_lang) - 1]
    for i, a in enumerate(args):
        out = out.replace("{%d}" % i, str(a))
    return out
