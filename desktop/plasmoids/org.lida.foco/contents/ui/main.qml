/*
 * Lida · Foco (widget do Plasma 6)
 *
 * Uma "fachada" do app: lê o estado que o Lida grava em ~/.cache/lida/state.json (barato, só um
 * arquivo) e age pela CLI `lida`, que fala com o app. O foco é o mesmo do celular e do computador.
 *
 *   painel (parado):  ○ 5  ⚠ 2      tarefas de hoje abertas e atrasadas
 *   painel (foco):    ● Nome da tarefa  18:42   ponto vermelho piscando + cronômetro
 *   aberto:           cartão "Em foco", Pomodoro, adição rápida, tarefas de hoje e hábitos
 */

import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.plasma.plasmoid
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.components as PlasmaComponents
import org.kde.plasma.plasma5support as Plasma5Support
import org.kde.kirigami as Kirigami

PlasmoidItem {
    id: root

    // ---- estado (vem do app) ---------------------------------------------------
    property var st: ({})
    property bool running: !!st.running
    property var focus: st.focus || ({})
    property var task: focus.task || null
    property var pomo: focus.pomo || ({})
    property var timer: focus.timer || null
    property var tasks: st.today || []
    property var habits: st.habits || []
    property var glance: st.glance || ({ tasks: {}, habits: {}, water: {} })
    property double now: Date.now()
    property int lastDone: -1
    property string lastError: ""
    signal celebrate(string text)

    readonly property color cRec: "#e5484d"
    readonly property color cOpen: "#d9a441"
    readonly property color cLate: "#e06c75"
    readonly property color cDone: "#3dd6a3"
    readonly property color cPomo: "#ff7a59"

    Plasmoid.icon: "io.github.dasilvasauro.lida"
    toolTipMainText: task ? "Em foco: " + task.title : "Lida"
    toolTipSubText: timerText() !== "" ? timerLabel() + " " + timerText() : (glance.tasks.done || 0) + " de " + (glance.tasks.total || 0) + " tarefas hoje"

    // ---- utilidades --------------------------------------------------------------
    function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'" }
    function bin() { return shq(Plasmoid.configuration.binaryPath || "lida") }
    function pad(n) { return (n < 10 ? "0" : "") + n }
    function fmt(sec) {
        var neg = sec < 0; sec = Math.abs(Math.round(sec))
        var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60
        return (neg ? "-" : "") + (h ? h + ":" + pad(m) : pad(m)) + ":" + pad(s)
    }
    function todayStr() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) }
    function timerSeconds() {
        if (timer) return timer.running && timer.endsAt ? (timer.endsAt - now) / 1000 : timer.leftSec
        if (pomo.running) return (pomo.endsAt - now) / 1000
        if (pomo.active) return pomo.leftSec
        if (task && focus.since) return (now - focus.since) / 1000
        return null
    }
    function timerText() { var s = timerSeconds(); return s === null || s === undefined ? "" : fmt(s) }
    function timerLabel() {
        if (timer) return timer.running ? "Modo foco" : "Modo foco (pausado)"
        if (pomo.running) return pomo.mode === "focus" ? "Pomodoro · foco" : "Pomodoro · pausa"
        if (pomo.active) return "Pomodoro parado"
        if (task) return "Em foco há"
        return ""
    }
    readonly property bool ticking: !!(timer && timer.running) || !!pomo.running

    // ---- leitura do estado e comandos ----------------------------------------------
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
                var d = (s.glance && s.glance.tasks) ? s.glance.tasks.done : 0
                if (lastDone >= 0 && s.date === st.date && d > lastDone) root.celebrate("✔ +" + (d - lastDone))
                lastDone = d
                st = s
            } catch (e) { }
        })
    }
    function lida(args, after) {
        sh.run(bin() + " --json " + args, function (out, err, code) {
            lastError = ""
            try { var r = JSON.parse(out); if (r && r.error) lastError = r.error } catch (e) { if (code) lastError = err || "Erro ao falar com o Lida." }
            refresh()
            if (after) after(out)
        })
    }
    function openApp(route) { sh.run(bin() + " abrir " + (route ? shq(route) : ""), null) }
    function startApp() { sh.run("lida-desktop --background", function () { refreshTimer.restart() }) }

    Timer { id: refreshTimer; interval: Math.max(500, Plasmoid.configuration.pollInterval); running: true; repeat: true; triggeredOnStart: true; onTriggered: root.refresh() }
    Timer { interval: 1000; running: true; repeat: true; onTriggered: root.now = Date.now() }

    // =============================================================================
    // Painel
    // =============================================================================
    compactRepresentation: MouseArea {
        id: compact
        onClicked: root.expanded = !root.expanded
        readonly property color tc: Kirigami.Theme.textColor
        Layout.minimumWidth: row.implicitWidth + Kirigami.Units.largeSpacing
        Layout.preferredWidth: Layout.minimumWidth
        Layout.minimumHeight: Kirigami.Units.iconSizes.small
        HoverHandler { id: hover }
        property string flashText: ""

        Rectangle {
            id: bg
            anchors.fill: parent
            radius: Math.min(width, height) * 0.22
            color: Qt.rgba(compact.tc.r, compact.tc.g, compact.tc.b, hover.hovered ? 0.14 : 0.06)
            border.width: 1
            border.color: root.task ? Qt.rgba(0.9, 0.28, 0.3, 0.55) : Qt.rgba(compact.tc.r, compact.tc.g, compact.tc.b, 0.15)
            Behavior on color { ColorAnimation { duration: 140 } }
        }
        Rectangle {
            id: flash
            anchors.fill: parent
            radius: bg.radius
            color: root.cDone
            opacity: 0
        }
        SequentialAnimation {
            id: flashAnim
            NumberAnimation { target: flash; property: "opacity"; to: 0.55; duration: 160 }
            PauseAnimation { duration: 900 }
            NumberAnimation { target: flash; property: "opacity"; to: 0; duration: 500 }
            ScriptAction { script: compact.flashText = "" }
        }
        Connections {
            target: root
            function onCelebrate(text) { compact.flashText = text; flashAnim.restart() }
        }

        RowLayout {
            id: row
            anchors.centerIn: parent
            spacing: Kirigami.Units.smallSpacing

            Text { visible: compact.flashText !== ""; text: compact.flashText; color: compact.tc; font.bold: true; font.pixelSize: Kirigami.Theme.smallFont.pixelSize + 1 }

            // Em foco: ponto vermelho "gravando" + nome rolando + tempo.
            Rectangle {
                visible: compact.flashText === "" && !!root.task
                Layout.alignment: Qt.AlignVCenter
                width: Math.round(Kirigami.Units.iconSizes.small * 0.55); height: width; radius: width / 2
                color: root.cRec
                SequentialAnimation on opacity {
                    running: !!root.task
                    loops: Animation.Infinite
                    NumberAnimation { from: 1; to: 0.25; duration: root.ticking ? 700 : 1100; easing.type: Easing.InOutSine }
                    NumberAnimation { from: 0.25; to: 1; duration: root.ticking ? 700 : 1100; easing.type: Easing.InOutSine }
                }
            }
            Marquee {
                visible: compact.flashText === "" && !!root.task
                Layout.alignment: Qt.AlignVCenter
                Layout.preferredWidth: implicitWidth
                Layout.preferredHeight: compact.height
                text: root.task ? root.task.title : ""
                textColor: compact.tc
                pixelSize: Kirigami.Theme.smallFont.pixelSize + 1
                maxWidth: Plasmoid.configuration.focusNameWidth
            }
            Text {
                visible: compact.flashText === "" && !root.task && (root.pomo.running || root.pomo.active)
                text: "🍅"
                font.pixelSize: Kirigami.Theme.smallFont.pixelSize + 1
            }
            Text {
                visible: compact.flashText === "" && Plasmoid.configuration.showTimer && root.timerText() !== "" && (root.ticking || root.pomo.active || !!root.timer || !!root.task)
                text: root.timerText()
                color: root.pomo.running && root.pomo.mode === "focus" ? root.cPomo : compact.tc
                opacity: root.ticking ? 1 : 0.7
                font.pixelSize: Kirigami.Theme.smallFont.pixelSize + 1
                font.features: { "tnum": 1 }
            }
            // Sem foco: contagens do dia.
            Repeater {
                model: compact.flashText === "" && !root.task && !(root.pomo.running || root.pomo.active) ? root.badge() : []
                delegate: RowLayout {
                    spacing: 2
                    Text { text: modelData.g; color: modelData.c; font.pixelSize: Kirigami.Theme.smallFont.pixelSize + 2 }
                    Text { text: modelData.n; color: compact.tc; font.pixelSize: Kirigami.Theme.smallFont.pixelSize + 1 }
                }
            }
        }
    }
    function badge() {
        if (!running) return [{ g: "○", c: Kirigami.Theme.disabledTextColor, n: "–" }]
        var t = glance.tasks || {}
        var open = (t.total || 0) - (t.done || 0)
        var b = []
        if (open > 0) b.push({ g: "○", c: cOpen, n: open })
        if (t.overdue > 0) b.push({ g: "⚠︎", c: cLate, n: t.overdue })
        if (!b.length) b.push({ g: "✔", c: cDone, n: t.done || 0 })
        return b
    }

    // =============================================================================
    // Aberto
    // =============================================================================
    fullRepresentation: Item {
        Layout.preferredWidth: Kirigami.Units.gridUnit * 24
        Layout.preferredHeight: Kirigami.Units.gridUnit * 30
        Layout.minimumWidth: Kirigami.Units.gridUnit * 18
        Layout.minimumHeight: Kirigami.Units.gridUnit * 16

        // App fechado
        ColumnLayout {
            anchors.centerIn: parent
            visible: !root.running
            spacing: Kirigami.Units.largeSpacing
            PlasmaComponents.Label { Layout.alignment: Qt.AlignHCenter; text: "O Lida está fechado"; font.bold: true }
            PlasmaComponents.Label { Layout.alignment: Qt.AlignHCenter; text: "Abra para ver o foco e as tarefas de hoje."; opacity: 0.7 }
            PlasmaComponents.Button { Layout.alignment: Qt.AlignHCenter; text: "Abrir o Lida na bandeja"; icon.name: "io.github.dasilvasauro.lida"; onClicked: root.startApp() }
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: Kirigami.Units.smallSpacing
            visible: root.running
            spacing: Kirigami.Units.largeSpacing

            // Cabeçalho
            RowLayout {
                Layout.fillWidth: true
                Kirigami.Heading { level: 3; text: "Lida"; Layout.fillWidth: true }
                PlasmaComponents.Label {
                    text: (root.glance.tasks.done || 0) + "/" + (root.glance.tasks.total || 0) + " hoje" + (root.st.ipl !== null && root.st.ipl !== undefined ? "  ·  IPL " + root.st.ipl : "")
                    opacity: 0.7
                }
                PlasmaComponents.ToolButton { icon.name: "window-new"; onClicked: root.openApp(""); PlasmaComponents.ToolTip { text: "Abrir o Lida" } }
            }

            // Cartão "Em foco"
            Rectangle {
                Layout.fillWidth: true
                visible: !!root.task
                implicitHeight: focusCol.implicitHeight + Kirigami.Units.largeSpacing * 2
                radius: Kirigami.Units.cornerRadius
                color: Qt.rgba(0.9, 0.28, 0.3, 0.12)
                border.color: Qt.rgba(0.9, 0.28, 0.3, 0.45)
                ColumnLayout {
                    id: focusCol
                    anchors.fill: parent
                    anchors.margins: Kirigami.Units.largeSpacing
                    spacing: Kirigami.Units.smallSpacing
                    RowLayout {
                        Rectangle {
                            width: 8; height: 8; radius: 4; color: root.cRec
                            SequentialAnimation on opacity { running: !!root.task; loops: Animation.Infinite; NumberAnimation { from: 1; to: 0.25; duration: 900 } NumberAnimation { from: 0.25; to: 1; duration: 900 } }
                        }
                        PlasmaComponents.Label { text: "EM FOCO"; color: root.cRec; font.bold: true; font.pixelSize: Kirigami.Theme.smallFont.pixelSize; Layout.fillWidth: true }
                        PlasmaComponents.Label { text: root.timerLabel() + " " + root.timerText(); opacity: 0.8; font.features: { "tnum": 1 } }
                    }
                    PlasmaComponents.Label { Layout.fillWidth: true; text: root.task ? root.task.title : ""; wrapMode: Text.Wrap; font.bold: true; font.pixelSize: Kirigami.Theme.defaultFont.pixelSize * 1.15 }
                    RowLayout {
                        PlasmaComponents.Button { text: "Concluir"; icon.name: "checkmark"; onClicked: root.lida("foco concluir") }
                        PlasmaComponents.Button { text: root.pomo.running ? "Pausar" : (root.pomo.active ? "Continuar" : "Pomodoro"); icon.name: root.pomo.running ? "media-playback-pause" : "media-playback-start"; visible: !root.timer; onClicked: root.lida("pomo toggle") }
                        Item { Layout.fillWidth: true }
                        PlasmaComponents.ToolButton { icon.name: "process-stop"; onClicked: root.lida("foco parar"); PlasmaComponents.ToolTip { text: "Parar foco" } }
                    }
                }
            }

            // Pomodoro
            RowLayout {
                Layout.fillWidth: true
                visible: !root.timer
                spacing: Kirigami.Units.largeSpacing
                Text {
                    text: root.fmt(root.pomo.running ? (root.pomo.endsAt - root.now) / 1000 : (root.pomo.leftSec || (root.pomo.focusMin || 25) * 60))
                    color: root.pomo.running ? (root.pomo.mode === "focus" ? root.cPomo : root.cDone) : Kirigami.Theme.textColor
                    font.pixelSize: Kirigami.Theme.defaultFont.pixelSize * 2.2
                    font.bold: true
                    font.features: { "tnum": 1 }
                }
                ColumnLayout {
                    spacing: 0
                    Layout.fillWidth: true
                    PlasmaComponents.Label { text: "Pomodoro · " + (root.pomo.mode === "break" ? "pausa" : "foco"); font.bold: true }
                    PlasmaComponents.Label { text: root.pomo.running ? "rodando" : (root.pomo.active ? "parado" : (root.pomo.focusMin || 25) + " min de foco, " + (root.pomo.breakMin || 5) + " de pausa"); opacity: 0.7; font.pixelSize: Kirigami.Theme.smallFont.pixelSize }
                }
                PlasmaComponents.ToolButton { icon.name: root.pomo.running ? "media-playback-pause" : "media-playback-start"; onClicked: root.lida("pomo toggle"); PlasmaComponents.ToolTip { text: root.pomo.running ? "Pausar" : "Iniciar" } }
                PlasmaComponents.ToolButton { icon.name: "view-refresh"; onClicked: root.lida("pomo reset"); PlasmaComponents.ToolTip { text: "Reiniciar" } }
                PlasmaComponents.ToolButton { icon.name: "media-skip-forward"; onClicked: root.lida("pomo skip"); PlasmaComponents.ToolTip { text: "Pular" } }
            }

            // Adição rápida (linguagem natural)
            PlasmaComponents.TextField {
                id: quick
                Layout.fillWidth: true
                placeholderText: "Nova tarefa: pagar a luz amanhã 10h p1 #casa"
                onAccepted: {
                    var t = text.trim()
                    if (!t) return
                    text = ""
                    root.lida("add " + root.shq(t))
                }
            }
            PlasmaComponents.Label { visible: root.lastError !== ""; text: root.lastError; color: root.cLate; wrapMode: Text.Wrap; Layout.fillWidth: true }

            // Tarefas de hoje
            PlasmaComponents.ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                ListView {
                    id: list
                    model: root.tasks
                    spacing: 2
                    clip: true
                    delegate: Rectangle {
                        id: del
                        required property var modelData
                        width: list.width
                        height: Kirigami.Units.gridUnit * 2
                        radius: Kirigami.Units.cornerRadius
                        color: hov.hovered ? Qt.rgba(Kirigami.Theme.textColor.r, Kirigami.Theme.textColor.g, Kirigami.Theme.textColor.b, 0.07) : "transparent"
                        HoverHandler { id: hov }
                        readonly property bool late: !!modelData.due && modelData.due < root.todayStr()
                        readonly property bool inFocus: !!root.task && root.task.id === modelData.id
                        readonly property string glyph: late ? "⚠\ufe0e" : (modelData.kind === "sprint" ? "◆" : "○")
                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: Kirigami.Units.smallSpacing
                            anchors.rightMargin: Kirigami.Units.smallSpacing
                            PlasmaComponents.ToolButton {
                                text: del.glyph
                                onClicked: root.lida("done " + root.shq(modelData.id))
                                PlasmaComponents.ToolTip { text: "Concluir" }
                                contentItem: Text { text: del.glyph; color: del.late ? root.cLate : root.cOpen; font.pixelSize: Kirigami.Theme.defaultFont.pixelSize * 1.2; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                            }
                            PlasmaComponents.Label {
                                Layout.fillWidth: true
                                text: modelData.title + (modelData.time ? "  · " + modelData.time : "") + (modelData.subtasks && modelData.subtasks.length ? "  [" + modelData.subtasks.filter(function (s) { return s.done }).length + "/" + modelData.subtasks.length + "]" : "")
                                elide: Text.ElideRight
                                font.bold: modelData.priority === "P0" || modelData.priority === "P1"
                            }
                            PlasmaComponents.Label { visible: modelData.priority && modelData.priority !== "P4"; text: modelData.priority; opacity: 0.6; font.pixelSize: Kirigami.Theme.smallFont.pixelSize }
                            PlasmaComponents.ToolButton {
                                icon.name: del.inFocus ? "media-record" : "crosshairs"
                                onClicked: del.inFocus ? root.lida("foco parar") : root.lida("foco " + root.shq(modelData.id) + " --sem-tela")
                                PlasmaComponents.ToolTip { text: del.inFocus ? "Parar foco" : "Focar nesta tarefa" }
                            }
                        }
                    }
                    PlasmaComponents.Label { anchors.centerIn: parent; visible: list.count === 0; text: "Nada para hoje. Aproveite!"; opacity: 0.6 }
                }
            }

            // Hábitos de hoje
            Flow {
                Layout.fillWidth: true
                spacing: Kirigami.Units.smallSpacing
                visible: root.habits.length > 0
                Repeater {
                    model: root.habits
                    delegate: PlasmaComponents.Button {
                        required property var modelData
                        text: (modelData.icon ? modelData.icon + " " : "") + modelData.title + (modelData.goal > 1 ? " " + modelData.count + "/" + modelData.goal : "") + (modelData.done ? " ✔" : "")
                        checkable: false
                        flat: !modelData.done
                        onClicked: root.lida("habito " + root.shq(modelData.id))
                    }
                }
            }
        }
    }
}
