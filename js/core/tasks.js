// Regras das tarefas: criar, concluir (com recompensa), repetir, agrupar e lembrar.
import { personal, P } from '../state.js';
import { PRIORITY_RANK, taskOpen, rewardFor, doneEventId, nextOccurrence, levelOf } from './model.js';
import { today, nowMs } from '../lib/clock.js';
import { addDays, fmtTime, relDay } from '../lib/util.js';

export const byPriority = (a, b) =>
  (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4) || (a.time || '99').localeCompare(b.time || '99') || (a.order ?? a._ca ?? 0) - (b.order ?? b._ca ?? 0);
export const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || byPriority(a, b);

// Grupos usados pelas telas. Tarefas de rotina ficam de fora até a fase de rotinas.
export function buckets(S, day = today()) {
  const open = S.task.filter((t) => taskOpen(t) && t.kind !== 'routine');
  return {
    overdue: open.filter((t) => t.due && t.due < day).sort(byDue),
    today: open.filter((t) => t.due === day).sort(byPriority),
    upcoming: open.filter((t) => t.due && t.due > day).sort(byDue),
    inbox: open.filter((t) => !t.due).sort(byPriority),
    doneToday: S.task.filter((t) => t.done && t.doneAt && isoLocal(t.doneAt) === day).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)),
  };
}
const isoLocal = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function addTask(fields) {
  const data = { kind: 'normal', priority: 'P4', ...fields, title: (fields.title || '').trim() };
  if (!data.title) return null;
  return personal.save('task', data);
}

export const updateTask = (id, fields) => personal.patch(id, fields);
export const removeTask = async (id) => {
  await personal.remove(id);
  if (personal.get(doneEventId(id))) await personal.remove(doneEventId(id));
};

// Conclui ou reabre. Devolve { done, reward, levelUp } para a tela animar.
export async function toggleTask(id) {
  const t = personal.get(id);
  if (!t) return null;
  const before = P().money.xp;
  if (!t.done) {
    const reward = t.failed ? { xp: 0, gold: 0 } : rewardFor(t);
    const day = today();
    const batch = [{ type: 'task', id, data: { ...strip(t), done: true, doneAt: nowMs() } }];
    if (reward.xp || reward.gold) batch.push({ type: 'ev', id: doneEventId(id), data: { kind: 'done', ref: id, date: day, xp: reward.xp, gold: reward.gold } });
    // Repetição: a próxima ocorrência tem id derivado da série e da data, então dois aparelhos
    // concluindo a mesma tarefa não criam duas cópias.
    if (t.recurrence && !t.nextGenerated) {
      const from = t.due && t.due > day ? t.due : t.due || day;
      const next = nextOccurrence(from, t.recurrence);
      if (next) {
        const series = t.series || t.id;
        batch[0].data.nextGenerated = true;
        const copy = { ...strip(t), series, due: next, subtasks: (t.subtasks || []).map((s) => ({ ...s, done: false })) };
        for (const k of ['done', 'doneAt', 'failed', 'archived', 'nextGenerated', 'postponed']) delete copy[k];
        batch.push({ type: 'task', id: `rc_${series}_${next}`, data: copy });
      }
    }
    await personal.saveMany(batch);
    const after = P().money.xp;
    return { done: true, reward, levelUp: levelOf(after) > levelOf(before) ? levelOf(after) : 0 };
  }
  const data = strip(t);
  delete data.done;
  delete data.doneAt;
  await personal.save('task', data, id);
  if (personal.get(doneEventId(id))) await personal.remove(doneEventId(id));
  return { done: false };
}

// Campos do registro sem os metadados de leitura (_by, _u...).
export function strip(view) {
  const o = {};
  for (const [k, v] of Object.entries(view)) if (k !== 'id' && !k.startsWith('_')) o[k] = v;
  return o;
}

/* ---------- Lembretes ---------- */
// Tudo o que deveria estar agendado agora (notify.reconcile compara e agenda só a diferença).
export function reminders(S, prefs) {
  const out = [];
  const projects = new Map(S.project.map((p) => [p.id, p.name]));
  if (prefs.tasks) {
    for (const t of S.task) {
      if (!taskOpen(t) || !t.due || !t.time) continue;
      const [y, m, d] = t.due.split('-').map(Number);
      const [hh, mm] = t.time.split(':').map(Number);
      const at = new Date(y, m - 1, d, hh, mm).getTime() - (t.remindBefore || 0) * 60000;
      const where = projects.get(t.projectId);
      out.push({ key: `task:${t.id}`, at, title: t.title, body: `${relDay(t.due)} às ${fmtTime(t.time)}${where ? ` · ${where}` : ''}`, route: `tarefa-${t.id}` });
    }
  }
  if (prefs.daily && prefs.dailyAt) {
    const [hh, mm] = prefs.dailyAt.split(':').map(Number);
    const day0 = today();
    for (let i = 0; i < 14; i++) {
      const day = addDays(day0, i);
      const [y, m, d] = day.split('-').map(Number);
      out.push({ key: `daily:${day}`, at: new Date(y, m - 1, d, hh, mm).getTime(), title: 'Como foi o seu dia?', body: 'Revise o que ficou pendente e deixe amanhã planejado.', route: 'hoje' });
    }
  }
  return out;
}
