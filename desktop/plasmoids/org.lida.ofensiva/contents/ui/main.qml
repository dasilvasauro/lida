/*
 * Lida · Ofensiva (widget do Plasma 6)
 *
 * A ofensiva do Lida no estilo Duolingo: o Lidinho com a cara do momento (manhã, urgente, feito,
 * pijama, quebrada, abandonado), os dias seguidos, o que falta hoje e a semana. Lê
 * ~/.cache/lida/state.json (gravado pelo app). Com o app fechado, a cara segue a hora do dia.
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
    property int hour: new Date().getHours()
    readonly property var sk: st.streak || null
    readonly property string todayStr: { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) }
    // dias desde os dados do app (0 = de hoje)
    readonly property int since: st.date ? daysBetween(st.date, todayStr) : 0
    readonly property bool met: !!sk && since === 0 && !!sk.todayMet
    readonly property int count: !sk ? 0 : since === 0 ? sk.count : since === 1 && sk.todayMet ? sk.count : 0
    readonly property int broken: !sk ? 0 : since === 0 ? (sk.broken || 0) : since === 1 && !sk.todayMet && sk.count >= 2 ? sk.count : 0
    readonly property int idle: sk && sk.lastActive ? daysBetween(sk.lastActive, todayStr) : 0
    readonly property string mood: !sk ? "manha" : idle >= 3 && !met ? "abandonado" : met ? (hour >= 21 || hour < 4 ? "pijama" : "feito") : broken >= 2 ? "quebrada" : hour >= 18 ? "urgente" : "manha"
    readonly property var moodText: ({
        manha: "Bom dia! Bora manter a ofensiva.",
        feito: "Ofensiva garantida hoje!",
        pijama: "Meta batida. Boa noite!",
        urgente: "O dia está acabando: falta pouco para manter a ofensiva!",
        quebrada: "A ofensiva quebrou. Recomece hoje.",
        abandonado: "Faz dias que você não aparece…"
    })
    readonly property color lit: "#ff7a2e"

    Plasmoid.icon: "io.github.dasilvasauro.lida"
    toolTipMainText: root.tx("Lida · Ofensiva")
    toolTipSubText: root.count + " " + (root.count === 1 ? root.tx("dia de ofensiva") : root.tx("dias de ofensiva")) + "\n" + root.tx(root.moodText[root.mood])

    function pad(n) { return n < 10 ? "0" + n : "" + n }
    function daysBetween(a, b) {
        var pa = String(a).split("-"), pb = String(b).split("-")
        var da = new Date(+pa[0], +pa[1] - 1, +pa[2]), db = new Date(+pb[0], +pb[1] - 1, +pb[2])
        return Math.round((db - da) / 86400000)
    }
    function tx(s) {
        var out = (st && st.txt && st.txt[s]) || s
        for (var i = 1; i < arguments.length; i++) out = out.split("{" + (i - 1) + "}").join(arguments[i])
        return out
    }

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
        root.hour = new Date().getHours()
        sh.run("cat \"${XDG_CACHE_HOME:-$HOME/.cache}/lida/state.json\" 2>/dev/null", function (out) {
            if (!out) return
            try { st = JSON.parse(out) } catch (e) { }
        })
    }
    Timer { interval: Math.max(1000, Plasmoid.configuration.pollInterval); running: true; repeat: true; triggeredOnStart: true; onTriggered: root.refresh() }

    // Chama: a mesma do app (acesa quando a meta de hoje veio)
    component Flame: Canvas {
        property color color: Kirigami.Theme.disabledTextColor
        onColorChanged: requestPaint()
        onPaint: {
            var c = getContext("2d")
            c.reset()
            c.scale(width / 24, height / 24)
            c.fillStyle = color
            c.beginPath()
            c.moveTo(12, 21)
            c.bezierCurveTo(15.9, 21, 18.5, 18.4, 18.5, 14.7)
            c.bezierCurveTo(18.5, 11.5, 16.4, 9.7, 15.1, 7.4)
            c.bezierCurveTo(14.6, 9.1, 13.5, 10.2, 12.3, 10.6)
            c.bezierCurveTo(11.9, 8.2, 10.8, 6.4, 8.7, 5.2)
            c.bezierCurveTo(9, 8, 7.5, 9.8, 6.3, 11.4)
            c.bezierCurveTo(5.8, 12.2, 5.5, 13.4, 5.5, 14.7)
            c.bezierCurveTo(5.5, 18.4, 8.1, 21, 12, 21)
            c.fill()
        }
    }

    compactRepresentation: MouseArea {
        onClicked: root.expanded = !root.expanded
        Layout.minimumWidth: crow.implicitWidth
        Layout.preferredWidth: crow.implicitWidth
        RowLayout {
            id: crow
            anchors.fill: parent
            spacing: 2
            Flame {
                Layout.preferredWidth: parent.height * 0.8
                Layout.preferredHeight: parent.height * 0.8
                color: root.met ? root.lit : Kirigami.Theme.disabledTextColor
            }
            PlasmaComponents.Label {
                text: root.count
                font.bold: true
                color: root.met ? root.lit : Kirigami.Theme.textColor
            }
        }
    }

    fullRepresentation: RowLayout {
        Layout.preferredWidth: Kirigami.Units.gridUnit * 20
        Layout.preferredHeight: Kirigami.Units.gridUnit * 11
        Layout.minimumWidth: Kirigami.Units.gridUnit * 15
        Layout.minimumHeight: Kirigami.Units.gridUnit * 9
        spacing: Kirigami.Units.largeSpacing

        Image {
            Layout.preferredWidth: Kirigami.Units.gridUnit * 8
            Layout.preferredHeight: Kirigami.Units.gridUnit * 8
            Layout.alignment: Qt.AlignVCenter
            source: Qt.resolvedUrl("../images/" + root.mood + ".png")
            fillMode: Image.PreserveAspectFit
            smooth: true
            mipmap: true
        }
        ColumnLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.smallSpacing
            RowLayout {
                spacing: 4
                Flame {
                    Layout.preferredWidth: Kirigami.Units.gridUnit * 1.6
                    Layout.preferredHeight: Kirigami.Units.gridUnit * 1.6
                    color: root.met ? root.lit : Kirigami.Theme.disabledTextColor
                }
                PlasmaComponents.Label {
                    text: root.count
                    font.pixelSize: Kirigami.Units.gridUnit * 1.9
                    font.weight: Font.Black
                    color: root.met ? root.lit : Kirigami.Theme.textColor
                }
            }
            PlasmaComponents.Label {
                text: root.count === 1 ? root.tx("dia de ofensiva") : root.tx("dias de ofensiva")
                opacity: 0.7
            }
            PlasmaComponents.Label {
                Layout.fillWidth: true
                text: root.tx(root.moodText[root.mood])
                wrapMode: Text.Wrap
                font.bold: true
            }
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 6
                radius: 3
                visible: !!root.sk && root.since === 0
                color: Qt.rgba(Kirigami.Theme.textColor.r, Kirigami.Theme.textColor.g, Kirigami.Theme.textColor.b, 0.12)
                Rectangle {
                    width: parent.width * Math.min(1, ((root.sk && root.sk.pct) || 0) / 100)
                    height: parent.height
                    radius: 3
                    color: root.lit
                }
            }
            PlasmaComponents.Label {
                Layout.fillWidth: true
                visible: !!root.sk && root.since === 0 && !!root.sk.line
                text: root.sk ? root.sk.line : ""
                opacity: 0.7
                font.pixelSize: Kirigami.Theme.smallFont.pixelSize
                elide: Text.ElideRight
            }
            RowLayout {
                spacing: 6
                visible: !!root.sk && root.since === 0 && !!root.sk.week
                Repeater {
                    model: root.sk && root.sk.week ? root.sk.week : []
                    delegate: ColumnLayout {
                        required property var modelData
                        spacing: 1
                        Rectangle {
                            Layout.alignment: Qt.AlignHCenter
                            width: 14; height: 14; radius: 7
                            color: modelData.state === "met" ? root.lit : "transparent"
                            border.width: modelData.state === "met" ? 0 : 2
                            border.color: modelData.state === "miss" ? "#e5484d" : Qt.rgba(Kirigami.Theme.textColor.r, Kirigami.Theme.textColor.g, Kirigami.Theme.textColor.b, 0.25)
                        }
                        PlasmaComponents.Label {
                            Layout.alignment: Qt.AlignHCenter
                            text: modelData.l
                            font.pixelSize: Kirigami.Theme.smallFont.pixelSize
                            opacity: 0.6
                        }
                    }
                }
            }
        }
    }
}
