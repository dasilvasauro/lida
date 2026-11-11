// Conquistas: metas de longo prazo em sete grupos (tarefas, IPL do mês, água, sequências, hábitos,
// dias seguidos usando o Lida e atividade nos dias de folga). Cada uma paga ouro de acordo com a
// dificuldade, e o ouro é resgatado à mão (na aba Eu > Conquistas).
//
// Registros: ach_<id> { id, at, claimed?, retro? } guarda o desbloqueio (uma vez desbloqueada, fica,
// mesmo que o número caia depois); o ouro vem num evento com id fixo (ev_ach_<id>), então dois
// aparelhos não pagam em dobro. O histórico conta: na primeira vez, o que a pessoa já tinha feito
// desbloqueia de uma vez (retro), sem uma animação para cada.
import { personal, P } from '../state.js';
import { addDays, sum, weekday, isoOfMs } from '../lib/util.js';
import { today } from '../lib/clock.js';
import { isDone, isScheduled, bestStreak, daysClean } from './habits.js';
import { strip } from './tasks.js';
import { tr, fill, num } from './i18n.js';

// Ouro por dificuldade.
export const TIER_GOLD = { 1: 40, 2: 120, 3: 300, 4: 700, 5: 1500 };
export const TIER_NAME = {
  1: { pt: 'Bronze', en: 'Bronze', es: 'Bronce' },
  2: { pt: 'Prata', en: 'Silver', es: 'Plata' },
  3: { pt: 'Ouro', en: 'Gold', es: 'Oro' },
  4: { pt: 'Platina', en: 'Platinum', es: 'Platino' },
  5: { pt: 'Diamante', en: 'Diamond', es: 'Diamante' },
};

export const CATS = {
  tasks: { icon: 'list', name: { pt: 'Tarefas', en: 'Tasks', es: 'Tareas' } },
  ipl: { icon: 'chart', name: { pt: 'IPL do mês', en: 'Monthly IPL', es: 'IPL del mes' } },
  water: { icon: 'water', name: { pt: 'Água', en: 'Water', es: 'Agua' } },
  streak: { icon: 'flame', name: { pt: 'Sequências', en: 'Streaks', es: 'Rachas' } },
  habit: { icon: 'habit', name: { pt: 'Hábitos', en: 'Habits', es: 'Hábitos' } },
  active: { icon: 'today', name: { pt: 'Dias seguidos', en: 'Days in a row', es: 'Días seguidos' } },
  off: { icon: 'coffee', name: { pt: 'Dias de folga', en: 'Days off', es: 'Días libres' } },
};

