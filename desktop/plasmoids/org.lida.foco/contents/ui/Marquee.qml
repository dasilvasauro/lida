/*
 * Uma linha de texto que rola de um lado para o outro quando não cabe (nome da tarefa em foco
 * no painel). Quando cabe, fica parada.
 */
import QtQuick
import org.kde.kirigami as Kirigami

Item {
    id: root
    property alias text: label.text
    property color textColor: Kirigami.Theme.textColor
    property int pixelSize: Kirigami.Theme.defaultFont.pixelSize
    property int maxWidth: 100000
    clip: true
    implicitHeight: label.implicitHeight
    implicitWidth: Math.min(label.implicitWidth, maxWidth)
    readonly property real overflowBy: Math.max(0, label.implicitWidth - width)

    Text {
        id: label
        color: root.textColor
        font.pixelSize: root.pixelSize
        verticalAlignment: Text.AlignVCenter
        height: root.height
    }
    Binding { target: label; property: "x"; value: 0; when: root.overflowBy <= 0 }
    SequentialAnimation {
        running: root.overflowBy > 0 && root.visible
        loops: Animation.Infinite
        PauseAnimation { duration: 1400 }
        NumberAnimation { target: label; property: "x"; from: 0; to: -root.overflowBy; duration: Math.max(1200, root.overflowBy / 40 * 1000); easing.type: Easing.InOutQuad }
        PauseAnimation { duration: 1400 }
        NumberAnimation { target: label; property: "x"; from: -root.overflowBy; to: 0; duration: Math.max(1200, root.overflowBy / 40 * 1000); easing.type: Easing.InOutQuad }
    }
}
