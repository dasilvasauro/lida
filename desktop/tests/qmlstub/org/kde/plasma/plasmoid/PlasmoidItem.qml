import QtQuick
Item {
    id: pi
    width: 900; height: 700
    property Component compactRepresentation
    property Component fullRepresentation
    property bool expanded: true
    property string toolTipMainText
    property string toolTipSubText
    property real switchWidth
    property real switchHeight
    Loader { id: cl; x: 0; y: 0; width: 420; height: 26; sourceComponent: pi.compactRepresentation }
    Loader { id: fl; x: 0; y: 40; width: item ? item.implicitWidth : 380; height: item ? item.implicitHeight : 560; sourceComponent: pi.fullRepresentation }
}
