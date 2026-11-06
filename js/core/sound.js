// Sons do Lida.
// Todos são sintetizados na hora com a Web Audio API: nenhum arquivo para baixar, funcionam offline
// e no APK. São curtos, suaves e com volume baixo por padrão — feitos para recompensar, não assustar.
// Preferências do aparelho (não sincronizadas): ligado/desligado e volume.
const KEY = 'lida.sound';

let ctx = null;
let master = null;

export function soundPrefs() {
  try {
    return { on: true, volume: 0.6, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { on: true, volume: 0.6 };
  }
}
export function setSoundPrefs(p) {
  const next = { ...soundPrefs(), ...p };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sem armazenamento */
  }
  if (master) master.gain.value = next.volume * 0.5;
  return next;
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = soundPrefs().volume * 0.5;
    // Compressor leve: vários sons seguidos não estouram.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// O navegador só libera áudio depois de um toque do usuário: o primeiro toque "acorda" o contexto.
export function initSound() {
  const wake = () => {
    if (soundPrefs().on) audio();
    window.removeEventListener('pointerdown', wake, true);
    window.removeEventListener('keydown', wake, true);
  };
  window.addEventListener('pointerdown', wake, true);
  window.addEventListener('keydown', wake, true);
}

// Uma nota com envelope (ataque curto, decaimento exponencial).
function note(freq, { at = 0, dur = 0.18, type = 'sine', gain = 0.35, to = null, attack = 0.006 } = {}) {
  const c = ctx;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Escala pentatônica (soa bem em qualquer sequência): usada no progresso de sprints e metas.
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

const SOUNDS = {
  // Tarefa concluída: "plim" de duas notas subindo.
  complete() {
    note(880, { dur: 0.12, gain: 0.28 });
    note(1318.51, { at: 0.07, dur: 0.22, gain: 0.3 });
    note(2637, { at: 0.07, dur: 0.12, gain: 0.05 });
  },
  // Desmarcar: uma nota curta, mais grave.
  uncheck() {
    note(523.25, { dur: 0.09, gain: 0.18, type: 'triangle' });
  },
  // Subtarefa ou item de rotina: um clique agudo bem curto.
  tick() {
    note(1567.98, { dur: 0.05, gain: 0.14, type: 'triangle' });
  },
  // Progresso (sprint, meta de hábito): sobe na escala conforme a fração concluída (0–1).
  progress({ fraction = 0 } = {}) {
    const i = Math.min(PENTA.length - 1, Math.round(fraction * (PENTA.length - 1)));
    note(PENTA[i], { dur: 0.14, gain: 0.26 });
    if (fraction >= 1) note(PENTA[i] * 1.5, { at: 0.08, dur: 0.3, gain: 0.22 });
  },
  // Ouro ou XP recebido.
  coin() {
    note(1318.51, { dur: 0.07, gain: 0.2, type: 'triangle' });
    note(1975.53, { at: 0.06, dur: 0.18, gain: 0.2, type: 'triangle' });
  },
  // Subiu de nível: arpejo maior com brilho no fim.
  levelup() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, { at: i * 0.09, dur: 0.32, gain: 0.26, type: 'triangle' }));
    note(2093, { at: 0.36, dur: 0.6, gain: 0.08 });
    note(1046.5, { at: 0.36, dur: 0.7, gain: 0.18 });
  },
  // Power-up ativado: subida rápida.
  powerup() {
    note(440, { dur: 0.22, gain: 0.2, to: 1320, type: 'triangle' });
    note(1760, { at: 0.18, dur: 0.16, gain: 0.12 });
  },
  // Compra na loja.
  purchase() {
    note(987.77, { dur: 0.08, gain: 0.2, type: 'triangle' });
    note(1318.51, { at: 0.07, dur: 0.08, gain: 0.2, type: 'triangle' });
    note(1975.53, { at: 0.14, dur: 0.24, gain: 0.18 });
  },
  // Punição ou falha: descida grave e curta, sem drama.
  penalty() {
    note(330, { dur: 0.22, gain: 0.22, to: 220 });
  },
  // Copo de água: gota.
  water() {
    note(1250, { dur: 0.12, gain: 0.25, to: 480 });
    note(900, { at: 0.06, dur: 0.08, gain: 0.08, to: 1300 });
  },
  // Fim de um ciclo do Pomodoro: sino com harmônicos.
  bell() {
    note(880, { dur: 1.6, gain: 0.3, attack: 0.004 });
    note(1760, { dur: 0.9, gain: 0.08, attack: 0.004 });
    note(2640, { dur: 0.5, gain: 0.04, attack: 0.004 });
  },
  // Erro de validação.
  error() {
    note(311.13, { dur: 0.1, gain: 0.2, type: 'triangle' });
    note(277.18, { at: 0.11, dur: 0.14, gain: 0.2, type: 'triangle' });
  },
};

export const SOUND_NAMES = Object.keys(SOUNDS);

export function play(name, opts) {
  const p = soundPrefs();
  if (!p.on || !SOUNDS[name]) return;
  if (!audio()) return;
  try {
    SOUNDS[name](opts);
  } catch {
    /* áudio indisponível */
  }
}
