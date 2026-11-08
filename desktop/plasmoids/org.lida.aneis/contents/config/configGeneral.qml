import QtQuick
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami

Kirigami.FormLayout {
    property alias cfg_binaryPath: binaryPathField.text
    property alias cfg_pollInterval: pollSpin.value
    property alias cfg_showNumbers: numbersCheck.checked

    QQC2.TextField {
        id: binaryPathField
        Kirigami.FormData.label: i18n("Comando do Lida:")
        placeholderText: "lida"
    }
    QQC2.SpinBox {
        id: pollSpin
        Kirigami.FormData.label: i18n("Atualizar a cada (ms):")
        from: 1000; to: 30000; stepSize: 500
    }
    QQC2.CheckBox {
        id: numbersCheck
        Kirigami.FormData.label: i18n("Painel:")
        text: i18n("Mostrar os números ao lado dos anéis")
    }
}
