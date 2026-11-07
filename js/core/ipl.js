// IPL — Índice de Produtividade do Lida (0 a 100).
//
// Não é uma contagem de tarefas. O dia é avaliado por partes, e cada parte só entra na conta se fizer
// sentido para o jeito como você usa o Lida: quem não usa projetos não perde pontos por não ter
// projetos; quem não usa o Pomodoro não perde pontos de foco. As partes que valem no dia são
// combinadas pelos seus pesos e o resultado é reescalado para 0–100.
//
// Funções puras: recebem a fotografia (P()) e um dia, devolvem o índice e as partes.
import { HABIT_DAYS_ALL } from './model.js';
import { addDays, daysBetween, weekday, sum, isoOfMs, ymOf } from '../lib/util.js';

export const IPL_PARTS = [
  { k: 'exec', name: 'Execução', w: 30, how: 'Tarefas com prazo no dia que você concluiu a tempo, com peso pela prioridade (P0 vale 5×, P4 vale 1×). O que você adianta ou recupera de outros dias soma um pouco a mais.' },
  { k: 'habits', name: 'Hábitos e rotinas', w: 25, how: 'Quanto da meta de cada hábito programado você cumpriu (meia meta conta meio), os passos das rotinas do dia e a meta de água, se você registra água.' },
  { k: 'steady', name: 'Constância', w: 15, how: 'Em quantos dos últimos 7 dias você fez alguma coisa. Os dias de folga não são cobrados.' },
  { k: 'proj', name: 'Projetos e sprints', w: 15, how: 'Se os sprints andam no ritmo do calendário (etapas feitas × tempo que passou) e se os projetos com prazo por perto tiveram alguma tarefa concluída na semana.' },
  { k: 'plan', name: 'Planejamento', w: 10, how: 'Se o dia foi planejado com realismo: poucas tarefas adiadas e uma carga perto do que você costuma dar conta.' },
  { k: 'focus', name: 'Foco', w: 5, how: 'Minutos de Pomodoro no dia (50 minutos valem o máximo). Só conta se você usou o Pomodoro no último mês.' },
];
const W = Object.fromEntries(IPL_PARTS.map((p) => [p.k, p.w]));
const PRIO = { P0: 5, P1: 4, P2: 3, P3: 2, P4: 1 };
const pw = (t) => PRIO[t.priority] || 2;
const doneOn = (t) => (t.doneAt ? isoOfMs(t.doneAt) : null);
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const isTask = (t) => !t.archived && t.kind !== 'routine' && t.kind !== 'sprint';

/* ---------- Partes ---------- */
function execution(S, day, off, live) {
  const planned = S.task.filter((t) => isTask(t) && t.kind !== 'bonus' && t.due === day);
  const plannedW = sum(planned, pw);
  const onTime = planned.filter((t) => t.done && doneOn(t) <= day);
  const doneW = sum(onTime, pw);
  // Fora do plano do dia: adiantadas, recuperadas (atrasadas), da caixa de entrada e bônus.
  const extra = S.task.filter((t) => isTask(t) && t.done && doneOn(t) === day && t.due !== day);
  const extraW = sum(extra, (t) => pw(t) * (t.due && t.due < day ? 0.5 : 0.6));
  const facts = { planned: planned.length, onTime: onTime.length, extra: extra.length, missed: live ? 0 : planned.length - onTime.length };
  if (plannedW) return { v: Math.min(1, (doneW + extraW * 0.5) / plannedW), facts };
  if (extra.length) return { v: Math.min(1, 0.7 + 0.1 * extra.length), facts };
  if (off || live) return { v: null, facts };
  // Dia útil sem nada planejado e nada feito: só pesa se você costuma usar tarefas.
  const usesTasks = S.task.some((t) => t.done && doneOn(t) >= addDays(day, -14) && doneOn(t) < day);
  return { v: usesTasks ? 0 : null, facts };
}

