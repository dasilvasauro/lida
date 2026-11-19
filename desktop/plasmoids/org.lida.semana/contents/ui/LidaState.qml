/*
 * Lida · leitura do estado e comandos da CLI, para os widgets do Plasma.
 *
 * Cópia idêntica em cada widget (contents/ui/LidaState.qml); o original fica em
 * desktop/plasmoids/shared/ e o teste (desktop/tests/check_plasmoids.py) confere se as cópias batem.
 *
 * Por que existe: o DataSource "executable" guarda a saída de cada comando num QQmlPropertyMap, e
 * esse mapa nunca apaga uma chave. Os widgets antigos davam a cada leitura um nome novo
 * ("cat … # aleatório"), então a cada 1,5 s nascia uma propriedade que nunca morria, e o plasmashell
 * crescia sem parar (e ficava mais lento a cada inserção). Aqui:
 *   - a leitura usa sempre o mesmo nome (uma chave só, para sempre);
 *   - cada comando usa até 4 nomes que se repetem (e espera na fila se os 4 estiverem ocupados);
 *   - um comando que não responde em 20 s é largado (o widget não trava esperando);
 *   - o estado só é trocado quando muda de verdade (sem o carimbo "at"), assim as listas e os
 *     anéis não são destruídos e recriados a cada leitura;
 *   - com o app fechado, lê 4× mais devagar.
 */
import QtQuick
import org.kde.plasma.plasma5support as Plasma5Support

Item {
    id: lida
    visible: false
    width: 0
    height: 0

    // intervalo das leituras com o app aberto (ms)
    property int interval: 1500
    // caminho do executável `lida` (já entre aspas simples)
    property string bin: "'lida'"
    // estado atual (objeto do state.json); só muda quando o conteúdo muda
    property var st: ({})
    // quantas vezes o estado mudou (diagnóstico e teste)
    property int applied: 0
    signal updated(var next, var prev)

    readonly property string readCmd: "cat \"${XDG_CACHE_HOME:-$HOME/.cache}/lida/state.json\" 2>/dev/null"
    property string lastRaw: ""
    property string lastKey: ""
    property double readSince: 0
    property int seq: 0
    // comandos em andamento: nome da fonte → { cb, at }
    property var pending: ({})
    // comandos esperando um nome livre: [{ cmd, cb }]
    property var queue: []
    readonly property int slots: 4

    function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'" }

    // Lê o estado agora (sem esperar o próximo ciclo).
    function refresh() {
        var now = Date.now()
        if (readSince) {
            if (now - readSince < 20000) return
            ds.disconnectSource(readCmd) // leitura travada: larga e tenta de novo
        }
        readSince = now
        ds.connectSource(readCmd)
    }

    // Roda `lida --json <args>`; cb(stdout, stderr, código) quando terminar.
    function run(args, cb) { exec(bin + " --json " + args, cb) }
    function exec(cmd, cb) {
        // poucos nomes que se repetem por comando: o mapa do DataSource não cresce sem limite
        var name = ""
        for (var i = 0; i < slots; i++) {
            var cand = cmd + " #" + ((seq + i) % slots)
            if (!pending[cand]) { name = cand; seq = (seq + i + 1) % slots; break }
        }
        if (!name) {
            if (queue.length < 20) queue.push({ cmd: cmd, cb: cb || null })
            else if (cb) cb("", "busy", 1)
            return
        }
        pending[name] = { cb: cb || null, at: Date.now() }
        ds.connectSource(name)
    }

    function apply(out) {
        if (out === lastRaw) return
        lastRaw = out
        var next
        if (!out) next = { running: false }
        else {
            try { next = JSON.parse(out) } catch (e) { return } // arquivo pela metade: fica o anterior
        }
        // "at" muda a cada envio do app, mesmo sem nada novo: não conta como mudança
        var at = next.at
        delete next.at
        var key = JSON.stringify(next)
        if (at !== undefined) next.at = at
        if (key === lastKey) return
        lastKey = key
        var prev = st
        st = next
        applied++
        updated(next, prev)
    }

    function sweep() {
        var now = Date.now()
        for (var k in pending) {
            if (now - pending[k].at > 20000) {
                var cb = pending[k].cb
                delete pending[k]
                ds.disconnectSource(k)
                if (cb) cb("", "timeout", 1)
            }
        }
    }

    Plasma5Support.DataSource {
        id: ds
        engine: "executable"
        connectedSources: []
        onNewData: function (source, data) {
            disconnectSource(source)
            if (source === lida.readCmd) {
                lida.readSince = 0
                lida.apply(String(data["stdout"] || "").trim())
                return
            }
            var p = lida.pending[source]
            if (!p) return
            delete lida.pending[source]
            // o próximo da fila sai depois de um respiro: um nome recém-desconectado ainda existe por
            // alguns milissegundos no motor e não rodaria o comando de novo
            if (lida.queue.length) next.restart()
            if (p.cb) p.cb(data["stdout"] || "", data["stderr"] || "", data["exit code"])
        }
    }

    Timer {
        id: next
        interval: 150
        onTriggered: { var q = lida.queue.shift(); if (q) lida.exec(q.cmd, q.cb); if (lida.queue.length) restart() }
    }
    Timer {
        interval: Math.max(1000, lida.interval) * (lida.st.running ? 1 : 4)
        running: true
        repeat: true
        triggeredOnStart: true
        onTriggered: { lida.refresh(); lida.sweep() }
    }
}
