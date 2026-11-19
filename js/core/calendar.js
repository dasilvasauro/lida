// Calendário: o que aparece em cada dia (tarefas, repetições previstas, rotinas, hábitos e eventos das
// agendas externas). Sem tela aqui: a tela fica em views/calendar.js.
//
// Repetições: a tarefa repetida existe uma vez (a ocorrência atual); as próximas são "previstas",
// calculadas com a mesma regra (nextOccurrence) e mostradas esmaecidas. As muito frequentes (todo dia,
// dias úteis, 5+ dias da semana) não enchem o mês: ali viram uma faixa resumida ("Todo dia: Ler").
// Na linha do tempo (dia e semana) todas aparecem. Hábitos viram um contador por dia (feitos/total).
import { nextOccurrence, taskOpen, HABIT_DAYS_ALL } from './model.js';
import { addDays, weekday, isoOfMs, pad } from '../lib/util.js';

export const DAY_MS = 86400000;

// Muito frequente? (fica fora das células do mês)
export function frequent(rec) {
  if (!rec || !rec.type || rec.type === 'none') return false;
  const every = Math.max(1, rec.every || 1);
  if (rec.type === 'daily') return every === 1;
  if (rec.type === 'weekly') return every === 1 && (rec.weekdays || []).length >= 5;
  return false;
}
export function freqLabel(rec) {
  if (rec?.type === 'weekly' && (rec.weekdays || []).length === 5 && [...rec.weekdays].sort().join() === '1,2,3,4,5') return 'weekdays';
  return 'daily';
}

