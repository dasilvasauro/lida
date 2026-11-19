import QtQuick
// Imitação do DataSource "executable" com as regras que importam para memória:
// - cada nome de fonte vira uma chave permanente no mapa (como o QQmlPropertyMap real);
// - conectar um nome que ainda está conectado não roda o comando de novo.
// Avisa (e o teste falha) se o widget cria nomes sem limite ou reconecta sem desconectar.
QtObject {
    property string engine
    property var connectedSources: []
    property var keys: ({})
    property int nkeys: 0
    property var live: ({})
    property int reads: 0
    signal newData(string source, var data)
    function connectSource(src) {
        if (live[src]) { console.warn("DataSource: reconectou sem desconectar: " + src); return }
        live[src] = true
        if (!keys[src]) { keys[src] = true; nkeys++; if (nkeys > 60) console.warn("DataSource: nomes demais (vazamento): " + nkeys) }
        var out = ""
        if (src.indexOf("cat ") === 0) {
            reads++
            var o = JSON.parse(fixtureState)
            o.at = Date.now() + reads // muda a cada leitura, como no app
            out = JSON.stringify(o)
        } else if (src.indexOf("--json") < 0 || src.indexOf("soak") < 0) console.log("CMD: " + src)
        var self = this
        Qt.callLater(function () { self.newData(src, { stdout: out, stderr: "", "exit code": 0 }) })
    }
    function disconnectSource(src) { delete live[src] }
}