// [id, grupo, ícone, dificuldade, métrica, meta, nome, descrição]  ({n} = meta)
const L = (pt, en, es) => ({ pt, en, es });
const DEFS = [
  // Tarefas criadas e concluídas
  ['t_c1', 'tasks', 'plus', 1, 'created', 1, L('Primeira anotação', 'First note', 'Primera nota'), L('Crie a sua primeira tarefa.', 'Create your first task.', 'Crea tu primera tarea.')],
  ['t_c10', 'tasks', 'plus', 1, 'created', 10, L('Lista começando', 'List in the making', 'Lista en marcha'), L('Crie {n} tarefas.', 'Create {n} tasks.', 'Crea {n} tareas.')],
  ['t_c50', 'tasks', 'list', 2, 'created', 50, L('Cabeça vazia', 'Clear head', 'Mente despejada'), L('Crie {n} tarefas: tudo fora da cabeça e dentro do Lida.', 'Create {n} tasks: out of your head and into Lida.', 'Crea {n} tareas: todo fuera de tu cabeza y dentro de Lida.')],
  ['t_c100', 'tasks', 'list', 2, 'created', 100, L('Centena de planos', 'A hundred plans', 'Cien planes'), L('Crie {n} tarefas.', 'Create {n} tasks.', 'Crea {n} tareas.')],
  ['t_c250', 'tasks', 'list', 3, 'created', 250, L('Arquiteto de listas', 'List architect', 'Arquitecto de listas'), L('Crie {n} tarefas.', 'Create {n} tasks.', 'Crea {n} tareas.')],
  ['t_c500', 'tasks', 'inbox', 4, 'created', 500, L('Caixa de entrada infinita', 'Bottomless inbox', 'Bandeja sin fondo'), L('Crie {n} tarefas.', 'Create {n} tasks.', 'Crea {n} tareas.')],
  ['t_c1000', 'tasks', 'inbox', 5, 'created', 1000, L('Mil ideias', 'A thousand ideas', 'Mil ideas'), L('Crie {n} tarefas. Nenhuma ideia se perde mais.', 'Create {n} tasks. No idea gets lost anymore.', 'Crea {n} tareas. Ninguna idea se pierde más.')],
  ['t_d1', 'tasks', 'check', 1, 'done', 1, L('Primeiro risco', 'First tick', 'Primera tachada'), L('Conclua a sua primeira tarefa.', 'Complete your first task.', 'Completa tu primera tarea.')],
  ['t_d50', 'tasks', 'check', 2, 'done', 50, L('Pegando o ritmo', 'Getting the hang of it', 'Agarrando el ritmo'), L('Conclua {n} tarefas.', 'Complete {n} tasks.', 'Completa {n} tareas.')],
  ['t_d200', 'tasks', 'check', 3, 'done', 200, L('Máquina de concluir', 'Finishing machine', 'Máquina de terminar'), L('Conclua {n} tarefas.', 'Complete {n} tasks.', 'Completa {n} tareas.')],
  ['t_d500', 'tasks', 'trophy', 4, 'done', 500, L('Quinhentas a menos', 'Five hundred down', 'Quinientas menos'), L('Conclua {n} tarefas.', 'Complete {n} tasks.', 'Completa {n} tareas.')],
  ['t_p0', 'tasks', 'flag', 3, 'doneP0', 25, L('Apagando incêndios', 'Firefighter', 'Apagafuegos'), L('Conclua {n} tarefas P0.', 'Complete {n} P0 tasks.', 'Completa {n} tareas P0.')],
  ['t_day10', 'tasks', 'bolt', 3, 'bestDayDone', 10, L('Dia cheio', 'Full day', 'Día completo'), L('Conclua {n} tarefas num mesmo dia.', 'Complete {n} tasks in a single day.', 'Completa {n} tareas en un mismo día.')],

  // IPL do mês
  ['m_first', 'ipl', 'chart', 1, 'months', 1, L('Primeiro boletim', 'First report card', 'Primer boletín'), L('Feche um mês com nota no IPL.', 'Close a month with an IPL score.', 'Cierra un mes con nota en el IPL.')],
  ['m60', 'ipl', 'chart', 2, 'bestMonth', 60, L('Mês aprovado', 'Passing month', 'Mes aprobado'), L('Termine um mês com IPL médio de {n} ou mais.', 'Finish a month with an average IPL of {n} or more.', 'Termina un mes con un IPL medio de {n} o más.')],
  ['m70', 'ipl', 'chart', 2, 'bestMonth', 70, L('Mês consistente', 'Steady month', 'Mes constante'), L('Termine um mês com IPL médio de {n} ou mais.', 'Finish a month with an average IPL of {n} or more.', 'Termina un mes con un IPL medio de {n} o más.')],
  ['m80', 'ipl', 'star', 3, 'bestMonth', 80, L('Mês de respeito', 'Respectable month', 'Mes de respeto'), L('Termine um mês com IPL médio de {n} ou mais.', 'Finish a month with an average IPL of {n} or more.', 'Termina un mes con un IPL medio de {n} o más.')],
  ['m90', 'ipl', 'star', 4, 'bestMonth', 90, L('Mês nota A', 'Straight-A month', 'Mes de sobresaliente'), L('Termine um mês com IPL médio de {n} ou mais.', 'Finish a month with an average IPL of {n} or more.', 'Termina un mes con un IPL medio de {n} o más.')],
  ['m95', 'ipl', 'crown', 5, 'bestMonth', 95, L('Mês impecável', 'Flawless month', 'Mes impecable'), L('Termine um mês com IPL médio de {n} ou mais.', 'Finish a month with an average IPL of {n} or more.', 'Termina un mes con un IPL medio de {n} o más.')],
  ['m_run3', 'ipl', 'up', 4, 'monthRun70', 3, L('Trimestre firme', 'Solid quarter', 'Trimestre firme'), L('Termine {n} meses seguidos com IPL médio de 70 ou mais.', 'Finish {n} months in a row with an average IPL of 70 or more.', 'Termina {n} meses seguidos con un IPL medio de 70 o más.')],
  ['m_six80', 'ipl', 'trophy', 5, 'months80', 6, L('Semestre de ouro', 'Golden semester', 'Semestre de oro'), L('Termine {n} meses com IPL médio de 80 ou mais.', 'Finish {n} months with an average IPL of 80 or more.', 'Termina {n} meses con un IPL medio de 80 o más.')],

  // Água
  ['w_goal1', 'water', 'water', 1, 'waterGoalDays', 1, L('Primeiro gole', 'First sip', 'Primer sorbo'), L('Bata a meta de água de um dia.', 'Reach your daily water goal.', 'Alcanza tu meta diaria de agua.')],
  ['w_10l', 'water', 'water', 1, 'waterL', 10, L('Dez litros', 'Ten liters', 'Diez litros'), L('Beba {n} litros, somando tudo.', 'Drink {n} liters in total.', 'Bebe {n} litros en total.')],
  ['w_100l', 'water', 'water', 2, 'waterL', 100, L('Caixa-d’água', 'Water tank', 'Tinaco'), L('Beba {n} litros, somando tudo.', 'Drink {n} liters in total.', 'Bebe {n} litros en total.')],
  ['w_500l', 'water', 'water', 4, 'waterL', 500, L('Piscina pessoal', 'Personal pool', 'Piscina personal'), L('Beba {n} litros, somando tudo.', 'Drink {n} liters in total.', 'Bebe {n} litros en total.')],
  ['w_goal30', 'water', 'water', 3, 'waterGoalDays', 30, L('Hidratado', 'Well hydrated', 'Bien hidratado'), L('Bata a meta de água em {n} dias.', 'Reach your water goal on {n} days.', 'Alcanza tu meta de agua en {n} días.')],
  ['w_run7', 'water', 'flame', 2, 'waterRun', 7, L('Semana molhada', 'Wet week', 'Semana mojada'), L('Bata a meta de água {n} dias seguidos.', 'Reach your water goal {n} days in a row.', 'Alcanza tu meta de agua {n} días seguidos.')],
  ['w_run30', 'water', 'flame', 4, 'waterRun', 30, L('Fonte inesgotável', 'Endless spring', 'Manantial inagotable'), L('Bata a meta de água {n} dias seguidos.', 'Reach your water goal {n} days in a row.', 'Alcanza tu meta de agua {n} días seguidos.')],
  ['w_run100', 'water', 'crown', 5, 'waterRun', 100, L('Oceano', 'Ocean', 'Océano'), L('Bata a meta de água {n} dias seguidos.', 'Reach your water goal {n} days in a row.', 'Alcanza tu meta de agua {n} días seguidos.')],

  // Sequências
  ['s_h7', 'streak', 'flame', 1, 'habitBest', 7, L('Uma semana firme', 'One solid week', 'Una semana firme'), L('Chegue a {n} dias seguidos num hábito.', 'Reach a {n}-day streak on a habit.', 'Llega a una racha de {n} días en un hábito.')],
  ['s_h30', 'streak', 'flame', 3, 'habitBest', 30, L('Um mês sem falhar', 'A month without missing', 'Un mes sin fallar'), L('Chegue a {n} dias seguidos num hábito.', 'Reach a {n}-day streak on a habit.', 'Llega a una racha de {n} días en un hábito.')],
  ['s_h66', 'streak', 'flame', 4, 'habitBest', 66, L('Hábito formado', 'Habit formed', 'Hábito formado'), L('Chegue a {n} dias seguidos num hábito (dizem que é o tempo de um hábito pegar).', 'Reach a {n}-day streak on a habit (they say that is how long it takes to stick).', 'Llega a una racha de {n} días en un hábito (dicen que es lo que tarda en quedarse).')],
  ['s_h100', 'streak', 'flame', 4, 'habitBest', 100, L('Cem dias', 'One hundred days', 'Cien días'), L('Chegue a {n} dias seguidos num hábito.', 'Reach a {n}-day streak on a habit.', 'Llega a una racha de {n} días en un hábito.')],
  ['s_h365', 'streak', 'crown', 5, 'habitBest', 365, L('Volta ao Sol', 'Around the sun', 'Vuelta al sol'), L('Chegue a {n} dias seguidos num hábito.', 'Reach a {n}-day streak on a habit.', 'Llega a una racha de {n} días en un hábito.')],
  ['s_ci7', 'streak', 'gift', 1, 'checkinRun', 7, L('Prêmio completo', 'Full prize', 'Premio completo'), L('Resgate o prêmio do dia {n} dias seguidos.', 'Claim the daily prize {n} days in a row.', 'Reclama el premio del día {n} días seguidos.')],
  ['s_ci30', 'streak', 'gift', 3, 'checkinRun', 30, L('Assinante fiel', 'Loyal subscriber', 'Suscriptor fiel'), L('Resgate o prêmio do dia {n} dias seguidos.', 'Claim the daily prize {n} days in a row.', 'Reclama el premio del día {n} días seguidos.')],
  ['s_q30', 'streak', 'shield', 3, 'quitBest', 30, L('Desapegado', 'Let go', 'Desapegado'), L('Fique {n} dias sem um mau hábito do Desapego.', 'Stay {n} days away from a bad habit in Let Go.', 'Pasa {n} días sin un mal hábito en Desapego.')],
  ['s_q100', 'streak', 'shield', 5, 'quitBest', 100, L('Livre', 'Free', 'Libre'), L('Fique {n} dias sem um mau hábito do Desapego.', 'Stay {n} days away from a bad habit in Let Go.', 'Pasa {n} días sin un mal hábito en Desapego.')],

  // Hábitos
  ['h_new1', 'habit', 'habit', 1, 'habitsCreated', 1, L('Primeiro hábito', 'First habit', 'Primer hábito'), L('Crie o seu primeiro hábito.', 'Create your first habit.', 'Crea tu primer hábito.')],
  ['h_new5', 'habit', 'habit', 2, 'habitsCreated', 5, L('Rotina montada', 'Routine set', 'Rutina armada'), L('Crie {n} hábitos.', 'Create {n} habits.', 'Crea {n} hábitos.')],
  ['h_d10', 'habit', 'check', 1, 'habitDone', 10, L('Repetição', 'Repetition', 'Repetición'), L('Cumpra hábitos {n} vezes.', 'Complete habits {n} times.', 'Cumple hábitos {n} veces.')],
  ['h_d100', 'habit', 'check', 2, 'habitDone', 100, L('Cem repetições', 'A hundred reps', 'Cien repeticiones'), L('Cumpra hábitos {n} vezes.', 'Complete habits {n} times.', 'Cumple hábitos {n} veces.')],
  ['h_d500', 'habit', 'check', 4, 'habitDone', 500, L('No piloto automático', 'On autopilot', 'En piloto automático'), L('Cumpra hábitos {n} vezes.', 'Complete habits {n} times.', 'Cumple hábitos {n} veces.')],
  ['h_d1000', 'habit', 'trophy', 5, 'habitDone', 1000, L('Mil vezes', 'A thousand times', 'Mil veces'), L('Cumpra hábitos {n} vezes.', 'Complete habits {n} times.', 'Cumple hábitos {n} veces.')],
  ['h_p1', 'habit', 'sparkles', 1, 'perfectDays', 1, L('Dia perfeito', 'Perfect day', 'Día perfecto'), L('Cumpra todos os hábitos do dia.', 'Complete every habit of the day.', 'Cumple todos los hábitos del día.')],
  ['h_p30', 'habit', 'sparkles', 3, 'perfectDays', 30, L('Trinta dias perfeitos', 'Thirty perfect days', 'Treinta días perfectos'), L('Cumpra todos os hábitos do dia em {n} dias.', 'Complete every habit of the day on {n} days.', 'Cumple todos los hábitos del día en {n} días.')],
  ['h_p100', 'habit', 'crown', 5, 'perfectDays', 100, L('Perfeccionista', 'Perfectionist', 'Perfeccionista'), L('Cumpra todos os hábitos do dia em {n} dias.', 'Complete every habit of the day on {n} days.', 'Cumple todos los hábitos del día en {n} días.')],

  // Dias seguidos usando o Lida
  ['a_r3', 'active', 'today', 1, 'activeRun', 3, L('Voltei', 'I came back', 'Volví'), L('Use o Lida {n} dias seguidos.', 'Use Lida {n} days in a row.', 'Usa Lida {n} días seguidos.')],
  ['a_r7', 'active', 'today', 2, 'activeRun', 7, L('Semana completa', 'Full week', 'Semana completa'), L('Use o Lida {n} dias seguidos.', 'Use Lida {n} days in a row.', 'Usa Lida {n} días seguidos.')],
  ['a_r30', 'active', 'today', 3, 'activeRun', 30, L('Mês completo', 'Full month', 'Mes completo'), L('Use o Lida {n} dias seguidos.', 'Use Lida {n} days in a row.', 'Usa Lida {n} días seguidos.')],
  ['a_r100', 'active', 'bolt', 4, 'activeRun', 100, L('Cem dias de casa', 'A hundred days in', 'Cien días dentro'), L('Use o Lida {n} dias seguidos.', 'Use Lida {n} days in a row.', 'Usa Lida {n} días seguidos.')],
  ['a_r365', 'active', 'crown', 5, 'activeRun', 365, L('Um ano inteiro', 'A whole year', 'Un año entero'), L('Use o Lida {n} dias seguidos.', 'Use Lida {n} days in a row.', 'Usa Lida {n} días seguidos.')],
  ['a_t100', 'active', 'star', 3, 'activeDays', 100, L('Cliente da casa', 'Regular', 'Cliente de la casa'), L('Use o Lida em {n} dias (não precisam ser seguidos).', 'Use Lida on {n} days (not necessarily in a row).', 'Usa Lida en {n} días (no hace falta que sean seguidos).')],

  // Dias de folga
  ['o_1', 'off', 'coffee', 1, 'offActive', 1, L('Folga produtiva', 'Productive day off', 'Día libre productivo'), L('Faça alguma coisa num dia de folga.', 'Get something done on a day off.', 'Haz algo en un día libre.')],
  ['o_10', 'off', 'coffee', 2, 'offActive', 10, L('Sem fim de semana', 'No weekend for me', 'Sin fin de semana'), L('Faça alguma coisa em {n} dias de folga.', 'Get something done on {n} days off.', 'Haz algo en {n} días libres.')],
  ['o_50', 'off', 'coffee', 4, 'offActive', 50, L('Folga é estado de espírito', 'Days off are a state of mind', 'Libre es un estado mental'), L('Faça alguma coisa em {n} dias de folga.', 'Get something done on {n} days off.', 'Haz algo en {n} días libres.')],
  ['o_t20', 'off', 'check', 3, 'offTasks', 20, L('Adiantando a semana', 'Getting ahead', 'Adelantando la semana'), L('Conclua {n} tarefas em dias de folga.', 'Complete {n} tasks on days off.', 'Completa {n} tareas en días libres.')],
  ['o_h30', 'off', 'habit', 3, 'offHabits', 30, L('Hábito não tira folga', 'Habits never rest', 'Los hábitos no descansan'), L('Cumpra hábitos {n} vezes em dias de folga.', 'Complete habits {n} times on days off.', 'Cumple hábitos {n} veces en días libres.')],
];

