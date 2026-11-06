// Regras das tarefas: tipos, criar, concluir (com recompensa), repetir, virada do dia,
// rotinas e lembretes.
import { personal, P } from '../state.js';
import { PRIORITY_RANK, taskOpen, doneEventId, nextOccurrence, HABIT_DAYS_ALL } from './model.js';
import { rewardFor, penaltyFor, priorityGate, commit, useItemEvent, ITEMS } from './game.js';
import { today, nowMs } from '../lib/clock.js';
import { addDays, fmtTime, relDay, daysBetween, weekday, uid } from '../lib/util.js';

export const byPriority = (a, b) =>
  (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4) || (a.time || '99').localeCompare(b.time || '99') || (a.order ?? a._ca ?? 0) - (b.order ?? b._ca ?? 0);
export const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || byPriority(a, b);

const isoLocal = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const doneDay = (t) => (t.doneAt ? isoLocal(t.doneAt) : null);

// Grupos usados pelas telas.
export function buckets(S, day = today()) {
  const open = S.task.filter(taskOpen);
  const sprint = open.find((t) => t.kind === 'sprint') || null;
  const rest = open.filter((t) => t.kind !== 'sprint');
  return {
    sprint,
    overdue: rest.filter((t) => t.due && t.due < day).sort(byDue),
    today: rest.filter((t) => t.due === day).sort((a, b) => kindRank(a) - kindRank(b) || byPriority(a, b)),
    upcoming: rest.filter((t) => t.due && t.due > day).sort(byDue),
    inbox: rest.filter((t) => !t.due).sort(byPriority),
    doneToday: S.task.filter((t) => t.done && doneDay(t) === day).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)),
    failedToday: S.task.filter((t) => t.failed && !t.done && t.due === addDays(day, -1)),
  };
}
// Desafio primeiro, rotinas por último.
const kindRank = (t) => (t.kind === 'challenge' ? 0 : t.kind === 'routine' ? 2 : 1);

/* ---------- Validação ao salvar ---------- */
// Devolve { ok, msg, consume: [itens a gastar] }.
export function checkTask(data, id = null, S = P()) {
  const d = today();
  const kind = data.kind || 'normal';
  const prev = id ? S.byId.get(id) : null;
  const consume = [];
  if (kind === 'challenge') {
    const other = S.task.find((t) => t.kind === 'challenge' && t.id !== id && (t.createdDay || isoLocal(t._ca || 0)) === d);
    if (other && prev?.kind !== 'challenge') return { ok: false, msg: `Você já tem um desafio hoje: "${other.title}".` };
  }
  if (kind === 'sprint') {
    const other = S.task.find((t) => t.kind === 'sprint' && taskOpen(t) && t.id !== id);
    if (other) return { ok: false, msg: `Termine o sprint "${other.title}" antes de começar outro.` };
    if (!data.due) return { ok: false, msg: 'Escolha a data de fim do sprint.' };
    if (!(data.subtasks || []).length) return { ok: false, msg: 'Um sprint precisa de pelo menos uma etapa.' };
  }
  if (kind === 'bonus' && prev?.kind !== 'bonus') {
    if (!(S.money.items.bonusTask > 0)) return { ok: false, msg: 'Você não tem Tarefas Bônus. Elas estão na Loja.', shop: true };
    consume.push('bonusTask');
  }
  // Limites de prioridade (só quando a prioridade sobe ou a tarefa é nova).
  if ((data.priority === 'P0' || data.priority === 'P1') && prev?.priority !== data.priority && (!data.due || data.due === d)) {
    const g = priorityGate(data.priority, S, id);
    if (!g.ok) return { ok: false, msg: `Até o nível ${g.unlock}, o limite é de ${g.cap === 1 ? 'uma tarefa' : `${g.cap} tarefas`} ${data.priority} abertas para hoje. Um item ${ITEMS[g.item].name} na Loja libera mais uma.`, shop: true };
    if (g.consume) consume.push(g.consume);
  }
  return { ok: true, consume };
}

export async function addTask(fields, consume = []) {
  const data = { kind: 'normal', priority: 'P4', ...fields, title: (fields.title || '').trim(), createdDay: today() };
  if (!data.title) return null;
  if (data.kind === 'challenge') data.due = today();
  const id = uid();
  await personal.saveMany([{ type: 'task', id, data }, ...consume.map((c) => useItemEvent(c, id))]);
  return id;
}

