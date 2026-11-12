/*
 * Lida · Anéis (widget do Plasma 6)
 *
 * Três anéis do dia, os mesmos do app e do widget do Android: tarefas (fora), hábitos (meio) e
 * água (dentro). Lê ~/.cache/lida/state.json (gravado pelo app) e registra água pela CLI `lida`.
 */

import QtQuick
import QtQuick.Layouts
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PlasmaComponents
import org.kde.plasma.plasma5support as Plasma5Support
import org.kde.kirigami as Kirigami

PlasmoidItem {
    id: root

    property var st: ({})
    property bool running: !!st.running
    property var g: st.glance || ({ tasks: {}, habits: {}, water: {} })
    readonly property real fTasks: g.tasks && g.tasks.total ? g.tasks.done / g.tasks.total : 0
    readonly property real fHabits: g.habits && g.habits.total ? g.habits.done / g.habits.total : 0
    readonly property real fWater: g.water && g.water.goal ? g.water.ml / g.water.goal : 0

    readonly property color cTasks: "#7c8cff"
    readonly property color cHabits: "#3dd6a3"
    readonly property color cWater: "#5aa9ff"

    Plasmoid.icon: "io.github.dasilvasauro.lida"
    toolTipMainText: root.tx("Lida · Anéis")
    toolTipSubText: root.tx("Tarefas") + " " + (g.tasks.done || 0) + "/" + (g.tasks.total || 0) + " · " + root.tx("Hábitos") + " " + (g.habits.done || 0) + "/" + (g.habits.total || 0) + " · " + root.tx("Água") + " " + ml(g.water.ml || 0)

    // Textos no idioma do app: o estado traz a tradução de cada texto em português (st.txt)
    function tx(s) {
        var out = (st && st.txt && st.txt[s]) || s
        for (var i = 1; i < arguments.length; i++) out = out.split("{" + (i - 1) + "}").join(arguments[i])
        return out
    }
    function ml(v) { return v >= 1000 ? (v / 1000).toFixed(2).replace(/\.?0+$/, "").replace(".", String(st.locale || "pt-BR").indexOf("en") === 0 ? "." : ",") + " L" : v + " ml" }
    function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'" }
    function bin() { return shq(Plasmoid.configuration.binaryPath || "lida") }

    Plasma5Support.DataSource {
        id: sh
        engine: "executable"
        connectedSources: []
        property var callbacks: ({})
        onNewData: function (source, data) {
            var cb = callbacks[source]
            if (cb) { delete callbacks[source]; cb(data["stdout"] || "") }
            disconnectSource(source)
        }
        function run(cmd, cb) {
            var full = cmd + " # " + Math.random().toString(36).slice(2)
            if (cb) callbacks[full] = cb
            connectSource(full)
        }
    }
    function refresh() {
        sh.run("cat \"${XDG_CACHE_HOME:-$HOME/.cache}/lida/state.json\" 2>/dev/null", function (out) {
            if (!out) { st = ({ running: false }); return }
            try { st = JSON.parse(out) } catch (e) { }
        })
    }
    function lida(args) { sh.run(bin() + " --json " + args, function () { refresh() }) }
    Timer { interval: Math.max(1000, Plasmoid.configuration.pollInterval); running: true; repeat: true; triggeredOnStart: true; onTriggered: root.refresh() }

    // Desenho dos anéis (Canvas): trilho + arco de cada anel, com ponta arredondada.
    component Rings: Canvas {
        id: cv
        property real t: root.fTasks
        property real h: root.fHabits
        property real w: root.fWater
        property real thick: Math.max(2, Math.min(width, height) * 0.085)
        property color track: Qt.rgba(Kirigami.Theme.textColor.r, Kirigami.Theme.textColor.g, Kirigami.Theme.textColor.b, 0.12)
        onTChanged: requestPaint()
        onHChanged: requestPaint()
        onWChanged: requestPaint()
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
        Behavior on t { NumberAnimation { duration: 600; easing.type: Easing.OutBack } }
        Behavior on h { NumberAnimation { duration: 600; easing.type: Easing.OutBack } }
        Behavior on w { NumberAnimation { duration: 600; easing.type: Easing.OutBack } }
        onPaint: {
            var ctx = getContext("2d")
            ctx.reset()
            var size = Math.min(width, height)
            var cx = width / 2, cy = height / 2
            var gap = thick * 0.35
            var rows = [[t, root.cTasks], [h, root.cHabits], [w, root.cWater]]
            ctx.lineCap = "round"
            ctx.lineWidth = thick
            for (var i = 0; i < 3; i++) {
                var r = size / 2 - thick / 2 - i * (thick + gap) - 1
                if (r <= 0) continue
                ctx.strokeStyle = track
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
                var f = Math.max(0, Math.min(1, rows[i][0]))
                if (f <= 0) continue
                ctx.strokeStyle = rows[i][1]
                ctx.beginPath()
                ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (f >= 1 ? 0.9999 : f))
                ctx.stroke()
            }
        }
    }

    compactRepresentation: MouseArea {
        onClicked: root.expanded = !root.expanded
        Layout.minimumWidth: crow.implicitWidth
        Layout.preferredWidth: crow.implicitWidth
        RowLayout {
            id: crow
            anchors.fill: parent
            spacing: Kirigami.Units.smallSpacing
            Rings {
                Layout.preferredWidth: parent.height
                Layout.preferredHeight: parent.height
                opacity: root.running ? 1 : 0.4
            }
            PlasmaComponents.Label {
                visible: Plasmoid.configuration.showNumbers
                text: (root.g.tasks.done || 0) + "/" + (root.g.tasks.total || 0)
                font.pixelSize: Kirigami.Theme.smallFont.pixelSize
            }
        }
    }

    fullRepresentation: ColumnLayout {
        Layout.preferredWidth: Kirigami.Units.gridUnit * 17
        Layout.preferredHeight: Kirigami.Units.gridUnit * 10
        Layout.minimumWidth: Kirigami.Units.gridUnit * 14
        Layout.minimumHeight: Kirigami.Units.gridUnit * 9
        spacing: Kirigami.Units.largeSpacing

        RowLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.largeSpacing
            Rings {
                Layout.preferredWidth: Kirigami.Units.gridUnit * 6.5
                Layout.preferredHeight: Kirigami.Units.gridUnit * 6.5
            }
            GridLayout {
                Layout.fillWidth: true
                columns: 3
                columnSpacing: Kirigami.Units.smallSpacing
                rowSpacing: Kirigami.Units.smallSpacing
                Repeater {
                    model: [
                        { c: root.cTasks, l: root.tx("Tarefas"), v: (root.g.tasks.done || 0) + "/" + (root.g.tasks.total || 0) },
                        { c: root.cHabits, l: root.tx("Hábitos"), v: (root.g.habits.done || 0) + "/" + (root.g.habits.total || 0) },
                        { c: root.cWater, l: root.tx("Água"), v: root.ml(root.g.water.ml || 0) }
                    ]
                    delegate: Item {
                        required property var modelData
                        required property int index
                        Layout.row: index
                        Layout.column: 0
                        implicitWidth: 10; implicitHeight: 10
                        Rectangle { anchors.centerIn: parent; width: 10; height: 10; radius: 5; color: parent.modelData.c }
                    }
                }
                Repeater {
                    model: [root.tx("Tarefas"), root.tx("Hábitos"), root.tx("Água")]
                    delegate: PlasmaComponents.Label {
                        required property var modelData
                        required property int index
                        Layout.row: index; Layout.column: 1; Layout.fillWidth: true
                        text: modelData; opacity: 0.75
                    }
                }
                Repeater {
                    model: [
                        (root.g.tasks.done || 0) + "/" + (root.g.tasks.total || 0),
                        (root.g.habits.done || 0) + "/" + (root.g.habits.total || 0),
                        root.ml(root.g.water.ml || 0) + " de " + root.ml(root.g.water.goal || 2000)
                    ]
                    delegate: PlasmaComponents.Label {
                        required property var modelData
                        required property int index
                        Layout.row: index; Layout.column: 2; Layout.alignment: Qt.AlignRight
                        text: modelData; font.bold: true
                    }
                }
                PlasmaComponents.Label {
                    Layout.row: 3; Layout.column: 0; Layout.columnSpan: 3
                    visible: root.st.ipl !== null && root.st.ipl !== undefined
                    text: root.tx("IPL de hoje: {0}", root.st.ipl)
                    opacity: 0.7
                    font.pixelSize: Kirigami.Theme.smallFont.pixelSize
                }
                PlasmaComponents.Label { Layout.row: 4; Layout.column: 0; Layout.columnSpan: 3; visible: !root.running; text: root.tx("O Lida está fechado."); opacity: 0.7 }
            }
        }
        RowLayout {
            Layout.fillWidth: true
            visible: root.running
            PlasmaComponents.Button {
                Layout.fillWidth: true
                text: root.tx("Copo") + " · " + root.ml((root.st.water && root.st.water.glass) || 250)
                icon.name: "list-add"
                onClicked: root.lida("agua copo")
            }
            PlasmaComponents.Button {
                Layout.fillWidth: true
                text: root.tx("Garrafa") + " · " + root.ml((root.st.water && root.st.water.bottle) || 500)
                icon.name: "list-add"
                onClicked: root.lida("agua garrafa")
            }
        }
    }
}
