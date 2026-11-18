/*
 * Lida · IPL da semana (widget do Plasma 6)
 *
 * Barras com a nota (IPL) de cada um dos últimos 7 dias, a de hoje parcial e mais clara, e a média.
 * Lê ~/.cache/lida/state.json (gravado pelo app).
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
    readonly property var wk: st.iplWeek || null
    readonly property var days: wk && wk.days ? wk.days : []

    Plasmoid.icon: "io.github.dasilvasauro.lida"
    toolTipMainText: root.wk ? root.wk.title : "Lida"
    toolTipSubText: root.wk ? (root.wk.avg || root.wk.note) : ""

    function color(s) { return s >= 85 ? "#3dd6a3" : s >= 70 ? "#7c8cff" : s >= 50 ? "#f2c14e" : "#ff7a6b" }

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
            if (!out) return
            try { st = JSON.parse(out) } catch (e) { }
        })
    }
    Timer { interval: Math.max(1000, Plasmoid.configuration.pollInterval); running: true; repeat: true; triggeredOnStart: true; onTriggered: root.refresh() }

    component Bars: RowLayout {
        id: bars
        property bool labels: true
        spacing: Math.max(2, width / 40)
        Repeater {
            model: root.days
            delegate: ColumnLayout {
                required property var modelData
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 2
                PlasmaComponents.Label {
                    Layout.alignment: Qt.AlignHCenter
                    visible: bars.labels
                    text: modelData.s === null || modelData.s === undefined ? "–" : modelData.s
                    font.pixelSize: Kirigami.Theme.smallFont.pixelSize
                    font.bold: true
                    opacity: modelData.s === null || modelData.s === undefined ? 0.4 : 1
                }
                Item {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Rectangle {
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.bottom: parent.bottom
                        width: Math.min(parent.width * 0.7, Kirigami.Units.gridUnit * 1.6)
                        height: parent.height
                        radius: width / 2.6
                        color: Qt.rgba(Kirigami.Theme.textColor.r, Kirigami.Theme.textColor.g, Kirigami.Theme.textColor.b, 0.1)
                    }
                    Rectangle {
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.bottom: parent.bottom
                        visible: modelData.s !== null && modelData.s !== undefined
                        width: Math.min(parent.width * 0.7, Kirigami.Units.gridUnit * 1.6)
                        height: Math.max(width * 0.4, parent.height * Math.min(1, (modelData.s || 0) / 100))
                        radius: width / 2.6
                        color: root.color(modelData.s || 0)
                        opacity: modelData.today ? 0.55 : 1
                        Behavior on height { NumberAnimation { duration: 500; easing.type: Easing.OutCubic } }
                    }
                }
                PlasmaComponents.Label {
                    Layout.alignment: Qt.AlignHCenter
                    visible: bars.labels
                    text: modelData.l
                    font.pixelSize: Kirigami.Theme.smallFont.pixelSize
                    font.bold: !!modelData.today
                    opacity: modelData.today ? 1 : 0.6
                }
            }
        }
    }

    compactRepresentation: MouseArea {
        onClicked: root.expanded = !root.expanded
        Layout.minimumWidth: Kirigami.Units.gridUnit * 3
        Layout.preferredWidth: Kirigami.Units.gridUnit * 3
        Bars { anchors.fill: parent; anchors.margins: 2; labels: false }
    }

    fullRepresentation: ColumnLayout {
        Layout.preferredWidth: Kirigami.Units.gridUnit * 20
        Layout.preferredHeight: Kirigami.Units.gridUnit * 12
        Layout.minimumWidth: Kirigami.Units.gridUnit * 14
        Layout.minimumHeight: Kirigami.Units.gridUnit * 9
        spacing: Kirigami.Units.smallSpacing
        RowLayout {
            Layout.fillWidth: true
            PlasmaComponents.Label {
                Layout.fillWidth: true
                text: root.wk ? root.wk.title : "IPL"
                font.bold: true
                font.pixelSize: Kirigami.Theme.defaultFont.pixelSize * 1.15
            }
            PlasmaComponents.Label { text: root.wk ? root.wk.avg : ""; opacity: 0.7 }
        }
        Bars { Layout.fillWidth: true; Layout.fillHeight: true }
        PlasmaComponents.Label {
            Layout.fillWidth: true
            text: root.wk ? root.wk.note : ""
            opacity: 0.7
            wrapMode: Text.Wrap
            font.pixelSize: Kirigami.Theme.smallFont.pixelSize
        }
    }
}