// Salva a edição contando adiamentos e rebaixamentos (entram na pontuação do dia).
export async function saveTask(id, data, consume = []) {
  const prev = personal.get(id);
  if (!prev) return;
  const next = { ...data };
  if (prev.due && next.due && next.due > prev.due && prev.createdDay && prev.createdDay < today()) next.postponed = (prev.postponed || 0) + 1;
  if ((PRIORITY_RANK[next.priority] ?? 4) > (PRIORITY_RANK[prev.priority] ?? 4)) next.reprioritized = (prev.reprioritized || 0) + 1;
  await personal.saveMany([{ type: 'task', id, data: next }, ...consume.map((c) => useItemEvent(c, id))]);
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
  if (!t.done) {
    const reward = t.failed ? { xp: 0, gold: 0, parts: [] } : rewardFor(t);
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
        const copy = { ...strip(t), series, due: next, createdDay: day, subtasks: (t.subtasks || []).map((s) => ({ ...s, done: false })) };
        for (const k of ['done', 'doneAt', 'failed', 'archived', 'nextGenerated', 'postponed', 'reprioritized', 'powerups']) delete copy[k];
        batch.push({ type: 'task', id: `rc_${series}_${next}`, data: copy });
      }
    }
    const res = await commit(batch);
    return { done: true, reward, ...res };
  }
  const data = strip(t);
  delete data.done;
  delete data.doneAt;
  await personal.save('task', data, id);
  if (personal.get(doneEventId(id))) await personal.remove(doneEventId(id));
  return { done: false };
}

// Marca uma etapa/subtarefa. Devolve a fração concluída (para o som de progresso).
export async function toggleSub(taskId, subId) {
  const t = personal.get(taskId);
  if (!t) return null;
  const subs = (t.subtasks || []).map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
  await personal.patch(taskId, { subtasks: subs });
  const done = subs.filter((s) => s.done).length;
  return { fraction: subs.length ? done / subs.length : 0, done: subs.find((s) => s.id === subId)?.done };
}

export function strip(view) {
  const o = {};
  for (const [k, v] of Object.entries(view)) if (k !== 'id' && !k.startsWith('_')) o[k] = v;
  return o;
}

/* ---------- Sprint ---------- */
export function sprintInfo(t, day = today()) {
  const start = t.start || t.createdDay || isoLocal(t._ca || nowMs());
  const total = Math.max(1, daysBetween(start, t.due));
  const elapsed = Math.min(total, Math.max(0, daysBetween(start, day)));
  const subs = t.subtasks || [];
  const done = subs.filter((s) => s.done).length;
  return { start, total, elapsed, left: Math.max(0, daysBetween(day, t.due)), time: elapsed / total, steps: subs.length ? done / subs.length : 0, done, count: subs.length };
}

/* ---------- Rotinas ---------- */
export const routineTaskId = (routineId, day) => `rt_${routineId}_${day}`;

function routineTask(r, day) {
  return {
    title: r.title,
    kind: 'routine',
    priority: 'P4',
    due: day,
    routineId: r.id,
    color: r.color,
    createdDay: day,
    subtasks: (r.items || []).map((title, i) => ({ id: `i${i}`, title, done: false })),
  };
}

// Cria a tarefa de hoje de uma rotina (se for dia dela e ainda não existir ou tiver sido excluída).
export function routineBatch(S, day) {
  const wd = weekday(day);
  const out = [];
  for (const r of S.routine) {
    if (!(r.weekdays || HABIT_DAYS_ALL).includes(wd)) continue;
    const id = routineTaskId(r.id, day);
    if (personal.raw(id)) continue;
    out.push({ type: 'task', id, data: routineTask(r, day) });
  }
  return out;
}

/* ---------- Virada do dia ---------- */
const SCORE_VALUE = { P0: 5, P1: 4, P2: 3, P3: 2, P4: 1 };
const FAIL_SCORE = { P0: 8, P1: 6, P2: 4, P3: 2, P4: 1 };
const MAX_DAYS = 30;

