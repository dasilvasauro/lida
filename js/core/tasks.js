// Regras das tarefas: tipos, criar, concluir (com recompensa), repetir, virada do dia,
// rotinas e lembretes.
import { personal, P } from '../state.js';
import { PRIORITY_RANK, taskOpen, doneEventId, nextOccurrence, HABIT_DAYS_ALL } from './model.js';
import { rewardFor, penaltyFor, priorityGate, commit, useItemEvent, ITEMS } from './game.js';
import { today, nowMs } from '../lib/clock.js';
import { addDays, daysBetween, weekday, uid, ymOf, addMonths } from '../lib/util.js';
import { dayIPL, grade } from './ipl.js';

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

// Salva a edição contando adiamentos e rebaixamentos (entram no planejamento do IPL).
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
const MAX_DAYS = 30;

// Fecha os dias entre o último processado e hoje: tarefas vencidas falham (com punição, se ligada),
// rotinas não feitas são arquivadas, cada dia ganha uma nota no IPL e as rotinas de hoje são criadas.
// É idempotente: ids derivados (ev_fail_<tarefa>, sc_<dia>, rt_<rotina>_<dia>) evitam duplicar
// quando dois aparelhos processam o mesmo dia.
export async function processDays() {
  const S = P();
  const d = today();
  const last = S.prefs.lastDay;
  const batch = [];
  const summary = { days: 0, closed: [], months: [], failed: [], penalty: { xp: 0, gold: 0 }, archived: 0 };
  const fresh = new Map(); // notas fechadas agora (ainda não estão na fotografia)

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
    // Congelamento Automático: protege, no fechamento do dia, os hábitos em sequência que ficaram
    // por fazer. Um item salva todos os hábitos daquele dia. A vista abaixo enxerga as proteções
    // feitas agora (ainda fora da fotografia), para o IPL e para os dias seguintes.
    const view = { ...S, hlogMap: new Map(S.hlogMap) };
    let autoLeft = S.money.items.autoFreeze || 0;
    while (day < d) {
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
        if (t.postponed) penalties++;
      }
      if (autoLeft > 0 && !personal.get(`ev_af_${day}`)) {
        const saved = autoFreezeTargets(view, day);
        if (saved.length) {
          autoLeft--;
          batch.push({ type: 'ev', id: `ev_af_${day}`, data: { kind: 'use', ref: `autoFreeze:${day}`, date: day, items: { autoFreeze: -1 } } });
          for (const h of saved) {
            const prev = view.hlogMap.get(`${h.id}|${day}`);
            const data = { habitId: h.id, date: day, count: prev?.count || 0, mod: 'autoFreeze' };
            batch.push({ type: 'hlog', id: `hl_${h.id}_${day}`, data });
            view.hlogMap.set(`${h.id}|${day}`, { id: `hl_${h.id}_${day}`, ...data });
          }
          summary.autoFreeze = [...(summary.autoFreeze || []), { day, habits: saved.map((h) => h.name) }];
        }
      }
      const hab = habitsOnDay(view, day);
      penalties += hab.missed;
      // IPL do dia (ver core/ipl.js): partes ponderadas, só as que se aplicam ao seu uso.
      const ipl = dayIPL(view, day);
      const rec = { date: day, score: ipl.score, parts: ipl.parts, v: 2, tasksDone, habitsDone: hab.done, habitsTotal: hab.done + hab.missed, penalties, off: ipl.off || undefined };
      if (!personal.get(`sc_${day}`)) {
        batch.push({ type: 'score', id: `sc_${day}`, data: rec });
        fresh.set(day, rec);
      }
      summary.closed.push(day);
      summary.days++;
      day = addDays(day, 1);
    }
    // Virada do mês: fecha os meses que terminaram (média do IPL e os números do mês).
    const freshMonths = new Map();
    for (let ym = ymOf(last); ym < ymOf(d); ym = addMonths(ym, 1)) {
      if (personal.get(`mo_${ym}`)) continue;
      const rec = monthRecord(S, ym, fresh);
      if (!rec) continue;
      batch.push({ type: 'month', id: `mo_${ym}`, data: rec });
      freshMonths.set(ym, rec);
      summary.months.push(ym);
    }
    // Virada do ano: o resumão, com o IPL do ano pela média dos meses.
    for (let y = Number(last.slice(0, 4)); y < Number(d.slice(0, 4)); y++) {
      if (personal.get(`yr_${y}`)) continue;
      const rec = yearRecord(S, y, freshMonths, fresh);
      if (!rec) continue;
      batch.push({ type: 'year', id: `yr_${y}`, data: rec });
      (summary.years ||= []).push(y);
    }
  }

  batch.push(...routineBatch(S, d));
  if (last !== d) batch.push({ type: 'prefs', id: 'prefs', data: { ...strip(personal.get('prefs') || {}), lastDay: d } });
  if (batch.length) await personal.saveMany(batch);
  return summary;
}

