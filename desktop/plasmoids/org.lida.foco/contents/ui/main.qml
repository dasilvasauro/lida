/*
 * Lida · Foco — widget de barra do Plasma 6, com a cara do Lida.
 *
 * Na barra (compacto):  ● Nome da tarefa em foco (rolando) 17:58 │ ◔ 5  ⚠ 1 │ 🔥 1/3 │ 💧 1,2 L
 *   tarefa em foco com cronômetro · tarefas de hoje (anel de progresso + abertas, atrasadas)
 *   · hábitos do dia · água que falta para a meta. Ícones e cores são os do app.
 * Ao clicar: adicionar em linguagem natural, cartão "Em foco" (Concluir, Pomodoro, Parar),
 *   abas Hoje · Atrasadas · Entrada (concluir e focar), hábitos (toque soma um) e água.
 *
 * Lê o estado que o app grava em ~/.cache/lida/state.json e age pela CLI `lida`.
 */

import QtQuick
import QtQuick.Layouts
import QtQuick.Shapes
import QtQuick.Controls as QQC2
import org.kde.plasma.plasmoid
import org.kde.plasma.plasma5support as Plasma5Support
import org.kde.kirigami as Kirigami
import "Icons.js" as Icons

PlasmoidItem {
    id: root

    // ---------------------------------------------------------------- estado (vem do app)
    // Nomes que não colidem com propriedades do Item (focus, state...).
    property var st: ({})
    readonly property bool appOn: !!st.running
    readonly property var fz: st.focus || ({})
    readonly property var fTask: fz.task || null
    // Subtarefas (ou itens da rotina) da tarefa em foco: aparecem no cartão de foco, marcáveis.
    readonly property var fSubs: fTask && fTask.subtasks ? fTask.subtasks : []
    readonly property int fSubsDone: fSubs.filter(function (s) { return s.done }).length
    readonly property var pomo: fz.pomo || ({})
    readonly property var tmr: fz.timer || null
    readonly property var gl: st.glance || ({ tasks: {}, habits: {}, water: {} })
    readonly property var todayList: st.today || []
    readonly property var inboxList: st.inboxList || []
    readonly property var habitList: st.habits || []
    readonly property var water: st.water || ({ ml: 0, goal: 2000, glass: 250, bottle: 500 })
    property double now: Date.now()
    property int lastDone: -1
    property string lastError: ""
    property string busyMsg: ""
    property int tab: 0
    signal celebrate(string text)

    readonly property int tasksDone: gl.tasks.done || 0
    readonly property int tasksTotal: gl.tasks.total || 0
    readonly property int openToday: Math.max(0, tasksTotal - tasksDone)
    readonly property int overdue: gl.tasks.overdue || 0
    readonly property int habitsDone: gl.habits.done || 0
    readonly property int habitsTotal: gl.habits.total || 0
    readonly property int waterGoal: water.goal || 2000
    readonly property int waterLeft: Math.max(0, waterGoal - (water.ml || 0))
    readonly property bool ticking: !!(tmr && tmr.running) || !!pomo.running
    readonly property bool pomoOn: !!pomo.running || !!pomo.active

    // ---------------------------------------------------------------- cores do Lida
    // Grafite (escuro) ou Claro, conforme o tema do Plasma.
    readonly property color bgc: Kirigami.Theme.backgroundColor
    readonly property bool dark: (bgc.r * 0.299 + bgc.g * 0.587 + bgc.b * 0.114) < 0.55
    readonly property color cBg: dark ? "#0f1217" : "#f5f6f8"
    readonly property color cSurface: dark ? "#151920" : "#ffffff"
    readonly property color cSurface2: dark ? "#1c212a" : "#eef0f4"
    readonly property color cSurface3: dark ? "#242a35" : "#e3e6ec"
    readonly property color cLine: dark ? "#262c36" : "#e1e4ea"
    readonly property color cText: dark ? "#e8ebf0" : "#12151b"
    readonly property color cMuted: dark ? "#9aa2b0" : "#545c6a"
    readonly property color cDim: dark ? "#5d6573" : "#8b93a1"
    readonly property color cAccent: dark ? "#8b98ff" : "#4f5fe8"
    readonly property color cOnAccent: dark ? "#0f1217" : "#ffffff"
    readonly property color cG1: dark ? "#7c8cff" : "#5b6cf0"
    readonly property color cG2: dark ? "#5fe3b5" : "#12a57f"
    readonly property color cPos: dark ? "#5fe3b5" : "#0e8f6a"
    readonly property color cNeg: dark ? "#f2716b" : "#d64545"
    readonly property color cWarn: dark ? "#f2c14e" : "#a87a06"
    readonly property color cWater: dark ? "#5aa9ff" : "#2f7fe0"
    readonly property color cRec: "#e5484d"
    function prioColor(p) {
        if (p === "P0") return dark ? "#ff5c7a" : "#d92d4c"
        if (p === "P1") return dark ? "#ff9f43" : "#d4690f"
        if (p === "P2") return dark ? "#5aa9ff" : "#2f7fe0"
        if (p === "P3") return dark ? "#8b93a1" : "#6b7382"
        return dark ? "#5d6573" : "#a4abb7"
    }
    function tint(c, a) { return Qt.rgba(c.r, c.g, c.b, a) }

    Plasmoid.icon: "io.github.dasilvasauro.lida"
    switchWidth: Kirigami.Units.gridUnit * 12
    switchHeight: Kirigami.Units.gridUnit * 12
    toolTipMainText: fTask ? "Em foco: " + fTask.title : "Lida"
    toolTipSubText: !appOn ? "O Lida está fechado" : tasksDone + " de " + tasksTotal + " tarefas · hábitos " + habitsDone + "/" + habitsTotal + " · água: " + (waterLeft > 0 ? "faltam " + ml(waterLeft) : "meta batida") + (timerText() !== "" ? "\n" + timerLabel() + " " + timerText() : "")

    // ---------------------------------------------------------------- utilidades
    function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'" }
    function bin() { return shq(Plasmoid.configuration.binaryPath || "lida") }
    function pad(n) { return (n < 10 ? "0" : "") + n }
    function fmt(sec) {
        var neg = sec < 0; sec = Math.abs(Math.round(sec))
        var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60
        return (neg ? "-" : "") + (h ? h + ":" + pad(m) : pad(m)) + ":" + pad(s)
    }
    function ml(v) { return v >= 1000 ? (v / 1000).toFixed(2).replace(/\.?0+$/, "").replace(".", ",") + " L" : v + " ml" }
    function todayStr() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) }
    function dateLabel() {
        var d = new Date()
        var wd = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][d.getDay()]
        var mo = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][d.getMonth()]
        return wd + ", " + d.getDate() + " " + mo
    }
    function timerSeconds() {
        if (tmr) return tmr.running && tmr.endsAt ? (tmr.endsAt - now) / 1000 : tmr.leftSec
        if (pomo.running) return (pomo.endsAt - now) / 1000
        if (pomo.active) return pomo.leftSec
        if (fTask && fz.since) return (now - fz.since) / 1000
        return null
    }
    function timerText() { var s = timerSeconds(); return (s === null || s === undefined) ? "" : fmt(s) }
    function timerLabel() {
        if (tmr) return tmr.running ? "Modo foco" : "Modo foco · pausado"
        if (pomo.running) return pomo.mode === "focus" ? "Pomodoro" : "Pausa"
        if (pomo.active) return "Pomodoro · parado"
        if (fTask) return "Em foco há"
        return ""
    }
    function pomoFraction() {
        var total = (pomo.mode === "break" ? (pomo.breakMin || 5) : (pomo.focusMin || 25)) * 60
        var left = pomo.running ? (pomo.endsAt - now) / 1000 : (pomo.leftSec || total)
        return Math.max(0, Math.min(1, 1 - left / total))
    }
    function listFor(t) {
        var d = todayStr()
        if (t === 1) return todayList.filter(function (x) { return x.due && x.due < d })
        if (t === 2) return inboxList
        return todayList
    }

    // ---------------------------------------------------------------- leitura e comandos
    Plasma5Support.DataSource {
        id: sh
        engine: "executable"
        connectedSources: []
        property var callbacks: ({})
        onNewData: function (source, data) {
            var cb = callbacks[source]
            if (cb) { delete callbacks[source]; cb(data["stdout"] || "", data["stderr"] || "", data["exit code"]) }
            disconnectSource(source)
        }
        function run(cmd, cb) {
            var full = cmd + " # " + Math.random().toString(36).slice(2)
            if (cb) callbacks[full] = cb
            connectSource(full)
        }
    }
    property bool reading: false
    function refresh() {
        if (reading) return
        reading = true
        sh.run("cat \"${XDG_CACHE_HOME:-$HOME/.cache}/lida/state.json\" 2>/dev/null", function (out) {
            reading = false
            if (!out) { st = ({ running: false }); return }
            try {
                var s = JSON.parse(out)
                var d = (s.glance && s.glance.tasks) ? (s.glance.tasks.done || 0) : 0
                if (lastDone >= 0 && s.date === st.date && d > lastDone) root.celebrate("+" + (d - lastDone))
                lastDone = d
                st = s
            } catch (e) { }
        })
    }
    function lida(args, msg) {
        busyMsg = msg || ""
        sh.run(bin() + " --json " + args, function (out, err, code) {
            busyMsg = ""
            lastError = ""
            try { var r = JSON.parse(out); if (r && r.error) lastError = r.error } catch (e) { if (code) lastError = (err || "Não consegui falar com o Lida.").split("\n")[0] }
            refresh()
        })
    }
    function openApp(route) { sh.run(bin() + " abrir " + (route ? shq(route) : ""), null) }
    function startApp() { sh.run("lida-desktop --background", function () { pollTimer.restart() }) }

    Timer { id: pollTimer; interval: Math.max(500, Plasmoid.configuration.pollInterval); running: true; repeat: true; triggeredOnStart: true; onTriggered: root.refresh() }
    Timer { interval: 1000; running: root.ticking || !!root.fTask || root.expanded; repeat: true; onTriggered: root.now = Date.now() }

    // ================================================================= peças
    // Ícone do Lida, desenhado na cor pedida.
    component LIcon: Item {
        id: li
        property string name: "check"
        property color color: root.cText
        property real size: 16
        property real stroke: 1.9
        implicitWidth: size
        implicitHeight: size
        Shape {
            width: 24; height: 24
            scale: li.size / 24
            transformOrigin: Item.TopLeft
            preferredRendererType: Shape.CurveRenderer
            ShapePath {
                strokeColor: li.color; strokeWidth: li.stroke; fillColor: "transparent"
                capStyle: ShapePath.RoundCap; joinStyle: ShapePath.RoundJoin
                PathSvg { path: (Icons.d[li.name] || {}).s || "" }
            }
            ShapePath {
                strokeColor: "transparent"; fillColor: li.color
                PathSvg { path: (Icons.d[li.name] || {}).f || "" }
            }
        }
    }

    // Anel de progresso (tarefas do dia, hábitos).
    component Ring: Canvas {
        id: ring
        property real value: 0
        property color color: root.cAccent
        property color track: root.tint(root.cText, 0.14)
        property real thick: 2.4
        onValueChanged: requestPaint()
        onColorChanged: requestPaint()
        onTrackChanged: requestPaint()
        onWidthChanged: requestPaint()
        onPaint: {
            var c = getContext("2d"); c.reset()
            var r = Math.min(width, height) / 2 - thick / 2
            c.lineWidth = thick; c.lineCap = "round"
            c.strokeStyle = track
            c.beginPath(); c.arc(width / 2, height / 2, r, 0, Math.PI * 2); c.stroke()
            var v = Math.max(0, Math.min(1, value))
            if (v <= 0) return
            c.strokeStyle = color
            c.beginPath(); c.arc(width / 2, height / 2, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (v >= 1 ? 0.9999 : v)); c.stroke()
        }
    }

    // Nome que rola continuamente (como letreiro) quando não cabe.
    component Ticker: Item {
        id: tk
        property string text: ""
        property color color: root.cText
        property int pixelSize: 13
        property bool bold: false
        property int maxWidth: 160
        readonly property real textW: probe.implicitWidth
        readonly property bool overflow: textW > maxWidth
        readonly property real gap: 28
        clip: true
        implicitWidth: Math.min(textW, maxWidth)
        implicitHeight: probe.implicitHeight
        Text { id: probe; visible: false; text: tk.text; font.pixelSize: tk.pixelSize; font.bold: tk.bold }
        Row {
            id: belt
            spacing: tk.gap
            anchors.verticalCenter: parent.verticalCenter
            Text { text: tk.text; color: tk.color; font.pixelSize: tk.pixelSize; font.bold: tk.bold }
            Text { visible: tk.overflow; text: tk.text; color: tk.color; font.pixelSize: tk.pixelSize; font.bold: tk.bold }
        }
        SequentialAnimation {
            running: tk.overflow && tk.visible
            loops: Animation.Infinite
            onRunningChanged: if (!running) belt.x = 0
            PauseAnimation { duration: 1600 }
            NumberAnimation { target: belt; property: "x"; from: 0; to: -(tk.textW + tk.gap); duration: (tk.textW + tk.gap) / 38 * 1000 }
        }
    }

    // Botão no estilo do app: primary (gradiente), ghost, danger.
    component Pill: Rectangle {
        id: pill
        property string icon: ""
        property string text: ""
        property string kind: "ghost"
        property bool small: false
        signal clicked()
        implicitHeight: small ? 26 : 30
        implicitWidth: row.implicitWidth + (small ? 18 : 24)
        radius: height / 2
        color: kind === "primary" ? "transparent" : (ma.containsMouse ? root.cSurface3 : root.cSurface2)
        border.width: kind === "primary" ? 0 : 1
        border.color: root.cLine
        gradient: kind === "primary" ? primaryGrad : null
        opacity: ma.pressed ? 0.8 : 1
        Gradient {
            id: primaryGrad
            orientation: Gradient.Horizontal
            GradientStop { position: 0; color: root.cG1 }
            GradientStop { position: 1; color: Qt.lighter(root.cG1, ma.containsMouse ? 1.12 : 1.0) }
        }
        Row {
            id: row
            anchors.centerIn: parent
            spacing: 6
            LIcon { visible: pill.icon !== ""; name: pill.icon; size: pill.small ? 13 : 15; anchors.verticalCenter: parent.verticalCenter; color: pill.kind === "primary" ? root.cOnAccent : (pill.kind === "danger" ? root.cNeg : root.cText) }
            Text { visible: pill.text !== ""; text: pill.text; anchors.verticalCenter: parent.verticalCenter; font.pixelSize: pill.small ? 12 : 13; font.weight: Font.DemiBold; color: pill.kind === "primary" ? root.cOnAccent : (pill.kind === "danger" ? root.cNeg : root.cText) }
        }
        MouseArea { id: ma; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: pill.clicked() }
    }

    // Botão redondo só com ícone.
    component IconBtn: Rectangle {
        id: ib
        property string icon: "x"
        property color iconColor: root.cMuted
        property string tip: ""
        property real size: 28
        signal clicked()
        implicitWidth: size; implicitHeight: size
        radius: size / 2
        color: ibm.containsMouse ? root.cSurface3 : "transparent"
        LIcon { anchors.centerIn: parent; name: ib.icon; size: ib.size * 0.55; color: ibm.containsMouse ? root.cText : ib.iconColor }
        MouseArea { id: ibm; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: ib.clicked() }
        QQC2.ToolTip.visible: ibm.containsMouse && ib.tip !== ""
        QQC2.ToolTip.text: ib.tip
        QQC2.ToolTip.delay: 600
    }

    // ================================================================= barra
    compactRepresentation: MouseArea {
        id: compact
        onClicked: root.expanded = !root.expanded
        hoverEnabled: true
        readonly property int fs: Math.max(11, Math.min(14, Math.round(height * 0.42)))
        readonly property real isz: Math.max(13, Math.min(17, Math.round(height * 0.5)))
        Layout.minimumWidth: bar.implicitWidth + 4
        Layout.preferredWidth: Layout.minimumWidth
        Layout.minimumHeight: Kirigami.Units.iconSizes.small
        property string flashText: ""

        Rectangle {
            id: pillBg
            anchors.fill: bar
            anchors.margins: -1
            radius: height / 2
            color: compact.containsMouse ? root.tint(root.cText, 0.12) : root.tint(root.cText, 0.06)
            border.width: 1
            border.color: root.fTask ? root.tint(root.cRec, 0.55) : root.tint(root.cText, 0.12)
            Behavior on color { ColorAnimation { duration: 120 } }
        }
        Rectangle { id: flash; anchors.fill: pillBg; radius: pillBg.radius; color: root.cPos; opacity: 0 }
        SequentialAnimation {
            id: flashAnim
            NumberAnimation { target: flash; property: "opacity"; to: 0.45; duration: 160 }
            PauseAnimation { duration: 900 }
            NumberAnimation { target: flash; property: "opacity"; to: 0; duration: 500 }
            ScriptAction { script: compact.flashText = "" }
        }
        Connections { target: root; function onCelebrate(text) { compact.flashText = text; flashAnim.restart() } }

        RowLayout {
            id: bar
            anchors.centerIn: parent
            height: Math.min(parent.height - 4, 28)
            spacing: 8

            Item { implicitWidth: 2 }

            // Concluída agora: um "✓ +1" rápido.
            Row {
                visible: compact.flashText !== ""
                spacing: 4
                LIcon { name: "check"; size: compact.isz; color: root.cPos; stroke: 2.4; anchors.verticalCenter: parent.verticalCenter }
                Text { text: compact.flashText; color: root.cText; font.pixelSize: compact.fs; font.bold: true; anchors.verticalCenter: parent.verticalCenter }
            }

            // App fechado
            Row {
                visible: compact.flashText === "" && !root.appOn
                spacing: 5
                LIcon { name: "check"; size: compact.isz; color: root.cDim; anchors.verticalCenter: parent.verticalCenter }
                Text { text: "Lida"; color: root.cDim; font.pixelSize: compact.fs; anchors.verticalCenter: parent.verticalCenter }
            }

            // Tarefa em foco: ponto vermelho, nome rolando e o tempo
            Row {
                visible: compact.flashText === "" && root.appOn && !!root.fTask
                spacing: 6
                Rectangle {
                    width: 7; height: 7; radius: 3.5; color: root.cRec
                    anchors.verticalCenter: parent.verticalCenter
                    SequentialAnimation on opacity {
                        running: !!root.fTask
                        loops: Animation.Infinite
                        NumberAnimation { from: 1; to: 0.25; duration: root.ticking ? 650 : 1100; easing.type: Easing.InOutSine }
                        NumberAnimation { from: 0.25; to: 1; duration: root.ticking ? 650 : 1100; easing.type: Easing.InOutSine }
                    }
                }
                Ticker {
                    anchors.verticalCenter: parent.verticalCenter
                    text: root.fTask ? root.fTask.title : ""
                    pixelSize: compact.fs
                    color: root.cText
                    maxWidth: Plasmoid.configuration.focusNameWidth
                }
                Text {
                    visible: Plasmoid.configuration.showTimer && root.timerText() !== ""
                    anchors.verticalCenter: parent.verticalCenter
                    text: root.timerText()
                    color: root.pomo.running && root.pomo.mode === "focus" ? root.cRec : (root.ticking ? root.cAccent : root.cMuted)
                    font.pixelSize: compact.fs
                    font.weight: Font.DemiBold
                    font.features: { "tnum": 1 }
                }
            }
            // Pomodoro sem tarefa em foco
            Row {
                visible: compact.flashText === "" && root.appOn && !root.fTask && root.pomoOn && Plasmoid.configuration.showTimer
                spacing: 4
                LIcon { name: "timer"; size: compact.isz; color: root.pomo.running ? root.cRec : root.cMuted; anchors.verticalCenter: parent.verticalCenter }
                Text { text: root.timerText(); color: root.pomo.running ? root.cText : root.cMuted; font.pixelSize: compact.fs; font.weight: Font.DemiBold; font.features: { "tnum": 1 }; anchors.verticalCenter: parent.verticalCenter }
            }
            Rectangle { visible: compact.flashText === "" && root.appOn && (!!root.fTask || root.pomoOn); implicitWidth: 1; implicitHeight: bar.height * 0.55; color: root.tint(root.cText, 0.18) }

            // Tarefas de hoje: anel de progresso + abertas; atrasadas em vermelho
            Row {
                visible: compact.flashText === "" && root.appOn
                spacing: 5
                Item {
                    width: compact.isz; height: compact.isz
                    anchors.verticalCenter: parent.verticalCenter
                    Ring { anchors.fill: parent; value: root.tasksTotal ? root.tasksDone / root.tasksTotal : 0; color: root.openToday === 0 && root.tasksTotal > 0 ? root.cPos : root.cAccent; thick: 2.2 }
                    LIcon { visible: root.openToday === 0 && root.tasksTotal > 0; anchors.centerIn: parent; name: "check"; size: compact.isz * 0.6; color: root.cPos; stroke: 2.6 }
                }
                Text { text: root.openToday > 0 ? root.openToday : root.tasksDone; color: root.cText; font.pixelSize: compact.fs; font.weight: Font.DemiBold; font.features: { "tnum": 1 }; anchors.verticalCenter: parent.verticalCenter }
            }
            Row {
                visible: compact.flashText === "" && root.appOn && root.overdue > 0
                spacing: 3
                LIcon { name: "alert"; size: compact.isz; color: root.cNeg; anchors.verticalCenter: parent.verticalCenter }
                Text { text: root.overdue; color: root.cNeg; font.pixelSize: compact.fs; font.weight: Font.DemiBold; anchors.verticalCenter: parent.verticalCenter }
            }
            // Hábitos do dia
            Row {
                visible: compact.flashText === "" && root.appOn && root.habitsTotal > 0
                spacing: 3
                LIcon { name: "habit"; size: compact.isz; color: root.habitsDone >= root.habitsTotal ? root.cPos : root.cWarn; anchors.verticalCenter: parent.verticalCenter }
                Text { text: root.habitsDone + "/" + root.habitsTotal; color: root.cText; font.pixelSize: compact.fs; font.weight: Font.DemiBold; font.features: { "tnum": 1 }; anchors.verticalCenter: parent.verticalCenter }
            }
            // Água que falta
            Row {
                visible: compact.flashText === "" && root.appOn
                spacing: 3
                LIcon { name: "water"; size: compact.isz; color: root.cWater; anchors.verticalCenter: parent.verticalCenter }
                Text { text: root.waterLeft > 0 ? root.ml(root.waterLeft).replace(" ", "") : "ok"; color: root.waterLeft > 0 ? root.cText : root.cWater; font.pixelSize: compact.fs; font.weight: Font.DemiBold; anchors.verticalCenter: parent.verticalCenter }
            }

            Item { implicitWidth: 2 }
        }
    }

    // ================================================================= ações rápidas
    fullRepresentation: Rectangle {
        id: full
        Layout.preferredWidth: Kirigami.Units.gridUnit * 22
        Layout.preferredHeight: Kirigami.Units.gridUnit * 29
        Layout.minimumWidth: Kirigami.Units.gridUnit * 18
        Layout.minimumHeight: Kirigami.Units.gridUnit * 16
        color: root.cBg
        radius: 12

        // App fechado
        ColumnLayout {
            anchors.centerIn: parent
            visible: !root.appOn
            spacing: 12
            Kirigami.Icon { Layout.alignment: Qt.AlignHCenter; source: "io.github.dasilvasauro.lida"; implicitWidth: 48; implicitHeight: 48 }
            Text { Layout.alignment: Qt.AlignHCenter; text: "O Lida está fechado"; color: root.cText; font.pixelSize: 15; font.bold: true }
            Text { Layout.alignment: Qt.AlignHCenter; text: "Abra para ver o foco e as tarefas de hoje."; color: root.cMuted; font.pixelSize: 12 }
            Pill { Layout.alignment: Qt.AlignHCenter; kind: "primary"; icon: "out"; text: "Abrir o Lida"; onClicked: root.startApp() }
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 12
            visible: root.appOn
            spacing: 10

            // Cabeçalho: logo, dia e progresso
            RowLayout {
                Layout.fillWidth: true
                spacing: 10
                Kirigami.Icon { source: "io.github.dasilvasauro.lida"; implicitWidth: 26; implicitHeight: 26 }
                ColumnLayout {
                    spacing: 0
                    Layout.fillWidth: true
                    Text { Layout.fillWidth: true; text: "Hoje"; color: root.cText; font.pixelSize: 15; font.bold: true }
                    Text { Layout.fillWidth: true; elide: Text.ElideRight; text: root.dateLabel() + (root.st.ipl !== null && root.st.ipl !== undefined ? "  ·  IPL " + root.st.ipl : ""); color: root.cMuted; font.pixelSize: 12 }
                }
                Item {
                    implicitWidth: 34; implicitHeight: 34
                    Ring { anchors.fill: parent; value: root.tasksTotal ? root.tasksDone / root.tasksTotal : 0; color: root.cAccent; thick: 3 }
                    Text { anchors.centerIn: parent; text: root.tasksDone + "/" + root.tasksTotal; color: root.cText; font.pixelSize: 10; font.bold: true; font.features: { "tnum": 1 } }
                }
                IconBtn { icon: "out"; tip: "Abrir o Lida"; onClicked: root.openApp("") }
            }

            // Adicionar em linguagem natural
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: 38
                radius: 10
                color: root.cSurface
                border.width: 1
                border.color: quick.activeFocus ? root.cAccent : root.cLine
                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 10
                    anchors.rightMargin: 6
                    spacing: 8
                    LIcon { name: "plus"; size: 16; color: root.cAccent; stroke: 2.2 }
                    QQC2.TextField {
                        id: quick
                        Layout.fillWidth: true
                        background: null
                        color: root.cText
                        placeholderText: "Nova tarefa: pagar a luz amanhã 10h p1 #casa"
                        placeholderTextColor: root.cDim
                        font.pixelSize: 13
                        leftPadding: 0
                        onAccepted: {
                            var t = text.trim()
                            if (!t) return
                            text = ""
                            root.lida("add " + root.shq(t), "Adicionando…")
                        }
                    }
                    IconBtn { visible: quick.text.length > 0; icon: "right"; iconColor: root.cAccent; size: 26; tip: "Adicionar"; onClicked: quick.accepted() }
                }
            }
            Text {
                Layout.fillWidth: true
                visible: root.lastError !== "" || root.busyMsg !== "" || quick.activeFocus
                text: root.lastError !== "" ? root.lastError : (root.busyMsg !== "" ? root.busyMsg : "Datas, horário, p0–p4, #etiqueta, @projeto e \"toda segunda\" são entendidos.")
                color: root.lastError !== "" ? root.cNeg : root.cDim
                wrapMode: Text.Wrap
                font.pixelSize: 11
            }

            // Em foco / Pomodoro
            Rectangle {
                Layout.fillWidth: true
                visible: !!root.fTask || root.pomoOn
                implicitHeight: fcol.implicitHeight + 24
                radius: 14
                border.width: 1
                border.color: root.fTask ? root.tint(root.cRec, 0.38) : root.cLine
                gradient: Gradient {
                    orientation: Gradient.Horizontal
                    GradientStop { position: 0; color: root.fTask ? Qt.tint(root.cSurface, root.tint(root.cRec, 0.14)) : root.cSurface }
                    GradientStop { position: 0.75; color: root.cSurface }
                }
                ColumnLayout {
                    id: fcol
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 6
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 6
                        Rectangle {
                            visible: !!root.fTask
                            implicitWidth: 7; implicitHeight: 7; radius: 3.5; color: root.cRec
                            SequentialAnimation on opacity { running: !!root.fTask; loops: Animation.Infinite; NumberAnimation { from: 1; to: 0.25; duration: 900 } NumberAnimation { from: 0.25; to: 1; duration: 900 } }
                        }
                        LIcon { visible: !root.fTask; name: "timer"; size: 14; color: root.cMuted }
                        Text { text: root.fTask ? "EM FOCO" : "POMODORO"; color: root.fTask ? root.cRec : root.cMuted; font.pixelSize: 11; font.bold: true; font.letterSpacing: 0.8; Layout.fillWidth: true }
                        Text { text: root.timerLabel(); color: root.cMuted; font.pixelSize: 11 }
                        Text { text: root.timerText(); color: root.pomo.running && root.pomo.mode === "focus" ? root.cRec : root.cText; font.pixelSize: 14; font.bold: true; font.features: { "tnum": 1 } }
                    }
                    Ticker {
                        Layout.fillWidth: true
                        Layout.preferredWidth: parent.width
                        visible: !!root.fTask
                        text: root.fTask ? root.fTask.title : ""
                        color: root.cText
                        pixelSize: 15
                        bold: true
                        maxWidth: Math.max(80, full.width - 48)
                    }
                    ColumnLayout {
                        Layout.fillWidth: true
                        visible: !!root.fTask && root.fSubs.length > 0
                        spacing: 3
                        RowLayout {
                            Layout.fillWidth: true
                            Text { Layout.fillWidth: true; text: root.fTask && root.fTask.kind === "routine" ? "ITENS DA ROTINA" : "SUBTAREFAS"; color: root.cMuted; font.pixelSize: 10; font.bold: true; font.letterSpacing: 0.6 }
                            Text { text: root.fSubsDone + "/" + root.fSubs.length; color: root.cText; font.pixelSize: 11; font.bold: true }
                        }
                        Rectangle {
                            Layout.fillWidth: true
                            implicitHeight: 3
                            radius: 1.5
                            color: root.cSurface3
                            Rectangle {
                                width: parent.width * (root.fSubs.length ? root.fSubsDone / root.fSubs.length : 0)
                                height: parent.height
                                radius: 1.5
                                color: root.cPos
                                Behavior on width { NumberAnimation { duration: 450; easing.type: Easing.OutCubic } }
                            }
                        }
                        Repeater {
                            model: root.fSubs
                            delegate: Rectangle {
                                required property var modelData
                                required property int index
                                Layout.fillWidth: true
                                implicitWidth: 100
                                implicitHeight: 24
                                radius: 6
                                color: subMa.containsMouse ? root.tint(root.cText, 0.05) : "transparent"
                                RowLayout {
                                    anchors.fill: parent
                                    anchors.leftMargin: 2
                                    anchors.rightMargin: 4
                                    spacing: 7
                                    Rectangle {
                                        implicitWidth: 14; implicitHeight: 14; radius: 4
                                        color: modelData.done ? root.cPos : "transparent"
                                        border.width: modelData.done ? 0 : 1.5
                                        border.color: root.cDim
                                        LIcon { anchors.centerIn: parent; visible: !!modelData.done; name: "check"; size: 10; color: root.cOnAccent }
                                    }
                                    Text {
                                        Layout.fillWidth: true
                                        text: modelData.title
                                        color: modelData.done ? root.cDim : root.cText
                                        font.pixelSize: 12
                                        font.strikeout: !!modelData.done
                                        elide: Text.ElideRight
                                    }
                                }
                                MouseArea {
                                    id: subMa
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: root.lida("sub foco " + (index + 1))
                                }
                            }
                        }
                    }
                    Rectangle {
                        Layout.fillWidth: true
                        visible: root.pomoOn && !root.tmr
                        implicitHeight: 4
                        radius: 2
                        color: root.cSurface3
                        Rectangle {
                            width: parent.width * root.pomoFraction()
                            height: parent.height
                            radius: 2
                            gradient: Gradient { orientation: Gradient.Horizontal; GradientStop { position: 0; color: root.cG1 } GradientStop { position: 1; color: root.cG2 } }
                        }
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        Layout.topMargin: 2
                        spacing: 6
                        Pill { visible: !!root.fTask; kind: "primary"; icon: "check"; text: "Concluir"; onClicked: root.lida("foco concluir", "Concluindo…") }
                        Pill { visible: !root.tmr; icon: root.pomo.running ? "pause" : "play"; text: root.pomo.running ? "Pausar" : (root.pomo.active ? "Continuar" : "Pomodoro"); onClicked: root.lida("pomo toggle") }
                        IconBtn { visible: !!root.pomo.active && !root.tmr; icon: "refresh"; tip: "Reiniciar o Pomodoro"; onClicked: root.lida("pomo reset") }
                        Item { Layout.fillWidth: true }
                        IconBtn { visible: !!root.fTask; icon: "x"; tip: "Parar foco"; onClicked: root.lida("foco parar") }
                    }
                }
            }
            // Nada em foco
            RowLayout {
                Layout.fillWidth: true
                visible: !root.fTask && !root.pomoOn
                spacing: 8
                LIcon { name: "target"; size: 16; color: root.cDim }
                Text { Layout.fillWidth: true; text: "Nada em foco. Passe o mouse numa tarefa e toque no alvo."; color: root.cMuted; font.pixelSize: 12; wrapMode: Text.Wrap }
                Pill { small: true; icon: "play"; text: "Pomodoro"; onClicked: root.lida("pomo start") }
            }

            // Abas (como o seletor do app)
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: 32
                radius: 10
                color: root.cSurface2
                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 3
                    spacing: 3
                    Repeater {
                        model: [
                            { n: "Hoje", i: "today", c: root.todayList.length },
                            { n: "Atrasadas", i: "alert", c: root.overdue },
                            { n: "Entrada", i: "inbox", c: root.st.inbox || 0 }
                        ]
                        delegate: Rectangle {
                            required property var modelData
                            required property int index
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            radius: 8
                            color: root.tab === index ? root.cSurface : (tm.containsMouse ? root.tint(root.cText, 0.05) : "transparent")
                            border.width: root.tab === index ? 1 : 0
                            border.color: root.cLine
                            Row {
                                anchors.centerIn: parent
                                spacing: 5
                                LIcon { name: modelData.i; size: 13; color: root.tab === index ? (index === 1 && modelData.c ? root.cNeg : root.cAccent) : root.cMuted; anchors.verticalCenter: parent.verticalCenter }
                                Text { text: modelData.n; color: root.tab === index ? root.cText : root.cMuted; font.pixelSize: 12; font.weight: Font.DemiBold; anchors.verticalCenter: parent.verticalCenter }
                                Text { visible: modelData.c > 0; text: modelData.c; color: root.cDim; font.pixelSize: 11; font.bold: true; anchors.verticalCenter: parent.verticalCenter }
                            }
                            MouseArea { id: tm; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.tab = index }
                        }
                    }
                }
            }

            // Tarefas
            ListView {
                id: list
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                spacing: 2
                model: root.listFor(root.tab)
                boundsBehavior: Flickable.StopAtBounds
                QQC2.ScrollBar.vertical: QQC2.ScrollBar { policy: QQC2.ScrollBar.AsNeeded }
                delegate: Rectangle {
                    id: del
                    required property var modelData
                    width: list.width
                    height: meta === "" ? 38 : 48
                    radius: 10
                    readonly property bool late: !!modelData.due && modelData.due < root.todayStr()
                    readonly property bool inFocus: !!root.fTask && root.fTask.id === modelData.id
                    readonly property color pc: root.prioColor(modelData.priority)
                    readonly property string meta: [
                        late ? "atrasada" : "",
                        modelData.time || "",
                        modelData.subtasks && modelData.subtasks.length ? modelData.subtasks.filter(function (s) { return s.done }).length + "/" + modelData.subtasks.length + " subtarefas" : "",
                        modelData.project || ""
                    ].filter(function (s) { return s }).join("  ·  ")
                    color: inFocus ? root.tint(root.cRec, 0.1) : (rowHover.hovered ? root.tint(root.cText, 0.05) : "transparent")
                    HoverHandler { id: rowHover }
                    Rectangle { visible: del.inFocus; width: 3; radius: 1.5; color: root.cRec; anchors { left: parent.left; top: parent.top; bottom: parent.bottom; topMargin: 8; bottomMargin: 8 } }
                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 8
                        anchors.rightMargin: 4
                        spacing: 10
                        // Círculo de concluir (cor da prioridade, como no app)
                        Rectangle {
                            implicitWidth: 20; implicitHeight: 20; radius: 10
                            border.width: 2
                            border.color: del.modelData.kind === "sprint" ? root.cAccent : del.pc
                            color: chk.containsMouse ? del.pc : root.tint(del.pc, 0.12)
                            LIcon { anchors.centerIn: parent; name: "check"; size: 13; stroke: 2.8; color: root.cOnAccent; opacity: chk.containsMouse ? 1 : 0 }
                            MouseArea { id: chk; anchors.fill: parent; anchors.margins: -4; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.lida("done " + root.shq(del.modelData.id), "Concluindo…") }
                            QQC2.ToolTip.visible: chk.containsMouse
                            QQC2.ToolTip.text: "Concluir"
                            QQC2.ToolTip.delay: 700
                        }
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 1
                            Text {
                                Layout.fillWidth: true
                                text: del.modelData.title
                                elide: Text.ElideRight
                                color: root.cText
                                font.pixelSize: 13
                                font.weight: del.modelData.priority === "P0" || del.modelData.priority === "P1" ? Font.Bold : Font.DemiBold
                            }
                            Text {
                                Layout.fillWidth: true
                                visible: del.meta !== ""
                                text: del.meta
                                elide: Text.ElideRight
                                color: del.late ? root.cNeg : root.cMuted
                                font.pixelSize: 11
                            }
                        }
                        IconBtn {
                            visible: rowHover.hovered || del.inFocus
                            icon: "target"
                            size: 26
                            iconColor: del.inFocus ? root.cRec : root.cMuted
                            tip: del.inFocus ? "Parar foco" : "Focar nesta tarefa"
                            onClicked: del.inFocus ? root.lida("foco parar") : root.lida("foco " + root.shq(del.modelData.id) + " --sem-tela")
                        }
                    }
                }
                Column {
                    anchors.centerIn: parent
                    visible: list.count === 0
                    spacing: 6
                    LIcon { anchors.horizontalCenter: parent.horizontalCenter; name: "sparkles"; size: 22; color: root.cDim }
                    Text { anchors.horizontalCenter: parent.horizontalCenter; text: root.tab === 1 ? "Nada atrasado." : (root.tab === 2 ? "Entrada vazia." : "Nada para hoje."); color: root.cMuted; font.pixelSize: 12 }
                }
            }

            // Hábitos do dia
            Rectangle { Layout.fillWidth: true; implicitHeight: 1; color: root.cLine; visible: root.habitList.length > 0 }
            Flow {
                Layout.fillWidth: true
                spacing: 6
                visible: root.habitList.length > 0
                Repeater {
                    model: root.habitList
                    delegate: Rectangle {
                        id: hchip
                        required property var modelData
                        readonly property real frac: Math.min(1, modelData.count / Math.max(1, modelData.goal))
                        height: 30
                        width: hrow.implicitWidth + 16
                        radius: 15
                        color: hm.containsMouse ? root.cSurface3 : root.cSurface2
                        border.width: 1
                        border.color: modelData.done ? root.tint(root.cPos, 0.5) : root.cLine
                        Row {
                            id: hrow
                            anchors.centerIn: parent
                            spacing: 6
                            Item {
                                width: 20; height: 20
                                anchors.verticalCenter: parent.verticalCenter
                                Ring { anchors.fill: parent; value: hchip.frac; color: root.cPos; thick: 2.2 }
                                Text { anchors.centerIn: parent; visible: !modelData.done; text: modelData.icon || (modelData.title || "?").charAt(0).toUpperCase(); font.pixelSize: 10; color: root.cText }
                                LIcon { anchors.centerIn: parent; visible: modelData.done; name: "check"; size: 12; stroke: 2.6; color: root.cPos }
                            }
                            Text { text: modelData.title + (modelData.goal > 1 ? "  " + modelData.count + "/" + modelData.goal : ""); color: modelData.done ? root.cMuted : root.cText; font.pixelSize: 12; font.weight: Font.DemiBold; anchors.verticalCenter: parent.verticalCenter }
                        }
                        MouseArea { id: hm; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.lida("habito " + root.shq(modelData.id)) }
                    }
                }
            }

            // Água
            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                LIcon { name: "water"; size: 18; color: root.cWater }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text { Layout.fillWidth: true; text: root.waterLeft > 0 ? "Faltam " + root.ml(root.waterLeft) + " de água" : "Meta de água batida"; color: root.cText; font.pixelSize: 12; font.weight: Font.DemiBold }
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 4
                        radius: 2
                        color: root.cSurface3
                        Rectangle { width: parent.width * Math.min(1, (root.water.ml || 0) / root.waterGoal); height: parent.height; radius: 2; color: root.cWater }
                    }
                }
                Pill { small: true; icon: "plus"; text: "Copo"; onClicked: root.lida("agua copo") }
                Pill { small: true; icon: "plus"; text: "Garrafa"; onClicked: root.lida("agua garrafa") }
            }
        }
    }
}
