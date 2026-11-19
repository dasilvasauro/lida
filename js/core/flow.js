// Flow: foco imersivo em fila. Uma tarefa por vez, em tela cheia; concluiu, a próxima aparece.
// ("Flow" é nome próprio do modo: não se traduz.)
//
// O estado fica dentro do registro sincronizado do foco (focus.flow), então o celular, o computador,
// o widget do KDE e a CLI enxergam o mesmo Flow. Aqui só há regras puras (fila, ordem, horários,
// tempo e resumo); a tela fica em views/flow.js.
//
//   flow = { id, startedAt, startMin, order, sched, tick, pomo, activity,
//            queue: [ids] (a primeira é a atual), curSince, done: [ids], skipped: [ids], fired: [ids],
//            paused, pausedAt, pausedMs, total }
import { PRIORITY_RANK, taskOpen } from './model.js';

export const FLOW_ORDERS = ['priority', 'created', 'custom'];
// O que fazer quando chega o horário de uma tarefa da fila (escolhido antes de começar):
//   warn: conta 10 s e troca (a atual volta para o topo) · auto: troca na hora · wait: entra depois da atual
export const FLOW_SCHED = ['warn', 'auto', 'wait'];
export const WARN_SEC = 10;

const minutesOf = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  return m ? +m[1] * 60 + +m[2] : null;
};
export const dayMin = (ms) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};

// Horário marcado para hoje (tarefa com hora; rotina com alarme), em minutos do dia, ou null.
export function schedMin(S, t, day) {
  if (!t || t.due !== day) return null;
  if (t.kind === 'routine') {
    const r = S.byId.get(t.routineId);
    return minutesOf(r?.alarmTime || r?.time);
  }
  return minutesOf(t.time);
}

const usable = (t) => t && !t.deleted && taskOpen(t) && t.kind !== 'sprint';

// Fila sugerida: hoje + atrasadas + rotinas de hoje. "Mais" = entrada e próximos dias (para adicionar).
export function flowCandidates(S, day) {
  const open = S.task.filter(usable);
  const queue = open.filter((t) => t.due && t.due <= day && (t.kind !== 'routine' || t.due === day));
  const inbox = open.filter((t) => !t.due && t.kind !== 'routine');
  const later = open.filter((t) => t.due && t.due > day && t.kind !== 'routine').sort((a, b) => a.due.localeCompare(b.due) || (a.time || '99').localeCompare(b.time || '99'));
  return { queue, inbox, later };
}

const created = (t) => t._ca || t.createdAt || 0;

// Ordena as tarefas: prioridade (e horário), data de criação ou a ordem escolhida (ids).
export function orderFlow(list, order, ids = []) {
  const arr = [...list];
  if (order === 'custom') {
    const pos = new Map(ids.map((id, i) => [id, i]));
    return arr.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9) || created(a) - created(b));
  }
  if (order === 'created') return arr.sort((a, b) => created(a) - created(b) || String(a.id).localeCompare(String(b.id)));
  return arr.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4) || (a.due || '9').localeCompare(b.due || '9') || (a.time || '99').localeCompare(b.time || '99') || created(a) - created(b));
}

export function newFlow({ ids, order = 'priority', sched = 'warn', tick = false, pomo = false, activity = true }, now) {
  return { id: now, startedAt: now, startMin: dayMin(now), order, sched, tick: !!tick, pomo: !!pomo, activity: activity !== false, queue: [...ids], curSince: now, done: [], skipped: [], fired: [], paused: false, pausedAt: null, pausedMs: 0, total: ids.length };
}

export const flowActive = (f) => !!(f && f.id && !f.endedAt);
export const flowCur = (f) => (flowActive(f) ? f.queue[0] || null : null);

// Tempo de Flow (sem as pausas), em ms
export function flowElapsed(f, now) {
  if (!f) return 0;
  const end = f.endedAt || now;
  const pause = (f.pausedMs || 0) + (f.paused && f.pausedAt ? end - f.pausedAt : 0);
  return Math.max(0, end - f.startedAt - pause);
}
// Tempo na tarefa atual (sem as pausas)
export const curElapsed = (f, now) => Math.max(0, (f.paused && f.pausedAt ? f.pausedAt : now) - (f.curSince || now));

