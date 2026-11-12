// Alarmes de tela cheia: tarefas (com data e horário, repetidas ou não), rotinas e hábitos.
// O registro guarda só o toque escolhido (alarm: 'classico'...); hábitos guardam também o horário
// (alarmTime). Daqui sai a lista do que tocar e quando; quem toca é a plataforma:
//   Android  plugin LidaAlarm (AlarmManager + notificação de tela cheia, mesmo com o app fechado)
//   Linux/web  o próprio app (aberto ou na bandeja), numa tela por cima de tudo (views/alarm.js)
import { P, prefs } from '../state.js';
import { taskOpen, HABIT_DAYS_ALL } from './model.js';
import { addDays, weekday, hash32 } from '../lib/util.js';
import { today, nowMs } from '../lib/clock.js';

export const MAX_ALARMS = 10; // alarme é para o que não pode passar; mais que isso vira barulho

const L = (pt, en, es) => ({ pt, en, es });
export const TONES = {
  classico: { name: L('Despertador clássico', 'Classic alarm clock', 'Despertador clásico'), calm: false },
  digital: { name: L('Relógio digital', 'Digital clock', 'Reloj digital'), calm: false },
  sinos: { name: L('Sinos calmos', 'Calm bells', 'Campanas tranquilas'), calm: true },
  marimba: { name: L('Marimba', 'Marimba', 'Marimba'), calm: true },
  amanhecer: { name: L('Amanhecer', 'Sunrise', 'Amanecer'), calm: true },
  passaros: { name: L('Passarinhos', 'Birdsong', 'Pajaritos'), calm: true },
};
export const TONE_ORDER = Object.keys(TONES);
export const toneSrc = (id) => `sounds/alarms/${TONES[id] ? id : 'classico'}.ogg`;

// Preferências deste aparelho (Ajustes > Alarmes).
export const alarmStyle = () => (prefs().alarmStyle === 'amoled' ? 'amoled' : 'theme');
export const defaultTone = () => (TONES[prefs().alarmTone] ? prefs().alarmTone : 'classico');

const at = (day, hhmm) => {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = (hhmm || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
};

// Quem tem alarme ligado (conta para o limite). Tarefas: só as abertas.
export function withAlarm(S = P()) {
  const out = [];
  for (const t of S.task) if (t.alarm && t.kind !== 'routine' && taskOpen(t) && t.due && t.time) out.push({ kind: 'task', rec: t });
  for (const r of S.routine) if (r.alarm && r.time) out.push({ kind: 'routine', rec: r });
  for (const h of S.habit) if (h.alarm && h.alarmTime && !h.archived) out.push({ kind: 'habit', rec: h });
  return out;
}
export const alarmCount = (S = P(), exceptId = null) => withAlarm(S).filter((x) => x.rec.id !== exceptId).length;
export const canAddAlarm = (S = P(), exceptId = null) => alarmCount(S, exceptId) < MAX_ALARMS;

export const alarmId = (key) => (hash32(`alarm:${key}`) & 0x7fffffff) || 1;

// Próximos toques (até `days` dias). Rotina e hábito repetem nos dias deles (repeat = dias da semana).
export function upcoming(S = P(), { days = 7, from = nowMs() } = {}) {
  const out = [];
  const d0 = today();
  const push = (key, when, kind, ref, title, desc, tone, repeat, time) => {
    if (when <= from - 30000) return;
    out.push({ id: alarmId(key), key, at: when, kind, ref, title, desc: desc || '', tone: TONES[tone] ? tone : defaultTone(), repeat, time });
  };
  for (const { kind, rec } of withAlarm(S)) {
    if (kind === 'task') {
      push(`task:${rec.id}`, at(rec.due, rec.time), 'task', rec.id, rec.title, rec.notes, rec.alarm, null, rec.time);
      continue;
    }
    const time = kind === 'routine' ? rec.time : rec.alarmTime;
    const wd = kind === 'routine' ? rec.weekdays || HABIT_DAYS_ALL : rec.days || HABIT_DAYS_ALL;
    const desc = kind === 'routine' ? (rec.items || []).join(' · ') : rec.notes || '';
    // a próxima ocorrência (a nativa reagenda as seguintes sozinha)
    for (let i = 0; i <= days; i++) {
      const d = addDays(d0, i);
      if (!wd.includes(weekday(d))) continue;
      const when = at(d, time);
      if (when <= from - 30000) continue;
      push(`${kind}:${rec.id}`, when, kind, rec.id, rec.title, desc, rec.alarm, wd, time);
      break;
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
