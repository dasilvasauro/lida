import QtQuick
Rectangle { property var source; property bool isMask: false; property color color; radius: 6; gradient: Gradient { GradientStop { position: 0; color: "#2a3040" } GradientStop { position: 1; color: "#0c0f14" } } }