export const ACHIEVEMENTS = DEFS.map(([id, cat, icon, tier, metric, goal, name, desc]) => ({ id, cat, icon, tier, metric, goal, name, desc, gold: TIER_GOLD[tier] }));
export const achById = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export const achName = (a) => tr(a.name);
export const achDesc = (a) => fill(tr(a.desc), { n: num(a.goal) });

/* ---------- Números ---------- */
const run = (dates) => {
  // maior sequência de dias seguidos num conjunto de datas AAAA-MM-DD
  const s = [...new Set(dates)].sort();
  let best = 0;
  let cur = 0;
  let prev = null;
  for (const d of s) {
    cur = prev && addDays(prev, 1) === d ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
};
const doneDay = (t) => (t.doneAt ? isoOfMs(t.doneAt) : null);

export function achStats(S = P()) {
  const tasks = S.task.filter((t) => t.kind !== 'routine');
  const done = tasks.filter((t) => t.done);
  const perDay = new Map();
  for (const t of done) {
    const d = doneDay(t);
    if (d) perDay.set(d, (perDay.get(d) || 0) + 1);
  }
  // IPL do mês
  const months = S.month.filter((m) => m.month && m.score != null).sort((a, b) => a.month.localeCompare(b.month));
  let monthRun70 = 0;
  let cur = 0;
  let prev = null;
  for (const m of months) {
    const [y, mo] = m.month.split('-').map(Number);
    const next = prev ? `${prev[1] === 12 ? prev[0] + 1 : prev[0]}-${String(prev[1] === 12 ? 1 : prev[1] + 1).padStart(2, '0')}` : null;
    cur = m.score >= 70 ? (next === m.month ? cur + 1 : 1) : 0;
    monthRun70 = Math.max(monthRun70, cur);
    prev = [y, mo];
  }
  // Água
  const goal = S.prefs.waterGoal || 2000;
  const mlByDay = new Map();
  for (const w of S.water) if (w.date) mlByDay.set(w.date, (mlByDay.get(w.date) || 0) + (w.ml || 0));
  const goalDays = [...mlByDay].filter(([, ml]) => ml >= goal).map(([d]) => d);
  // Hábitos
  const habitDoneDays = [];
  const offHabitDays = [];
  const off = S.prefs.daysOff || [];
  const isOffDay = (d) => off.includes(weekday(d)) || dayOffDays.has(d);
  const dayOffDays = new Set(S.hlog.filter((l) => l.mod === 'dayOff').map((l) => l.date));
  for (const l of S.hlog) {
    const h = S.byId.get(l.habitId);
    if (!h || l.mod) continue;
    if ((l.count || 0) >= (h.goal || 1)) {
      habitDoneDays.push(l.date);
      if (isOffDay(l.date)) offHabitDays.push(l.date);
    }
  }
  const logDays = [...new Set(S.hlog.filter((l) => !l.mod && (l.count || 0) > 0).map((l) => l.date))];
  let perfect = 0;
  for (const d of logDays) {
    const sched = S.habit.filter((h) => (!h.createdDay || h.createdDay <= d) && isScheduled(h, d) && (!h.archived || (S.hlogMap.get(`${h.id}|${d}`)?.count || 0) > 0));
    if (sched.length && sched.every((h) => isDone(S, h, d))) perfect++;
  }
  // Dias com atividade
  const active = new Set();
  for (const t of tasks) {
    if (t.createdDay) active.add(t.createdDay);
    const d = doneDay(t);
    if (d && t.done) active.add(d);
  }
  for (const d of logDays) active.add(d);
  for (const d of mlByDay.keys()) active.add(d);
  for (const e of S.ev) if (e.date && ['checkin', 'focus', 'quit', 'done', 'water'].includes(e.kind)) active.add(e.date);
  for (const m of S.mood) if (m.date) active.add(m.date);
  const t0 = today();
  for (const d of [...active]) if (d > t0) active.delete(d);
  const doneDaysSet = new Set([...perDay.keys()]);
  const logSet = new Set(logDays);
  const offActive = [...active].filter((d) => isOffDay(d) && (doneDaysSet.has(d) || logSet.has(d) || mlByDay.has(d))).length;
  const quitBest = Math.max(0, ...S.quit.map((q) => daysClean(q)));
  return {
    created: tasks.length,
    done: done.length,
    doneP0: done.filter((t) => t.priority === 'P0').length,
    bestDayDone: Math.max(0, ...perDay.values()),
    months: months.length,
    bestMonth: Math.max(0, ...months.map((m) => m.score)),
    monthRun70,
    months80: months.filter((m) => m.score >= 80).length,
    waterL: Math.floor(sum([...mlByDay.values()]) / 1000),
    waterGoalDays: goalDays.length,
    waterRun: run(goalDays),
    habitBest: Math.max(0, ...S.habit.map((h) => bestStreak(S, h))),
    checkinRun: run(S.ev.filter((e) => e.kind === 'checkin' && e.date).map((e) => e.date)),
    quitBest,
    habitsCreated: S.habit.length,
    habitDone: habitDoneDays.length,
    perfectDays: perfect,
    activeRun: run([...active]),
    activeDays: active.size,
    offActive,
    offTasks: done.filter((t) => isOffDay(doneDay(t) || '')).length,
    offHabits: offHabitDays.length,
  };
}

/* ---------- Estado ---------- */
// [{ ...conquista, value, unlocked, claimed, at }]
export function achList(S = P(), stats = achStats(S)) {
  return ACHIEVEMENTS.map((a) => {
    const r = S.byId.get(`ach_${a.id}`);
    const value = stats[a.metric] || 0;
    return { ...a, value: Math.min(value, a.goal), unlocked: !!r, claimed: !!(r?.claimed || S.byId.get(`ev_ach_${a.id}`)), at: r?.at || 0 };
  });
}
export const toClaim = (S = P()) => ACHIEVEMENTS.filter((a) => S.byId.get(`ach_${a.id}`) && !S.byId.get(`ach_${a.id}`).claimed && !S.byId.get(`ev_ach_${a.id}`));

// Desbloqueia o que já foi alcançado. Devolve as conquistas novas e se foi a primeira vez (histórico).
export async function checkAchievements(S = P()) {
  const stats = achStats(S);
  const first = !ACHIEVEMENTS.some((a) => S.byId.get(`ach_${a.id}`)) && !S.byId.get('ach__seen');
  const fresh = ACHIEVEMENTS.filter((a) => !S.byId.get(`ach_${a.id}`) && (stats[a.metric] || 0) >= a.goal);
  const at = Date.now();
  const batch = fresh.map((a) => ({ type: 'ach', id: `ach_${a.id}`, data: { aid: a.id, at, ...(first ? { retro: true } : {}) } }));
  if (first) batch.push({ type: 'ach', id: 'ach__seen', data: { aid: '_seen', at } });
  if (batch.length) await personal.saveMany(batch);
  return { fresh, first, stats };
}

// Resgata o ouro (uma vez: o evento tem id fixo).
export async function claimAchievement(id) {
  const a = achById.get(id);
  const r = personal.get(`ach_${id}`);
  if (!a || !r || r.claimed || personal.get(`ev_ach_${id}`)) return null;
  const { commit } = await import('./game.js');
  const res = await commit([
    { type: 'ev', id: `ev_ach_${id}`, data: { kind: 'ach', ref: id, date: today(), gold: a.gold } },
    { type: 'ach', id: `ach_${id}`, data: { ...strip(r), claimed: Date.now() } },
  ]);
  return { ...res, gold: a.gold };
}