// Fechamento de um mês: IPL médio, melhor dia e os totais.
export function monthRecord(S, ym, fresh = new Map()) {
  const byDay = new Map(S.score.filter((x) => x.date && ymOf(x.date) === ym).map((x) => [x.date, x]));
  for (const [k, v] of fresh) if (ymOf(k) === ym) byDay.set(k, v);
  const scored = [...byDay.values()].filter((x) => x.score != null);
  const evs = S.ev.filter((e) => e.date && ymOf(e.date) === ym && e.kind !== 'import');
  const tasksDone = S.task.filter((t) => t.done && t.doneAt && ymOf(doneDay(t)) === ym).length;
  if (!scored.length && !tasksDone && !evs.length) return null;
  const score = scored.length ? Math.round(scored.reduce((a, x) => a + x.score, 0) / scored.length) : null;
  const best = scored.reduce((a, x) => (!a || x.score > a.score ? x : a), null);
  let hd = 0;
  let ht = 0;
  for (const x of byDay.values()) {
    hd += x.habitsDone || 0;
    ht += x.habitsTotal ?? x.habitsDone ?? 0;
  }
  const pos = (k) => evs.reduce((a, e) => a + Math.max(0, e[k] || 0), 0);
  const neg = (k) => evs.reduce((a, e) => a + Math.min(0, e[k] || 0), 0);
  return {
    month: ym,
    score,
    grade: score == null ? null : grade(score),
    days: scored.length,
    tasksDone,
    failed: S.task.filter((t) => t.failed && t.due && ymOf(t.due) === ym).length,
    habitsDone: hd,
    habitsTotal: ht,
    xp: pos('xp'),
    xpLost: neg('xp'),
    gold: pos('gold'),
    goldLost: neg('gold'),
    focusSec: evs.filter((e) => e.kind === 'focus').reduce((a, e) => a + (e.focusSec || 0), 0),
    best: best ? { date: best.date, score: best.score } : null,
  };
}

// Hábitos programados para o dia, não cumpridos nem protegidos, que vinham numa sequência
// (o dia programado anterior foi cumprido ou protegido). São os que o Congelamento Automático salva.
export function autoFreezeTargets(S, day) {
  const out = [];
  const done = (h, d) => {
    const l = S.hlogMap.get(`${h.id}|${d}`);
    return (l?.count || 0) >= (h.goal || 1) || !!l?.mod;
  };
  for (const h of S.habit) {
    if (h.archived || (h.createdDay && h.createdDay > day)) continue;
    const days = h.days || HABIT_DAYS_ALL;
    if (!days.includes(weekday(day)) || done(h, day)) continue;
    for (let i = 1; i <= 7; i++) {
      const p = addDays(day, -i);
      if (h.createdDay && p < h.createdDay) break;
      if (!days.includes(weekday(p))) continue;
      if (done(h, p)) out.push(h);
      break;
    }
  }
  return out;
}

// Resumo do ano: soma dos meses e o IPL do ano como a média das notas dos meses (cada mês pesa
// igual, tenha 10 ou 31 dias avaliados). Meses ainda sem registro são calculados na hora.
export function yearRecord(S, year, freshMonths = new Map(), fresh = new Map()) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, '0')}`;
    const rec = freshMonths.get(ym) || S.month.find((x) => x.month === ym && x.days != null) || S.month.find((x) => x.month === ym) || monthRecord(S, ym, fresh);
    if (rec) months.push({ ...rec, month: ym });
  }
  if (!months.length) return null;
  const scored = months.filter((x) => x.score != null);
  const score = scored.length ? Math.round(scored.reduce((a, x) => a + x.score, 0) / scored.length) : null;
  const add = (k) => months.reduce((a, x) => a + (x[k] || 0), 0);
  const top = (arr, f) => arr.reduce((a, x) => (!a || f(x) > f(a) ? x : a), null);
  const bestMonth = top(scored, (x) => x.score);
  const worstMonth = top(scored, (x) => -x.score);
  const bestDay = top(months.filter((x) => x.best), (x) => x.best.score)?.best || null;
  return {
    year,
    score,
    grade: score == null ? null : grade(score),
    months: months.map((x) => ({ month: x.month, score: x.score ?? null, grade: x.grade || (x.score != null ? grade(x.score) : null), tasksDone: x.tasksDone || 0 })),
    days: add('days'),
    tasksDone: add('tasksDone'),
    failed: add('failed'),
    habitsDone: add('habitsDone'),
    habitsTotal: add('habitsTotal'),
    xp: add('xp'),
    xpLost: add('xpLost'),
    gold: add('gold'),
    goldLost: add('goldLost'),
    focusSec: add('focusSec'),
    bestMonth: bestMonth ? { month: bestMonth.month, score: bestMonth.score } : null,
    worstMonth: worstMonth && worstMonth !== bestMonth ? { month: worstMonth.month, score: worstMonth.score } : null,
    bestDay,
  };
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
