import QtQuick
QtObject {
    property string engine
    property var connectedSources: []
    signal newData(string source, var data)
    function connectSource(src) {
        var out = ""
        if (src.indexOf("cat ") === 0) out = fixtureState
        else console.log("CMD: " + src)
        var self = this
        Qt.callLater(function () { self.newData(src, { stdout: out, stderr: "", "exit code": 0 }) })
    }
    function disconnectSource(src) {}
}
