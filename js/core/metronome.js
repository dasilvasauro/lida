// Tique do relógio e metrônomo para o Pomodoro e o modo foco com tempo.
// Padrão: um tique por segundo (60 batidas por minuto, compasso de 1). No montador (avançado): de 1 a 8
// tempos por compasso (até 8/8), cada tempo forte, normal ou mudo, de 30 a 200 batidas por minuto e
// seis sons. Sintetizado com a Web Audio API e agendado com antecedência (não atrasa com a tela ocupada).
// Preferência do aparelho (não sincroniza): cada aparelho tem o seu som.
import { soundPrefs } from './sound.js';

const KEY = 'lida.tick';
const L = (pt, en, es) => ({ pt, en, es });
export const TICK_SOUNDS = {
  relogio: { name: L('Relógio de parede', 'Wall clock', 'Reloj de pared') },
  madeira: { name: L('Bloco de madeira', 'Wood block', 'Bloque de madera') },
  clave: { name: L('Claves', 'Claves', 'Claves') },
  digital: { name: L('Bipe digital', 'Digital beep', 'Pitido digital') },
  suave: { name: L('Pulso suave', 'Soft pulse', 'Pulso suave') },
  gota: { name: L('Gota', 'Drop', 'Gota') },
};
export const TICK_ORDER = Object.keys(TICK_SOUNDS);
export const BEAT_STATES = ['accent', 'normal', 'mute'];
export const MAX_BEATS = 8;

const DEF = {
  on: false, // tique ligado
  sound: 'relogio',
  bpm: 60,
  beats: 1,
  pattern: ['accent', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal'],
  volume: 0.6,
  pomo: true, // no foco do Pomodoro
  pause: false, // também na pausa do Pomodoro
  focus: true, // no modo foco com tempo
};

export function tickPrefs() {
  try {
    const p = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    p.beats = Math.max(1, Math.min(MAX_BEATS, Math.round(p.beats) || 1));
    p.bpm = Math.max(30, Math.min(200, Math.round(p.bpm) || 60));
    if (!TICK_SOUNDS[p.sound]) p.sound = 'relogio';
    p.pattern = Array.from({ length: MAX_BEATS }, (_, i) => (BEAT_STATES.includes(p.pattern?.[i]) ? p.pattern[i] : i === 0 ? 'accent' : 'normal'));
    return p;
  } catch {
    return { ...DEF };
  }
}
export function setTickPrefs(patch) {
  const next = { ...tickPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sem armazenamento */
  }
  restart();
  return next;
}

/* ---------- Som ---------- */
let ctx = null;
let out = null;
function audio() {
  if (!ctx) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain();
    out.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBurst(t, { freq, q = 1, gain, len = 0.03, type = 'bandpass' }) {
  const n = Math.round(ctx.sampleRate * len);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  const s = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  s.buffer = buf;
  s.connect(f).connect(g).connect(out);
  s.start(t);
}
function tone(t, { freq, to, type = 'sine', gain, dur }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Um tique. accent: tempo forte (mais agudo e mais alto). n: número do tempo (o relógio alterna tique-taque).
const VOICES = {
  relogio(t, accent, n) {
    const hi = n % 2 === 0;
    noiseBurst(t, { freq: hi ? 3400 : 2500, q: 6, gain: accent ? 1.6 : 1.05, len: 0.025 });
    tone(t, { freq: hi ? 1900 : 1500, gain: accent ? 0.16 : 0.09, dur: 0.03 });
  },
  madeira(t, accent) {
    tone(t, { freq: accent ? 1250 : 950, gain: accent ? 0.5 : 0.34, dur: 0.07 });
    tone(t, { freq: (accent ? 1250 : 950) * 2.76, gain: 0.08, dur: 0.03 });
    noiseBurst(t, { freq: 2200, q: 2, gain: 0.25, len: 0.01 });
  },
  clave(t, accent) {
    tone(t, { freq: accent ? 2700 : 2300, gain: accent ? 0.42 : 0.3, dur: 0.06 });
    tone(t, { freq: (accent ? 2700 : 2300) * 1.5, gain: 0.07, dur: 0.04 });
  },
  digital(t, accent) {
    tone(t, { freq: accent ? 2093 : 1568, type: 'square', gain: accent ? 0.12 : 0.08, dur: 0.035 });
  },
  suave(t, accent) {
    tone(t, { freq: accent ? 660 : 440, gain: accent ? 0.42 : 0.28, dur: 0.14 });
  },
  gota(t, accent) {
    tone(t, { freq: accent ? 1800 : 1400, to: accent ? 700 : 560, gain: accent ? 0.42 : 0.3, dur: 0.09 });
  },
};

// Toca um tempo agora (amostra no montador).
export function previewBeat(sound = tickPrefs().sound, accent = true) {
  if (!audio()) return;
  out.gain.value = volumeNow();
  VOICES[sound]?.(ctx.currentTime + 0.01, accent, 0);
}
const volumeNow = () => tickPrefs().volume * (soundPrefs().volume || 0.6) * 1.2;

/* ---------- Agendador ---------- */
// Agenda as batidas dos próximos 120 ms a cada 30 ms (o relógio da Web Audio não atrasa).
let timer = 0;
let nextAt = 0;
let beat = 0;
let wanted = null; // onde deveria tocar agora ('pomo', 'pause', 'focus') ou null
let onBeat = null; // quem desenha a batida na tela (montador)
let preview = false; // o montador está aberto e tocando

function schedule() {
  if (!ctx) return;
  const p = tickPrefs();
  const spb = 60 / p.bpm;
  while (nextAt < ctx.currentTime + 0.12) {
    const i = beat % p.beats;
    const st = p.pattern[i];
    if (st !== 'mute') VOICES[p.sound](nextAt, st === 'accent' && p.beats > 1, beat);
    if (onBeat) {
      const delay = Math.max(0, (nextAt - ctx.currentTime) * 1000);
      const idx = i;
      setTimeout(() => onBeat?.(idx), delay);
    }
    nextAt += spb;
    beat++;
  }
}
function start() {
  if (timer || !audio()) return;
  out.gain.value = volumeNow();
  nextAt = ctx.currentTime + 0.06;
  beat = 0;
  timer = setInterval(schedule, 30);
  schedule();
}
function stop() {
  clearInterval(timer);
  timer = 0;
}
function restart() {
  if (!timer) return update();
  stop();
  update();
}
function update() {
  const p = tickPrefs();
  const run = (wanted && p.on && p[wanted] && soundPrefs().on !== false) || preview;
  if (run) start();
  else stop();
  if (ctx && out) out.gain.value = volumeNow();
}

// O Pomodoro e o modo foco chamam a cada segundo: onde está correndo agora (ou null).
export function tickWhere(where) {
  if (where === wanted) return;
  wanted = where;
  update();
}

// Montador: toca enquanto está aberto (para ouvir o compasso) e avisa cada batida.
export function previewRun(on, cb = null) {
  preview = !!on;
  onBeat = on ? cb : null;
  restart();
}
export const tickRunning = () => !!timer;