function habits(S, day) {
  const wd = weekday(day);
  const vals = [];
  let done = 0;
  let total = 0;
  for (const h of S.habit) {
    if (h.archived || (h.createdDay && h.createdDay > day)) continue;
    if (!(h.days || HABIT_DAYS_ALL).includes(wd)) continue;
    const log = S.hlogMap.get(`${h.id}|${day}`);
    if (log?.mod) continue; // protegido (congelamento ou folga)
    const f = Math.min(1, (log?.count || 0) / (h.goal || 1));
    total++;
    if (f >= 1) done++;
    vals.push(f);
  }
  for (const t of S.task) {
    if (t.kind !== 'routine' || t.due !== day) continue;
    const subs = t.subtasks || [];
    vals.push(t.done ? 1 : subs.length ? subs.filter((s) => s.done).length / subs.length : 0);
  }
  const usesWater = S.water.some((w) => w.date >= addDays(day, -14) && w.date <= day);
  const ml = sum(S.waterByDate.get(day) || [], (w) => w.ml || 0);
  const goal = S.prefs.waterGoal || 2000;
  if (usesWater) vals.push(Math.min(1, ml / goal));
  return { v: vals.length ? sum(vals) / vals.length : null, facts: { done, total, ml, goal } };
}

export function activeOn(S, day) {
  if (S.task.some((t) => t.done && doneOn(t) === day)) return true;
  if (S.hlog.some((l) => l.date === day && (l.count || 0) > 0)) return true;
  return (S.evByDate.get(day) || []).some((e) => ['checkin', 'focus', 'water', 'quit'].includes(e.kind)) || (S.waterByDate.get(day) || []).length > 0;
}

function firstDay(S) {
  let f = null;
  const take = (d) => d && (!f || d < f) && (f = d);
  for (const t of S.task) take(t.createdDay);
  for (const h of S.habit) take(h.createdDay);
  for (const l of S.hlog) take(l.date);
  return f;
}

function steadiness(S, day, off) {
  const first = firstDay(S);
  if (!first || first > day) return { v: null, facts: {} };
  const from = first > addDays(day, -6) ? first : addDays(day, -6);
  let active = 0;
  let work = 0;
  for (let d = from; d <= day; d = addDays(d, 1)) {
    const a = activeOn(S, d);
    if (a) active++;
    if (!off.includes(weekday(d))) work++;
  }
  // Uma folga extra por semana não derruba a constância.
  const need = Math.max(1, Math.min(work, Math.round(work * (6 / 7))));
  return { v: Math.min(1, active / need), facts: { active, days: daysBetween(from, day) + 1 } };
}

function projects(S, day) {
  const vals = [];
  const sprints = [];
  for (const t of S.task) {
    if (t.kind !== 'sprint' || t.archived || !t.due) continue;
    const start = t.start || t.createdDay;
    if (!start || start > day || t.due < day) continue;
    if (t.done && doneOn(t) < day) continue;
    const subs = t.subtasks || [];
    if (!subs.length) continue;
    const total = Math.max(1, daysBetween(start, t.due));
    const time = Math.min(1, (daysBetween(start, day) + 1) / (total + 1));
    const steps = t.done ? 1 : subs.filter((s) => s.done).length / subs.length;
    const v = Math.min(1, steps / Math.max(0.15, time));
    vals.push(v);
    sprints.push({ title: t.title, steps, time });
  }
  let projN = 0;
  for (const p of S.project) {
    if (p.archived) continue;
    const ts = S.task.filter((t) => t.projectId === p.id && !t.archived);
    const near = ts.some((t) => !t.done && !t.failed && t.due && t.due <= addDays(day, 7));
    const moved = ts.some((t) => t.done && doneOn(t) <= day && doneOn(t) > addDays(day, -7));
    if (!near && !moved) continue; // projeto parado sem prazo por perto: não é cobrado
    projN++;
    vals.push(moved ? 1 : 0);
  }
  return { v: vals.length ? sum(vals) / vals.length : null, facts: { sprints, projects: projN } };
}

function planning(S, day) {
  const planned = S.task.filter((t) => isTask(t) && t.kind !== 'bonus' && t.due === day);
  if (!planned.length) return { v: null, facts: {} };
  const postponed = planned.filter((t) => t.postponed).length;
  const postponeRate = sum(planned, (t) => Math.min(3, t.postponed || 0)) / (planned.length * 2);
  // Carga: compara com a média de concluídas por dia ativo nas últimas 4 semanas.
  const from = addDays(day, -28);
  const doneBy = new Map();
  for (const t of S.task) {
    const d = t.done && doneOn(t);
    if (d && d >= from && d < day) doneBy.set(d, (doneBy.get(d) || 0) + 1);
  }
  const avg = doneBy.size >= 3 ? sum([...doneBy.values()]) / doneBy.size : null;
  const cap = avg == null ? Infinity : Math.max(3, avg * 1.5);
  const loadFit = planned.length <= cap ? 1 : cap / planned.length;
  const v = 0.6 * Math.max(0, 1 - postponeRate) + 0.4 * loadFit;
  return { v, facts: { postponed, load: planned.length, avg: avg == null ? null : Math.round(avg * 10) / 10 } };
}

