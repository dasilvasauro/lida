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
import QtQuick.Shapes
import org.kde.kirigami as Kirigami

PlasmoidItem {
    id: root

    readonly property var st: reader.st
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

    // Leitura do estado e comandos sem vazar memória (veja LidaState.qml)
    LidaState { id: reader; objectName: "reader"; interval: Plasmoid.configuration.pollInterval; bin: root.bin() }
    function lida(args) { reader.run(args, function () { reader.refresh() }) }

    // Desenho dos anéis: trilho + arco de cada anel, com ponta arredondada. Shape (geometria) em vez
    // de Canvas: não aloca imagem nem repinta quadro a quadro.
    component Rings: Item {
        id: rg
        property real t: root.fTasks
        property real h: root.fHabits
        property real w: root.fWater
        readonly property real size: Math.min(width, height)
        readonly property real thick: Math.max(2, size * 0.085)
        readonly property real gap: thick * 0.35
        readonly property color track: Qt.rgba(Kirigami.Theme.textColor.r, Kirigami.Theme.textColor.g, Kirigami.Theme.textColor.b, 0.12)
        Behavior on t { NumberAnimation { duration: 600; easing.type: Easing.OutCubic } }
        Behavior on h { NumberAnimation { duration: 600; easing.type: Easing.OutCubic } }
        Behavior on w { NumberAnimation { duration: 600; easing.type: Easing.OutCubic } }
        function rad(i) { return Math.max(0.5, rg.size / 2 - rg.thick / 2 - i * (rg.thick + rg.gap) - 1) }
        function sweep(f) { return 360 * Math.min(0.9999, Math.max(0, f)) }
        Shape {
            anchors.fill: parent
            preferredRendererType: Shape.CurveRenderer
            ShapePath { strokeColor: rg.track; strokeWidth: rg.thick; fillColor: "transparent"; PathAngleArc { centerX: rg.width / 2; centerY: rg.height / 2; radiusX: rg.rad(0); radiusY: rg.rad(0); startAngle: 0; sweepAngle: 360 } }
            ShapePath { strokeColor: rg.track; strokeWidth: rg.thick; fillColor: "transparent"; PathAngleArc { centerX: rg.width / 2; centerY: rg.height / 2; radiusX: rg.rad(1); radiusY: rg.rad(1); startAngle: 0; sweepAngle: 360 } }
            ShapePath { strokeColor: rg.track; strokeWidth: rg.thick; fillColor: "transparent"; PathAngleArc { centerX: rg.width / 2; centerY: rg.height / 2; radiusX: rg.rad(2); radiusY: rg.rad(2); startAngle: 0; sweepAngle: 360 } }
            ShapePath { strokeColor: rg.t > 0.001 ? root.cTasks : "transparent"; strokeWidth: rg.thick; fillColor: "transparent"; capStyle: ShapePath.RoundCap; PathAngleArc { centerX: rg.width / 2; centerY: rg.height / 2; radiusX: rg.rad(0); radiusY: rg.rad(0); startAngle: -90; sweepAngle: rg.sweep(rg.t) } }
            ShapePath { strokeColor: rg.h > 0.001 ? root.cHabits : "transparent"; strokeWidth: rg.thick; fillColor: "transparent"; capStyle: ShapePath.RoundCap; PathAngleArc { centerX: rg.width / 2; centerY: rg.height / 2; radiusX: rg.rad(1); radiusY: rg.rad(1); startAngle: -90; sweepAngle: rg.sweep(rg.h) } }
            ShapePath { strokeColor: rg.w > 0.001 ? root.cWater : "transparent"; strokeWidth: rg.thick; fillColor: "transparent"; capStyle: ShapePath.RoundCap; PathAngleArc { centerX: rg.width / 2; centerY: rg.height / 2; radiusX: rg.rad(2); radiusY: rg.rad(2); startAngle: -90; sweepAngle: rg.sweep(rg.w) } }
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
