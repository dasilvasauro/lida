import QtQuick
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami

Kirigami.FormLayout {
    property alias cfg_binaryPath: binaryPathField.text
    property alias cfg_pollInterval: pollSpin.value
    property alias cfg_focusNameWidth: widthSpin.value
    property alias cfg_showTimer: timerCheck.checked

    QQC2.TextField {
        id: binaryPathField
        Kirigami.FormData.label: i18n("Comando do Lida:")
        placeholderText: "lida"
    }
    QQC2.SpinBox {
        id: pollSpin
        Kirigami.FormData.label: i18n("Atualizar a cada (ms):")
        from: 500; to: 10000; stepSize: 250
    }
    QQC2.SpinBox {
        id: widthSpin
        Kirigami.FormData.label: i18n("Largura do nome no painel (px):")
        from: 60; to: 500; stepSize: 10
    }
    QQC2.CheckBox {
        id: timerCheck
        Kirigami.FormData.label: i18n("Painel:")
        text: i18n("Mostrar o cronômetro")
    }
}
