/*
 * Lida · Foco — widget de barra (Plasma 6), na linha do gtasks++.
 *
 * No painel, compacto:   ● Nome da tarefa 18:42  │  ○ 5 ⚠ 2  │  ◎ 1/3  │ 💧 1,2 L
 *   - tarefa em foco (ponto vermelho piscando, nome rolando, cronômetro), se houver;
 *   - tarefas de hoje abertas (○) e atrasadas (⚠);
 *   - hábitos do dia feitos/total (◎);
 *   - quanto falta de água para a meta (gota).
 * Clique: ações rápidas — adicionar em linguagem natural, foco, Pomodoro, concluir/focar
 * tarefas (Hoje, Atrasadas, Entrada), hábitos e água.
 *
 * Lê o estado que o app grava em ~/.cache/lida/state.json e age pela CLI `lida`.
 */

import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PlasmaComponents
import org.kde.plasma.plasma5support as Plasma5Support
import org.kde.kirigami as Kirigami

PlasmoidItem {
    id: root

    // ---- estado (vem do app). Nomes sem colidir com propriedades do Item (focus, state...). ----
    property var st: ({})
    readonly property bool appOn: !!st.running
    readonly property var fz: st.focus || ({})
    readonly property var fTask: fz.task || null
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
    property int tab: 0          // 0 Hoje · 1 Atrasadas · 2 Entrada
    signal celebrate(string text)

    readonly property color cRec: "#e5484d"
    readonly property color cOpen: "#d9a441"
    readonly property color cLate: "#e06c75"
    readonly property color cDone: "#8dc07c"
    readonly property color cHabit: "#3dd6a3"
    readonly property color cWater: "#5aa9ff"
    readonly property color cPomo: "#ff7a59"

    readonly property int openToday: Math.max(0, (gl.tasks.total || 0) - (gl.tasks.done || 0))
    readonly property int overdue: gl.tasks.overdue || 0
    readonly property int waterLeft: Math.max(0, (water.goal || 2000) - (water.ml || 0))
    readonly property bool ticking: !!(tmr && tmr.running) || !!pomo.running

    Plasmoid.icon: "io.github.dasilvasauro.lida"
    switchWidth: Kirigami.Units.gridUnit * 12
    switchHeight: Kirigami.Units.gridUnit * 12
    toolTipMainText: fTask ? "Em foco: " + fTask.title : "Lida"
    toolTipSubText: !appOn ? "O Lida está fechado" : (gl.tasks.done || 0) + " de " + (gl.tasks.total || 0) + " tarefas · hábitos " + (gl.habits.done || 0) + "/" + (gl.habits.total || 0) + " · água: " + (waterLeft > 0 ? "faltam " + ml(waterLeft) : "meta batida") + (timerText() !== "" ? "\n" + timerLabel() + " " + timerText() : "")

    // ---- utilidades ------------------------------------------------------------------
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
    function timerSeconds() {
        if (tmr) return tmr.running && tmr.endsAt ? (tmr.endsAt - now) / 1000 : tmr.leftSec
        if (pomo.running) return (pomo.endsAt - now) / 1000
        if (pomo.active) return pomo.leftSec
        if (fTask && fz.since) return (now - fz.since) / 1000
        return null
    }
    function timerText() { var s = timerSeconds(); return (s === null || s === undefined) ? "" : fmt(s) }
    function timerLabel() {
        if (tmr) return tmr.running ? "Modo foco" : "Modo foco (pausado)"
        if (pomo.running) return pomo.mode === "focus" ? "Pomodoro" : "Pausa"
        if (pomo.active) return "Pomodoro parado"
        if (fTask) return "Em foco há"
        return ""
    }
    function listFor(t) {
        var d = todayStr()
        if (t === 1) return todayList.filter(function (x) { return x.due && x.due < d })
        if (t === 2) return inboxList
        return todayList
    }

    // ---- leitura do estado e comandos ---------------------------------------------------
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
                if (lastDone >= 0 && s.date === st.date && d > lastDone) root.celebrate("✔ +" + (d - lastDone))
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

    // Gota d'água desenhada (não depende de emoji na fonte do painel).
    component Drop: Canvas {
        property color tint: root.cWater
        property real fill: 1
        implicitWidth: Math.round(Kirigami.Units.iconSizes.small * 0.62)
        implicitHeight: Math.round(Kirigami.Units.iconSizes.small * 0.8)
        onFillChanged: requestPaint()
        onTintChanged: requestPaint()
        onPaint: {
            var c = getContext("2d"); c.reset()
            var w = width, h = height
            c.beginPath()
            c.moveTo(w / 2, 0)
            c.bezierCurveTo(w * 0.15, h * 0.42, 0, h * 0.55, 0, h * 0.68)
            c.arc(w / 2, h * 0.68, w / 2, Math.PI, 0, true)
            c.bezierCurveTo(w, h * 0.55, w * 0.85, h * 0.42, w / 2, 0)
            c.closePath()
            c.lineWidth = 1.2
            c.strokeStyle = tint
            c.stroke()
            c.save(); c.clip()
            c.fillStyle = tint
            c.fillRect(0, h * (1 - Math.max(0, Math.min(1, fill))), w, h)
            c.restore()
        }
    }

    // =========================================================================
    // Painel (Application Bar)
    // =========================================================================
    compactRepresentation: MouseArea {
        id: compact
        onClicked: root.expanded = !root.expanded
        readonly property color tc: Kirigami.Theme.textColor
        readonly property int fs: Kirigami.Theme.smallFont.pixelSize + 1
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
            border.color: root.fTask ? Qt.rgba(0.9, 0.28, 0.3, 0.5) : Qt.rgba(compact.tc.r, compact.tc.g, compact.tc.b, 0.15)
            Behavior on color { ColorAnimation { duration: 120 } }
        }
        Rectangle { id: flash; anchors.fill: parent; radius: bg.radius; color: root.cDone; opacity: 0 }
        SequentialAnimation {
            id: flashAnim
            NumberAnimation { target: flash; property: "opacity"; to: 0.5; duration: 160 }
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

            Text { visible: compact.flashText !== ""; text: compact.flashText; color: compact.tc; font.bold: true; font.pixelSize: compact.fs }

            // App fechado: um traço discreto.
            Text { visible: compact.flashText === "" && !root.appOn; text: "○ –"; color: Kirigami.Theme.disabledTextColor; font.pixelSize: compact.fs }

            // Tarefa em foco
            Rectangle {
                visible: compact.flashText === "" && root.appOn && !!root.fTask
                Layout.alignment: Qt.AlignVCenter
                width: Math.round(Kirigami.Units.iconSizes.small * 0.5); height: width; radius: width / 2
                color: root.cRec
                SequentialAnimation on opacity {
                    running: !!root.fTask
                    loops: Animation.Infinite
                    NumberAnimation { from: 1; to: 0.25; duration: root.ticking ? 700 : 1100; easing.type: Easing.InOutSine }
                    NumberAnimation { from: 0.25; to: 1; duration: root.ticking ? 700 : 1100; easing.type: Easing.InOutSine }
                }
            }
            Marquee {
                visible: compact.flashText === "" && root.appOn && !!root.fTask
                Layout.alignment: Qt.AlignVCenter
                Layout.preferredWidth: implicitWidth
                Layout.preferredHeight: compact.height
                text: root.fTask ? root.fTask.title : ""
                textColor: compact.tc
                pixelSize: compact.fs
                maxWidth: Plasmoid.configuration.focusNameWidth
            }
            Text {
                visible: compact.flashText === "" && root.appOn && Plasmoid.configuration.showTimer && root.timerText() !== "" && (root.ticking || !!root.fTask || !!root.pomo.active)
                text: (!root.fTask && (root.pomo.running || root.pomo.active) ? "◷ " : "") + root.timerText()
                color: root.pomo.running && root.pomo.mode === "focus" ? root.cPomo : compact.tc
                opacity: root.ticking ? 1 : 0.65
                font.pixelSize: compact.fs
                font.features: { "tnum": 1 }
            }
            Rectangle {   // separador fino
                visible: compact.flashText === "" && root.appOn && (!!root.fTask || root.ticking || !!root.pomo.active)
                Layout.preferredWidth: 1; Layout.preferredHeight: compact.height * 0.5
                color: Qt.rgba(compact.tc.r, compact.tc.g, compact.tc.b, 0.25)
            }

            // Tarefas: abertas hoje / atrasadas (ou ✔ quando acabou)
            Text {
                visible: compact.flashText === "" && root.appOn && root.openToday > 0
                text: "○ " + root.openToday
                color: root.cOpen
                font.pixelSize: compact.fs
                font.features: { "tnum": 1 }
            }
            Text {
                visible: compact.flashText === "" && root.appOn && root.overdue > 0
                text: "⚠︎ " + root.overdue
                color: root.cLate
                font.pixelSize: compact.fs
            }
            Text {
                visible: compact.flashText === "" && root.appOn && root.openToday === 0 && root.overdue === 0
                text: "✔ " + (root.gl.tasks.done || 0)
                color: root.cDone
                font.pixelSize: compact.fs
            }
            // Hábitos do dia
            Text {
                visible: compact.flashText === "" && root.appOn && (root.gl.habits.total || 0) > 0
                text: "◎ " + (root.gl.habits.done || 0) + "/" + root.gl.habits.total
                color: (root.gl.habits.done || 0) >= root.gl.habits.total ? root.cHabit : compact.tc
                opacity: (root.gl.habits.done || 0) >= root.gl.habits.total ? 1 : 0.85
                font.pixelSize: compact.fs
                font.features: { "tnum": 1 }
            }
            // Água: quanto falta
            Drop {
                visible: compact.flashText === "" && root.appOn
                Layout.alignment: Qt.AlignVCenter
                fill: Math.min(1, (root.water.ml || 0) / (root.water.goal || 2000))
            }
            Text {
                visible: compact.flashText === "" && root.appOn
                text: root.waterLeft > 0 ? root.ml(root.waterLeft).replace(" ", "") : "✔"
                color: root.waterLeft > 0 ? compact.tc : root.cWater
                opacity: root.waterLeft > 0 ? 0.85 : 1
                font.pixelSize: compact.fs
            }
        }
    }

    // =========================================================================
    // Ações rápidas (ao clicar)
    // =========================================================================
    fullRepresentation: Item {
        Layout.preferredWidth: Kirigami.Units.gridUnit * 21
        Layout.preferredHeight: Kirigami.Units.gridUnit * 26
        Layout.minimumWidth: Kirigami.Units.gridUnit * 17
        Layout.minimumHeight: Kirigami.Units.gridUnit * 14

        ColumnLayout {
            anchors.centerIn: parent
            visible: !root.appOn
            spacing: Kirigami.Units.largeSpacing
            PlasmaComponents.Label { Layout.alignment: Qt.AlignHCenter; text: "O Lida está fechado"; font.bold: true }
            PlasmaComponents.Button { Layout.alignment: Qt.AlignHCenter; text: "Abrir na bandeja"; icon.name: "io.github.dasilvasauro.lida"; onClicked: root.startApp() }
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: Kirigami.Units.smallSpacing
            visible: root.appOn
            spacing: Kirigami.Units.smallSpacing

            // Adição rápida em linguagem natural
            PlasmaComponents.TextField {
                id: quick
                Layout.fillWidth: true
                placeholderText: "Nova tarefa: pagar a luz amanhã 10h p1 #casa"
                onAccepted: {
                    var t = text.trim()
                    if (!t) return
                    text = ""
                    root.lida("add " + root.shq(t), "Adicionando…")
                }
            }
            PlasmaComponents.Label {
                Layout.fillWidth: true
                visible: root.lastError !== "" || root.busyMsg !== ""
                text: root.lastError !== "" ? root.lastError : root.busyMsg
                color: root.lastError !== "" ? root.cLate : Kirigami.Theme.disabledTextColor
                wrapMode: Text.Wrap
                font.pixelSize: Kirigami.Theme.smallFont.pixelSize
            }

            // Em foco (ou Pomodoro, sem foco)
            Rectangle {
                Layout.fillWidth: true
                visible: !!root.fTask || !!root.pomo.running || !!root.pomo.active
                implicitHeight: fcol.implicitHeight + Kirigami.Units.smallSpacing * 2
                radius: Kirigami.Units.cornerRadius
                color: root.fTask ? Qt.rgba(0.9, 0.28, 0.3, 0.1) : Qt.rgba(Kirigami.Theme.textColor.r, Kirigami.Theme.textColor.g, Kirigami.Theme.textColor.b, 0.05)
                border.color: root.fTask ? Qt.rgba(0.9, 0.28, 0.3, 0.4) : "transparent"
                ColumnLayout {
                    id: fcol
                    anchors.fill: parent
                    anchors.margins: Kirigami.Units.smallSpacing
                    spacing: 2
                    RowLayout {
                        Layout.fillWidth: true
                        Rectangle { visible: !!root.fTask; width: 7; height: 7; radius: 3.5; color: root.cRec }
                        PlasmaComponents.Label {
                            Layout.fillWidth: true
                            text: root.fTask ? root.fTask.title : "Pomodoro"
                            font.bold: true
                            elide: Text.ElideRight
                        }
                        PlasmaComponents.Label { text: root.timerText(); font.features: { "tnum": 1 }; color: root.pomo.running && root.pomo.mode === "focus" ? root.cPomo : Kirigami.Theme.textColor }
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 0
                        PlasmaComponents.ToolButton { visible: !!root.fTask; icon.name: "checkmark"; text: "Concluir"; display: QQC2.AbstractButton.TextBesideIcon; onClicked: root.lida("foco concluir", "Concluindo…") }
                        PlasmaComponents.ToolButton { visible: !root.tmr; icon.name: root.pomo.running ? "media-playback-pause" : "media-playback-start"; text: root.pomo.running ? "Pausar" : (root.pomo.active ? "Continuar" : "Pomodoro"); display: QQC2.AbstractButton.TextBesideIcon; onClicked: root.lida("pomo toggle") }
                        PlasmaComponents.ToolButton { visible: !!root.pomo.active && !root.tmr; icon.name: "view-refresh"; onClicked: root.lida("pomo reset"); PlasmaComponents.ToolTip { text: "Reiniciar o Pomodoro" } }
                        Item { Layout.fillWidth: true }
                        PlasmaComponents.ToolButton { visible: !!root.fTask; icon.name: "process-stop"; onClicked: root.lida("foco parar"); PlasmaComponents.ToolTip { text: "Parar foco" } }
                    }
                }
            }

            // Abas: Hoje · Atrasadas · Entrada (como o chip de filtro do gtasks++)
            RowLayout {
                Layout.fillWidth: true
                spacing: 0
                Repeater {
                    model: [
                        { n: "Hoje", c: root.todayList.length },
                        { n: "Atrasadas", c: root.overdue },
                        { n: "Entrada", c: root.st.inbox || 0 }
                    ]
                    delegate: PlasmaComponents.TabButton {
                        required property var modelData
                        required property int index
                        Layout.fillWidth: true
                        text: modelData.n + (modelData.c ? " " + modelData.c : "")
                        checked: root.tab === index
                        onClicked: root.tab = index
                    }
                }
            }

            // Tarefas
            PlasmaComponents.ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                ListView {
                    id: list
                    model: root.listFor(root.tab)
                    clip: true
                    spacing: 0
                    delegate: Item {
                        id: del
                        required property var modelData
                        width: list.width
                        height: Kirigami.Units.gridUnit * 1.7
                        readonly property bool late: !!modelData.due && modelData.due < root.todayStr()
                        readonly property bool inFocus: !!root.fTask && root.fTask.id === modelData.id
                        readonly property string glyph: modelData.kind === "sprint" ? "◆" : (late ? "⚠︎" : "○")
                        HoverHandler { id: hov }
                        Rectangle {
                            anchors.fill: parent
                            radius: Kirigami.Units.cornerRadius
                            color: del.inFocus ? Qt.rgba(0.9, 0.28, 0.3, 0.1) : (hov.hovered ? Qt.rgba(Kirigami.Theme.textColor.r, Kirigami.Theme.textColor.g, Kirigami.Theme.textColor.b, 0.07) : "transparent")
                        }
                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 2
                            anchors.rightMargin: 2
                            spacing: Kirigami.Units.smallSpacing
                            MouseArea {
                                Layout.preferredWidth: Kirigami.Units.gridUnit * 1.4
                                Layout.fillHeight: true
                                cursorShape: Qt.PointingHandCursor
                                hoverEnabled: true
                                onClicked: root.lida("done " + root.shq(del.modelData.id), "Concluindo…")
                                Text {
                                    anchors.centerIn: parent
                                    text: parent.containsMouse ? "✔" : del.glyph
                                    color: parent.containsMouse ? root.cDone : (del.late ? root.cLate : root.cOpen)
                                    font.pixelSize: Kirigami.Theme.defaultFont.pixelSize * 1.1
                                }
                                PlasmaComponents.ToolTip { text: "Concluir" }
                            }
                            PlasmaComponents.Label {
                                Layout.fillWidth: true
                                text: del.modelData.title
                                elide: Text.ElideRight
                                font.bold: del.modelData.priority === "P0" || del.modelData.priority === "P1"
                            }
                            PlasmaComponents.Label {
                                text: [del.modelData.time || "", del.modelData.subtasks && del.modelData.subtasks.length ? del.modelData.subtasks.filter(function (s) { return s.done }).length + "/" + del.modelData.subtasks.length : ""].filter(function (s) { return s }).join(" · ")
                                visible: text !== ""
                                opacity: 0.6
                                font.pixelSize: Kirigami.Theme.smallFont.pixelSize
                            }
                            PlasmaComponents.ToolButton {
                                visible: hov.hovered || del.inFocus
                                implicitWidth: Kirigami.Units.gridUnit * 1.4
                                icon.name: del.inFocus ? "media-record" : "crosshairs"
                                onClicked: del.inFocus ? root.lida("foco parar") : root.lida("foco " + root.shq(del.modelData.id) + " --sem-tela")
                                PlasmaComponents.ToolTip { text: del.inFocus ? "Parar foco" : "Focar" }
                            }
                        }
                    }
                    PlasmaComponents.Label {
                        anchors.centerIn: parent
                        visible: list.count === 0
                        text: root.tab === 1 ? "Nada atrasado." : (root.tab === 2 ? "Entrada vazia." : "Nada para hoje.")
                        opacity: 0.6
                    }
                }
            }

            // Hábitos do dia: toque soma um
            Flow {
                Layout.fillWidth: true
                spacing: 4
                visible: root.habitList.length > 0
                Repeater {
                    model: root.habitList
                    delegate: PlasmaComponents.Button {
                        required property var modelData
                        flat: !modelData.done
                        text: (modelData.icon ? modelData.icon + " " : "") + modelData.title + (modelData.goal > 1 ? " " + modelData.count + "/" + modelData.goal : "") + (modelData.done ? " ✔" : "")
                        onClicked: root.lida("habito " + root.shq(modelData.id))
                        PlasmaComponents.ToolTip { text: modelData.done ? "Feito hoje (toque para somar mais)" : "Marcar" }
                    }
                }
            }

            // Água
            RowLayout {
                Layout.fillWidth: true
                spacing: Kirigami.Units.smallSpacing
                Drop { fill: Math.min(1, (root.water.ml || 0) / (root.water.goal || 2000)) }
                PlasmaComponents.Label {
                    Layout.fillWidth: true
                    text: root.waterLeft > 0 ? "Faltam " + root.ml(root.waterLeft) : "Meta de água batida"
                    font.pixelSize: Kirigami.Theme.smallFont.pixelSize + 1
                }
                PlasmaComponents.ToolButton { text: "Copo"; onClicked: root.lida("agua copo"); PlasmaComponents.ToolTip { text: "+" + root.ml(root.water.glass || 250) } }
                PlasmaComponents.ToolButton { text: "Garrafa"; onClicked: root.lida("agua garrafa"); PlasmaComponents.ToolTip { text: "+" + root.ml(root.water.bottle || 500) } }
                PlasmaComponents.ToolButton { icon.name: "window-new"; onClicked: root.openApp(""); PlasmaComponents.ToolTip { text: "Abrir o Lida" } }
            }
        }
    }
}