// Grade do mês (semanas de domingo a sábado) para "AAAA-MM"
export function monthGrid(ym, weekStart = 0) {
  const [y, m] = ym.split('-').map(Number);
  const first = `${ym}-01`;
  const lead = (weekday(first) - weekStart + 7) % 7;
  const start = addDays(first, -lead);
  const last = new Date(y, m, 0).getDate();
  const weeks = Math.ceil((lead + last) / 7);
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)));
}
export function weekDays(day, weekStart = 0) {
  const s = addDays(day, -((weekday(day) - weekStart + 7) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

const minutesOf = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  return m ? +m[1] * 60 + +m[2] : null;
};

// Tudo o que cai entre a e b (inclusive), em um Map dia → [item].
//   item: { kind: 'task'|'ghost'|'routine'|'event', id, title, day, min (minutos do dia ou null),
//           dur (minutos), done, late, p, color, ref (tarefa/rotina), freq (repetição frequente) }
// events: eventos externos já normalizados ({ id, title, allDay, date, endDate, start, end, color, src })
export function itemsBetween(S, a, b, { today, projectId = null, events = [] } = {}) {
  const map = new Map();
  const add = (day, it) => {
    if (day < a || day > b) return;
    if (!map.has(day)) map.set(day, []);
    map.get(day).push({ day, ...it });
  };
  const tasks = S.task.filter((t) => !t.deleted && t.kind !== 'routine' && t.kind !== 'sprint' && (!projectId || t.projectId === projectId));
  for (const t of tasks) {
    const open = taskOpen(t);
    const p = t.priority || 'P4';
    const base = { title: t.title, min: minutesOf(t.time), dur: t.duration || 30, p, ref: t.id, color: null };
    if (t.due) {
      if (open || t.done) add(t.due, { ...base, kind: 'task', id: t.id, done: !!t.done, late: open && t.due < today, freq: frequent(t.recurrence) });
    } else if (t.done && t.doneAt) {
      // sem data, mas concluída: aparece no dia em que foi feita
      add(isoOfMs(t.doneAt), { ...base, kind: 'task', id: t.id, done: true });
    }
    // repetições previstas depois da ocorrência atual
    if (t.recurrence && t.due && open && !t.nextGenerated) {
      const series = t.series || t.id;
      let d = t.due;
      for (let i = 0; i < 400; i++) {
        d = nextOccurrence(d, t.recurrence);
        if (!d || d > b) break;
        if (d < a || d <= today) continue;
        if (S.byId.get(`rc_${series}_${d}`)) continue;
        add(d, { ...base, kind: 'ghost', id: `${t.id}@${d}`, done: false, freq: frequent(t.recurrence), freqKind: freqLabel(t.recurrence) });
      }
    }
  }
  // rotinas: a de hoje é uma tarefa (aparece como tarefa da rotina); as próximas são previstas
  for (const r of S.routine || []) {
    const days = r.weekdays || HABIT_DAYS_ALL;
    const rec = { type: 'weekly', weekdays: days };
    for (let d = a; d <= b; d = addDays(d, 1)) {
      if (!days.includes(weekday(d))) continue;
      const inst = S.byId.get(`rt_${r.id}_${d}`) || S.task.find((t) => t.kind === 'routine' && t.routineId === r.id && t.due === d);
      if (d < today && !inst) continue;
      add(d, { kind: 'routine', id: inst?.id || `${r.id}@${d}`, title: r.title, min: minutesOf(r.alarmTime || r.time), dur: 20, done: !!inst?.done, ghost: !inst, ref: inst?.id || null, routine: r.id, color: r.color || null, freq: frequent(rec) || days.length >= 5, freqKind: days.length === 7 ? 'daily' : freqLabel(rec) });
    }
  }
  for (const e of events) {
    if (e.allDay) {
      for (let d = e.date; d <= (e.endDate || e.date) && d <= b; d = addDays(d, 1)) add(d, { kind: 'event', id: `${e.id}|${d}`, ev: e, title: e.title, min: null, dur: 0, color: e.color });
    } else {
      const d0 = isoOfMs(e.start);
      const d1 = isoOfMs(Math.max(e.start, e.end - 1));
      for (let d = d0; d <= d1 && d <= b; d = addDays(d, 1)) {
        const dayStart = new Date(`${d}T00:00`).getTime();
        const s = Math.max(e.start, dayStart);
        const en = Math.min(e.end, dayStart + DAY_MS);
        const min = Math.round((s - dayStart) / 60000);
        add(d, { kind: 'event', id: `${e.id}|${d}`, ev: e, title: e.title, min, dur: Math.max(15, Math.round((en - s) / 60000)), color: e.color });
      }
    }
  }
  const rank = { event: 0, task: 1, routine: 2, ghost: 3 };
  for (const list of map.values()) list.sort((x, y) => (x.min ?? -1) - (y.min ?? -1) || (x.done ? 1 : 0) - (y.done ? 1 : 0) || rank[x.kind] - rank[y.kind] || String(x.p).localeCompare(String(y.p)));
  return map;
}

// Hábitos do dia: { total, done, list: [{ h, done, count }] } (no futuro, done = 0)
export function habitsDay(S, day, today) {
  const list = [];
  for (const h of S.habit) {
    if (h.archived || (h.createdDay && h.createdDay > day)) continue;
    if (!(h.days || HABIT_DAYS_ALL).includes(weekday(day))) continue;
    const log = S.hlogMap.get(`${h.id}|${day}`);
    const count = log?.count || 0;
    list.push({ h, count, done: day <= today && count >= (h.goal || 1), mod: log?.mod || null });
  }
  return { total: list.length, done: list.filter((x) => x.done).length, list };
}

// Itens frequentes para a faixa do mês: { daily: [títulos], weekdays: [títulos] }
export function frequentSummary(map) {
  const out = { daily: new Map(), weekdays: new Map() };
  for (const list of map.values())
    for (const it of list) {
      if (!it.freq) continue;
      const key = it.kind === 'routine' ? `r:${it.routine}` : `t:${it.ref}`;
      out[it.freqKind === 'weekdays' ? 'weekdays' : 'daily'].set(key, it.title);
    }
  return { daily: [...out.daily.values()], weekdays: [...out.weekdays.values()] };
}

// Lanes para a linha do tempo: itens com horário que se sobrepõem dividem a largura.
// Devolve [{ it, lane, lanes }]
export function layoutDay(items) {
  const timed = items.filter((x) => x.min != null).map((it) => ({ it, s: it.min, e: it.min + Math.max(20, it.dur || 30) })).sort((x, y) => x.s - y.s || y.e - x.e);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    for (const c of cluster) {
      let l = lanes.findIndex((end) => end <= c.s);
      if (l < 0) {
        l = lanes.length;
        lanes.push(c.e);
      } else lanes[l] = c.e;
      c.lane = l;
    }
    for (const c of cluster) out.push({ it: c.it, lane: c.lane, lanes: lanes.length, s: c.s, e: c.e });
    cluster = [];
  };
  for (const c of timed) {
    if (cluster.length && c.s >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    cluster.push(c);
    clusterEnd = Math.max(clusterEnd, c.e);
  }
  if (cluster.length) flush();
  return out;
}

export const hhmm = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