// Fecha os dias entre o último processado e hoje: tarefas vencidas falham (com punição, se ligada),
// rotinas não feitas são arquivadas, cada dia ganha uma pontuação e as rotinas de hoje são criadas.
// É idempotente: ids derivados (ev_fail_<tarefa>, sc_<dia>, rt_<rotina>_<dia>) evitam duplicar
// quando dois aparelhos processam o mesmo dia.
export async function processDays() {
  const S = P();
  const d = today();
  const last = S.prefs.lastDay;
  const batch = [];
  const summary = { days: 0, failed: [], penalty: { xp: 0, gold: 0 }, archived: 0 };

  // Conserto: tarefa concluída em outro aparelho e marcada como falha aqui antes da sincronização.
  // Só quando foi concluída até o dia do prazo (concluir depois de vencer não devolve a punição).
  for (const t of S.task) {
    if (t.done && t.failed && t.due && doneDay(t) <= t.due) {
      const data = strip(t);
      delete data.failed;
      batch.push({ type: 'task', id: t.id, data });
      if (personal.get(`ev_fail_${t.id}`)) await personal.remove(`ev_fail_${t.id}`);
    }
  }

  if (last && last < d) {
    let day = last < addDays(d, -MAX_DAYS) ? addDays(d, -MAX_DAYS) : last;
    const running = { xp: S.money.xp, gold: S.money.gold, level: S.money.level };
    const punish = S.prefs.punishments !== false;
    const daysOff = S.prefs.daysOff || [];
    while (day < d) {
      let score = 50;
      let tasksDone = 0;
      let penalties = 0;
      for (const t of S.task) {
        if (t.done || t.failed || t.archived || t.due !== day) continue;
        if (t.kind === 'routine') {
          batch.push({ type: 'task', id: t.id, data: { ...strip(t), archived: true } });
          summary.archived++;
          continue;
        }
        batch.push({ type: 'task', id: t.id, data: { ...strip(t), failed: true } });
        summary.failed.push(t);
        penalties++;
        score -= FAIL_SCORE[t.priority] || 1;
        if (punish && t.kind !== 'bonus' && !personal.get(`ev_fail_${t.id}`)) {
          const p = penaltyFor(t, { money: running });
          if (p.xp || p.gold) {
            running.xp += p.xp;
            running.gold += p.gold;
            summary.penalty.xp += p.xp;
            summary.penalty.gold += p.gold;
            batch.push({ type: 'ev', id: `ev_fail_${t.id}`, data: { kind: 'fail', ref: t.id, date: day, xp: p.xp, gold: p.gold } });
          }
        }
      }
      for (const t of S.task) {
        if (!t.done || doneDay(t) !== day) continue;
        tasksDone++;
        let pts = SCORE_VALUE[t.priority] || 1;
        const took = t.createdDay ? daysBetween(t.createdDay, day) : 0;
        if (t.priority === 'P0' && took > 2) pts = Math.max(1, pts - 2);
        if (t.priority === 'P4' && took === 0) pts += 1;
        if (t.postponed) {
          pts -= t.postponed * 2;
          penalties++;
        }
        score += pts;
      }
      const hab = habitsOnDay(S, day);
      score += hab.done * 3 - hab.missed * 2;
      penalties += hab.missed;
      if (daysOff.includes(weekday(day)) && (tasksDone || hab.done)) score += 10;
      batch.push({ type: 'score', id: `sc_${day}`, data: { date: day, score: Math.max(0, Math.min(100, score)), tasksDone, habitsDone: hab.done, penalties } });
      summary.days++;
      day = addDays(day, 1);
    }
  }

  batch.push(...routineBatch(S, d));
  if (last !== d) batch.push({ type: 'prefs', id: 'prefs', data: { ...strip(personal.get('prefs') || {}), lastDay: d } });
  if (batch.length) await personal.saveMany(batch);
  return summary;
}

// Hábitos feitos e perdidos num dia (perdido = era dia do hábito, não bateu a meta e não estava protegido).
export function habitsOnDay(S, day) {
  let done = 0;
  let missed = 0;
  const wd = weekday(day);
  for (const h of S.habit) {
    if (h.archived || (h.createdDay && h.createdDay > day)) continue;
    if (!(h.days || HABIT_DAYS_ALL).includes(wd)) continue;
    const log = S.hlogMap.get(`${h.id}|${day}`);
    if ((log?.count || 0) >= (h.goal || 1)) done++;
    else if (!log?.mod) missed++;
  }
  return { done, missed };
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
