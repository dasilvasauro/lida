// Sons do Lida.
// Todos são sintetizados na hora com a Web Audio API: nenhum arquivo para baixar, funcionam offline
// e no APK. São curtos, suaves e com volume baixo por padrão — feitos para recompensar, não assustar.
// Preferências do aparelho (não sincronizadas): ligado/desligado, volume e o conjunto de sons.
// Conjuntos (o Clássico é de graça; os outros se compram na Loja): mudam o timbre de todos os sons
// — onda, harmônicos, envelope, filtro — e alguns trocam a melodia por uma que combina mais.
const KEY = 'lida.sound';

let ctx = null;
let master = null;

export function soundPrefs() {
  try {
    return { on: true, volume: 0.6, pack: 'classic', ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { on: true, volume: 0.6, pack: 'classic' };
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

/* ---------- Conjuntos de sons ---------- */
// Cada voz recebe as opções da nota e devolve as opções finais:
//   partials: [[razão, ganho, duração]] osciladores extras sobre a fundamental
//   detune: cents de um segundo oscilador (coro)   steps: glissando em degraus (8-bit)
//   lowpass: frequência de corte                   noise: estalo de ruído no ataque (madeira)
export const PACKS = {
  classic: { name: 'Clássico', desc: 'Os sons de sempre: plins suaves e um sino.', price: 0 },
  retro: { name: 'Retrô 8-bit', desc: 'Ondas quadradas e arpejos rápidos de videogame antigo.', price: 900 },
  wood: { name: 'Madeira e sinos', desc: 'Marimba, blocos de madeira e sinos de verdade.', price: 900 },
  crystal: { name: 'Cristal', desc: 'Notas agudas e brilhantes, com cauda longa de taça.', price: 900 },
  digital: { name: 'Digital', desc: 'Bipes secos, glissandos e um toque de sintetizador.', price: 900 },
};
export const PACK_ORDER = Object.keys(PACKS);

const VOICES = {
  classic: (o) => o,
  retro: (o) => ({ ...o, type: o.type === 'sine' || o.type === 'triangle' ? 'square' : o.type, gain: o.gain * 0.42, attack: 0.002, dur: Math.min(o.dur, 0.4), steps: true, lowpass: 5200 }),
  wood: (o) => ({ ...o, type: 'sine', attack: 0.002, dur: Math.min(o.dur, 0.5) * 0.85, partials: [[4, 0.28, 0.25], [9.2, 0.06, 0.08]], noise: 0.05 }),
  crystal: (o, f) => ({ ...o, type: 'sine', gain: o.gain * 0.8, attack: 0.004, dur: o.dur * 1.7 + 0.15, detune: 7, partials: [[f < 700 ? 4 : 2, 0.22, 0.8], [5.04, 0.05, 0.4]] }),
  digital: (o) => ({ ...o, type: 'sawtooth', gain: o.gain * 0.36, attack: 0.002, dur: Math.max(0.04, o.dur * 0.6), lowpass: 2600 }),
};

function pack() {
  const k = soundPrefs().pack;
  return VOICES[k] ? k : 'classic';
}
let voiceOverride = null; // para tocar a amostra de um conjunto sem trocar a preferência

function osc(freq, { t, dur, type, gain, to, attack, steps, detune = 0 }, dest) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.detune.value = detune;
  o.frequency.setValueAtTime(freq, t);
  if (to && steps) {
    const n = 5;
    for (let i = 1; i <= n; i++) o.frequency.setValueAtTime(freq * Math.pow(to / freq, i / n), t + (dur * i) / (n + 1));
  } else if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
  if (steps) g.gain.setValueAtTime(gain * 0.8, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function click(t, gain, dest) {
  const len = Math.round(ctx.sampleRate * 0.02);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const s = ctx.createBufferSource();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  const g = ctx.createGain();
  g.gain.value = gain;
  s.buffer = buf;
  s.connect(bp).connect(g).connect(dest);
  s.start(t);
}

// Uma nota com envelope (ataque curto, decaimento exponencial), no timbre do conjunto escolhido.
function note(freq, opts = {}) {
  const base = { at: 0, dur: 0.18, type: 'sine', gain: 0.35, to: null, attack: 0.006, ...opts };
  const o = VOICES[voiceOverride || pack()](base, freq);
  const t = ctx.currentTime + o.at;
  let dest = master;
  if (o.lowpass) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.lowpass;
    lp.connect(master);
    dest = lp;
    setTimeout(() => lp.disconnect(), (o.at + o.dur + 0.3) * 1000);
  }
  osc(freq, { ...o, t }, dest);
  if (o.detune) osc(freq, { ...o, t, gain: o.gain * 0.5, detune: o.detune }, dest);
  for (const [r, gm, dm] of o.partials || []) {
    if (freq * r > 12000) continue;
    osc(freq * r, { ...o, t, to: o.to ? o.to * r : null, gain: o.gain * gm, dur: Math.max(0.03, o.dur * dm) }, dest);
  }
  if (o.noise) click(t, o.noise, dest);
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

// Melodias próprias de alguns conjuntos (o resto usa as do Clássico, no timbre do conjunto).
const MELODIES = {
  retro: {
    complete() {
      [659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => note(f, { at: i * 0.045, dur: 0.07, gain: 0.3 }));
    },
    coin() {
      note(987.77, { dur: 0.07, gain: 0.28 });
      note(1318.51, { at: 0.07, dur: 0.28, gain: 0.28 });
    },
    levelup() {
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => note(f, { at: i * 0.06, dur: 0.09, gain: 0.26 }));
      note(2093, { at: 0.5, dur: 0.3, gain: 0.2 });
    },
    penalty() {
      [392, 349.23, 311.13, 261.63].forEach((f, i) => note(f, { at: i * 0.08, dur: 0.1, gain: 0.24 }));
    },
    bell() {
      [1046.5, 1046.5, 1567.98].forEach((f, i) => note(f, { at: i * 0.18, dur: 0.16, gain: 0.28 }));
    },
  },
  wood: {
    complete() {
      note(783.99, { dur: 0.3, gain: 0.32 });
      note(1174.66, { at: 0.09, dur: 0.4, gain: 0.32 });
    },
    tick() {
      note(1760, { dur: 0.05, gain: 0.16 });
    },
    // Sino de verdade: harmônicos inarmônicos e cauda longa.
    bell() {
      const f = 659.25;
      [[1, 0.3, 2.4], [2.76, 0.12, 1.4], [5.4, 0.06, 0.8], [8.93, 0.03, 0.4]].forEach(([r, g, d]) => osc(f * r, { t: ctx.currentTime, dur: d, type: 'sine', gain: g, attack: 0.003 }, master));
    },
    levelup() {
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => note(f, { at: i * 0.1, dur: 0.4, gain: 0.28 }));
      const f = 1046.5;
      [[1, 0.16, 2], [2.76, 0.06, 1.2], [5.4, 0.03, 0.6]].forEach(([r, g, d]) => osc(f * r, { t: ctx.currentTime + 0.55, dur: d, type: 'sine', gain: g, attack: 0.003 }, master));
    },
  },
  crystal: {
    complete() {
      note(1318.51, { dur: 0.2, gain: 0.24 });
      note(1975.53, { at: 0.08, dur: 0.3, gain: 0.22 });
    },
    coin() {
      note(2093, { dur: 0.08, gain: 0.16 });
      note(2637, { at: 0.06, dur: 0.16, gain: 0.16 });
    },
    levelup() {
      [1046.5, 1318.51, 1567.98, 2093, 2637].forEach((f, i) => note(f, { at: i * 0.08, dur: 0.3, gain: 0.18 }));
    },
  },
  digital: {
    complete() {
      note(880, { dur: 0.06, gain: 0.3 });
      note(1760, { at: 0.07, dur: 0.1, gain: 0.3 });
    },
    tick() {
      note(2000, { dur: 0.03, gain: 0.16, type: 'square' });
    },
    water() {
      note(400, { dur: 0.16, gain: 0.28, to: 1600 });
    },
    levelup() {
      note(220, { dur: 0.5, gain: 0.26, to: 880 });
      [880, 1108.73, 1318.51, 1760].forEach((f, i) => note(f, { at: 0.4 + i * 0.07, dur: 0.12, gain: 0.26 }));
    },
    bell() {
      [1760, 0, 1760, 0, 1760].forEach((f, i) => f && note(f, { at: i * 0.1, dur: 0.09, gain: 0.3, type: 'square' }));
    },
    powerup() {
      note(300, { dur: 0.3, gain: 0.26, to: 2400 });
    },
  },
};

export const SOUND_NAMES = [...Object.keys(SOUNDS), 'bike'];

// Campainha de bicicleta das notificações (o mesmo arquivo usado pelo Android).
let bell = null;
function bike() {
  try {
    bell ||= new Audio('sounds/sino_bicicleta.wav');
    bell.volume = Math.min(1, soundPrefs().volume);
    bell.currentTime = 0;
    bell.play().catch(() => {});
  } catch {
    /* sem áudio */
  }
}

export function play(name, opts) {
  const p = soundPrefs();
  if (!p.on) return;
  if (name === 'bike') return bike();
  if (!SOUNDS[name]) return;
  if (!audio()) return;
  const k = voiceOverride || pack();
  try {
    (MELODIES[k]?.[name] || SOUNDS[name])(opts);
  } catch {
    /* áudio indisponível */
  }
}

// Amostra de um conjunto (na Loja e em Ajustes): concluir, moeda e subir de nível.
export function preview(k) {
  if (!VOICES[k] || !audio()) return;
  const seq = [['complete', 0], ['coin', 520], ['levelup', 1100]];
  for (const [name, ms] of seq)
    setTimeout(() => {
      voiceOverride = k;
      try {
        (MELODIES[k]?.[name] || SOUNDS[name])();
      } catch {
        /* áudio indisponível */
      }
      voiceOverride = null;
    }, ms);
}
