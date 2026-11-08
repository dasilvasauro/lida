import QtQuick
import QtQuick.Layouts
// Imitação mínima do PlasmoidItem: mostra a versão da barra (sobre um "painel" escuro) e a aberta.
Item {
    id: pi
    width: 900; height: 760
    property Component compactRepresentation
    property Component fullRepresentation
    property bool expanded: true
    property string toolTipMainText
    property string toolTipSubText
    property real switchWidth
    property real switchHeight
    Rectangle { x: 0; y: 0; width: 900; height: 36; color: "#1d2129" }
    Loader { id: cl; x: 8; y: 4; height: 28; width: item ? Math.max(item.Layout.preferredWidth, 40) : 300; sourceComponent: pi.compactRepresentation }
    Rectangle { x: 0; y: 44; width: 460; height: 716; color: "#2a2f38" }
    Loader { id: fl; x: 10; y: 54; width: item ? (item.Layout.preferredWidth > 0 ? item.Layout.preferredWidth : item.implicitWidth) : 380; height: item ? (item.Layout.preferredHeight > 0 ? item.Layout.preferredHeight : item.implicitHeight) : 560; sourceComponent: pi.fullRepresentation }
}
