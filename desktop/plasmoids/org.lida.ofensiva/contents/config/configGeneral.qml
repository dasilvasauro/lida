import QtQuick
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami

Kirigami.FormLayout {
    property alias cfg_pollInterval: pollSpin.value

    QQC2.SpinBox {
        id: pollSpin
        Kirigami.FormData.label: i18n("Atualizar a cada (ms):")
        from: 1000; to: 60000; stepSize: 1000
    }
}