function focus(S, day, live) {
  const usesFocus = S.ev.some((e) => e.kind === 'focus' && e.date >= addDays(day, -30) && e.date <= day);
  const sec = sum((S.evByDate.get(day) || []).filter((e) => e.kind === 'focus'), (e) => e.focusSec || 0);
  // Ao vivo, sem foco ainda hoje: não conta (o dia não acabou).
  return { v: usesFocus && !(live && !sec) ? Math.min(1, sec / 3000) : null, facts: { min: Math.round(sec / 60) } };
}

/* ---------- Índice do dia ---------- */
// live: o dia ainda está acontecendo (hoje): mostra o progresso até agora, sem contar nada como perdido.
export function dayIPL(S, day, { live = false } = {}) {
  const off = S.prefs.daysOff || [];
  const isOff = off.includes(weekday(day));
  const ex = execution(S, day, isOff, live);
  const hb = habits(S, day);
  const parts = {
    exec: ex.v,
    habits: hb.v,
    steady: steadiness(S, day, off).v,
    proj: projects(S, day).v,
    plan: planning(S, day).v,
    focus: focus(S, day, live).v,
  };
  let wsum = 0;
  let acc = 0;
  for (const [k, v] of Object.entries(parts)) {
    if (v == null) continue;
    wsum += W[k];
    acc += W[k] * v;
  }
  // Só a constância não basta para dar nota a um dia: precisa de algo do próprio dia.
  const own = ['exec', 'habits', 'proj', 'plan', 'focus'].some((k) => parts[k] != null);
  const score = wsum && own ? Math.round((acc / wsum) * 100) : null;
  for (const k of Object.keys(parts)) parts[k] = r2(parts[k]);
  return { score, parts, off: isOff, facts: { ...ex.facts, habitsDone: hb.facts.done, habitsTotal: hb.facts.total, ml: hb.facts.ml, waterGoal: hb.facts.goal } };
}

/* ---------- Notas ---------- */
export function grade(score) {
  const t = [
    [97, 'A+'],
    [93, 'A'],
    [90, 'A-'],
    [87, 'B+'],
    [83, 'B'],
    [80, 'B-'],
    [77, 'C+'],
    [73, 'C'],
    [70, 'C-'],
    [66, 'D+'],
    [60, 'D'],
    [57, 'D-'],
    [53, 'E+'],
    [50, 'E'],
    [45, 'E-'],
  ];
  for (const [min, g] of t) if (score >= min) return g;
  return 'F';
}

export const gradeLine = (g) =>
  g.startsWith('A')
    ? g === 'A+'
      ? 'Excepcional. Nesse ritmo, nada te segura.'
      : 'Excelente. Você está no controle do seu tempo.'
    : g.startsWith('B')
      ? g === 'B-'
        ? 'Razoável. Escolha uma coisa para melhorar esta semana.'
        : 'Bom trabalho. Uma base sólida para crescer.'
      : g.startsWith('C')
        ? 'Algumas pontas soltas. Que tal uma lista menor, só com o essencial?'
        : g.startsWith('D')
          ? 'Fase difícil. Comece pequeno: uma tarefa e um hábito por dia.'
          : 'Todo recomeço conta. Amanhã é uma página em branco.';

// Média do mês (dias fechados com nota). Dias sem nota (folga sem nada, ou sem uso) ficam de fora.
export function monthIPL(S, ym) {
  const days = S.score.filter((s) => s.date && ymOf(s.date) === ym && s.score != null).sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) return null;
  const avg = Math.round(sum(days, (d) => d.score) / days.length);
  return { score: avg, grade: grade(avg), days };
}

// Parte mais fraca e mais forte, para uma dica curta.
export function partsTip(parts) {
  const list = IPL_PARTS.filter((p) => parts?.[p.k] != null).map((p) => ({ ...p, v: parts[p.k] }));
  if (list.length < 2) return '';
  const lo = list.reduce((a, b) => (b.v < a.v ? b : a));
  const hi = list.reduce((a, b) => (b.v > a.v ? b : a));
  if (hi.v - lo.v < 0.15) return 'Dia equilibrado entre as partes.';
  return `Ponto forte: ${hi.name.toLowerCase()}. Onde dá para ganhar mais: ${lo.name.toLowerCase()}.`;
}