// Tira da fila as tarefas que não existem mais ou já foram concluídas fora do Flow.
export function cleanFlow(f, S, now) {
  const keep = f.queue.filter((id) => usable(S.byId.get(id)));
  if (keep.length === f.queue.length) return f;
  const gone = f.queue.filter((id) => !keep.includes(id));
  // concluída em outro lugar (widget, CLI, outra tela) também conta para o Flow
  const doneElsewhere = gone.filter((id) => S.byId.get(id)?.done && !f.done.includes(id));
  return { ...f, queue: keep, done: [...f.done, ...doneElsewhere], curSince: keep[0] !== f.queue[0] ? now : f.curSince };
}

// Concluiu (done) ou pulou (skip) a atual: a próxima entra. Pular manda para o fim da fila.
export function advance(f, how, now) {
  const [cur, ...rest] = f.queue;
  if (!cur) return f;
  if (how === 'done') return { ...f, queue: rest, done: [...f.done, cur], curSince: now };
  if (how === 'remove') return { ...f, queue: rest, curSince: now, total: Math.max(0, f.total - 1) };
  // pular: vai para o fim (se for a única, fica)
  if (!rest.length) return f;
  return { ...f, queue: [...rest, cur], skipped: f.skipped.includes(cur) ? f.skipped : [...f.skipped, cur], curSince: now };
}

// Chegou a hora de `id`: na frente (a atual volta para o topo do resto) ou logo depois da atual.
export function promote(f, id, where, now) {
  const fired = f.fired.includes(id) ? f.fired : [...f.fired, id];
  if (!f.queue.includes(id) || f.queue[0] === id) return { ...f, fired };
  const rest = f.queue.filter((x) => x !== id);
  if (where === 'wait') return { ...f, fired, queue: [rest[0], id, ...rest.slice(1)] };
  return { ...f, fired, queue: [id, ...rest], curSince: now };
}

// Tarefa da fila (que não é a atual) cujo horário chegou agora e ainda não foi tratado.
// Só valem horários depois do começo do Flow: o que já tinha passado segue a ordem da fila.
export function dueNow(f, S, day, now) {
  if (!flowActive(f) || f.paused) return null;
  const m = dayMin(now);
  let best = null;
  for (const id of f.queue.slice(1)) {
    if (f.fired.includes(id)) continue;
    const sm = schedMin(S, S.byId.get(id), day);
    if (sm == null || sm > m || sm < f.startMin) continue;
    if (!best || sm < best.min) best = { id, min: sm };
  }
  return best;
}

export function pauseFlow(f, now) {
  return f.paused ? f : { ...f, paused: true, pausedAt: now };
}
export function resumeFlow(f, now) {
  if (!f.paused) return f;
  const d = now - (f.pausedAt || now);
  return { ...f, paused: false, pausedAt: null, pausedMs: (f.pausedMs || 0) + d, curSince: (f.curSince || now) + d, pauses: (f.pauses || 0) + 1 };
}

export function endFlow(f, now) {
  const g = f.paused ? resumeFlow(f, now) : f;
  return { ...g, endedAt: now };
}

// Registro do Flow encerrado (para as conquistas e o histórico)
export function flowRecord(f, day, now) {
  const sec = Math.round(flowElapsed(f, now) / 1000);
  return { kind: 'flow', date: day, done: f.done.length, skipped: f.skipped.filter((id) => !f.done.includes(id)).length, total: f.total, sec, cleared: f.queue.length === 0 && f.done.length > 0, pauses: f.pauses || 0 };
}

// Resumo para o widget, a CLI e a notificação.
export function flowSummary(S, f, now) {
  if (!flowActive(f)) return null;
  const cur = S.byId.get(flowCur(f));
  return {
    active: true,
    paused: !!f.paused,
    startedAt: f.startedAt,
    elapsedSec: Math.round(flowElapsed(f, now) / 1000),
    done: f.done.length,
    left: f.queue.length,
    total: f.done.length + f.queue.length,
    order: f.order,
    cur: cur ? { id: cur.id, title: cur.title, kind: cur.kind || 'normal', priority: cur.priority || 'P4' } : null,
    next: f.queue.slice(1, 4).map((id) => S.byId.get(id)?.title).filter(Boolean),
  };
}

// Números para as conquistas
export function flowStats(S) {
  const list = S.ev.filter((e) => e.kind === 'flow' && (e.done || 0) > 0);
  return {
    flows: list.length,
    flowBest: Math.max(0, ...list.map((e) => e.done || 0)),
    flowCleared: list.filter((e) => e.cleared && (e.done || 0) >= 3).length,
    flowH: Math.floor(list.reduce((n, e) => n + (e.sec || 0), 0) / 3600),
  };
}
