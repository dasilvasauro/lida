// Ofensiva do Lida: dias seguidos cumprindo uma parte do que estava programado.
// Um dia conta quando a parte feita (tarefas com prazo no dia + hábitos do dia) chega à meta da
// ofensiva (50% por padrão, ajustável em Ajustes > Jogo). Tarefas de outros dias concluídas no dia
// também contam a favor. Num dia sem nada programado, basta concluir alguma coisa.
// Dia de folga (Ajustes > Jogo) e Folga dos hábitos não quebram a ofensiva (e não somam).
// Tudo sai dos dados sincronizados: todos os aparelhos mostram o mesmo número.
import { addDays, daysBetween, weekday, isoOfMs } from '../lib/util.js';
import { today, nowMs } from '../lib/clock.js';
import { habitsOnDay } from './tasks.js';

export const STREAK_GOALS = [25, 50, 75, 100];
export const streakGoal = (S) => (STREAK_GOALS.includes(Number(S.prefs?.streakGoal)) ? Number(S.prefs.streakGoal) : 50);
const MAX_BACK = 400;

const dayOf = (ms) => (ms ? isoOfMs(ms) : null);

// Índices por dia (uma vez por fotografia dos dados).
let cacheKey = null;
let cacheIdx = null;
function index(S) {
  if (cacheKey === S) return cacheIdx;
  const due = new Map();
  const doneOn = new Map();
  const active = new Set();
  const push = (m, k, v) => (m.has(k) ? m.get(k).push(v) : m.set(k, [v]));
  let first = null;
  const seeFirst = (d) => d && (!first || d < first) && (first = d);
  for (const t of S.task) {
    if (t.due) push(due, t.due, t);
    const dd = t.done ? dayOf(t.doneAt) : null;
    if (dd) {
      push(doneOn, dd, t);
      active.add(dd);
    }
    seeFirst(t.createdDay);
  }
  for (const l of S.hlog || []) if ((l.count || 0) > 0 && !l.mod) active.add(l.date);
  for (const h of S.habit) seeFirst(h.createdDay);
  cacheKey = S;
  cacheIdx = { due, doneOn, active, first };
  return cacheIdx;
}

// Como foi um dia: { planned, done, pct (0..1), state: 'met' | 'off' | 'miss' | 'open' }
export function dayProgress(S, day, idx = index(S), now = today()) {
  let planned = 0;
  let done = 0;
  for (const t of idx.due.get(day) || []) {
    if (t.archived && !t.done) continue; // rotina não feita não cobra
    planned++;
    if (t.done && dayOf(t.doneAt) <= day) done++;
  }
  // concluídas no dia com prazo em outro dia (adiantadas, atrasadas, sem data)
  const extra = (idx.doneOn.get(day) || []).filter((t) => t.due !== day).length;
  const h = habitsOnDay(S, day);
  planned += h.done + h.missed;
  done += h.done + extra;
  const goal = streakGoal(S) / 100;
  const pct = planned ? Math.min(1, done / planned) : done > 0 ? 1 : 0;
  const met = planned ? pct >= goal - 1e-9 : done > 0;
  const off = (S.prefs?.daysOff || []).includes(weekday(day));
  const allProtected = !h.done && !h.missed && S.habit.some((x) => !x.archived && S.hlogMap.get(`${x.id}|${day}`)?.mod === 'dayOff');
  const state = met ? 'met' : day >= now ? 'open' : off || (allProtected && !(idx.due.get(day) || []).length) ? 'off' : 'miss';
  // quanto falta hoje para a meta
  const need = planned ? Math.max(0, Math.ceil(goal * planned - 1e-9) - done) : done > 0 ? 0 : 1;
  return { planned, done, pct, state, need };
}

// A ofensiva agora: { count, best, today, todayMet, broken, lastActive, idle, week }
export function streakInfo(S, now = today()) {
  const idx = index(S);
  const td = dayProgress(S, now, idx, now);
  let count = 0;
  let day = addDays(now, -1);
  let firstMiss = null;
  for (let i = 0; i < MAX_BACK; i++) {
    if (idx.first && day < idx.first) break;
    const st = dayProgress(S, day, idx, now).state;
    if (st === 'met') count++;
    else if (st === 'miss') {
      firstMiss = day;
      break;
    }
    day = addDays(day, -1);
  }
  // quebrou ontem: ontem falhou e antes dele havia uma ofensiva de 2 dias ou mais
  let broken = 0;
  const y = addDays(now, -1);
  if (count === 0 && firstMiss === y) {
    let d2 = addDays(y, -1);
    for (let i = 0; i < MAX_BACK; i++) {
      if (idx.first && d2 < idx.first) break;
      const st = dayProgress(S, d2, idx, now).state;
      if (st === 'met') broken++;
      else if (st === 'miss') break;
      d2 = addDays(d2, -1);
    }
    if (broken < 2) broken = 0;
  }
  // melhor ofensiva (no período olhado)
  let best = 0;
  let run = 0;
  for (let i = MAX_BACK; i >= 1; i--) {
    const d2 = addDays(now, -i);
    if (idx.first && d2 < idx.first) continue;
    const st = dayProgress(S, d2, idx, now).state;
    if (st === 'met') best = Math.max(best, ++run);
    else if (st === 'miss') run = 0;
  }
  const todayMet = td.state === 'met';
  const current = count + (todayMet ? 1 : 0);
  best = Math.max(best, current);
  let lastActive = null;
  for (const d2 of idx.active) if (d2 <= now && (!lastActive || d2 > lastActive)) lastActive = d2;
  const idle = lastActive ? daysBetween(lastActive, now) : idx.first ? daysBetween(idx.first, now) : 0;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d2 = addDays(now, i - 6);
    return { date: d2, state: dayProgress(S, d2, idx, now).state };
  });
  return { count: current, best, today: td, todayMet, broken, lastActive, idle, week, goal: streakGoal(S) };
}

// Humor do Lidinho para a ofensiva (widgets e app).
//   abandonado  3 dias ou mais sem fazer nada no Lida
//   feito       meta de hoje batida (pijama depois das 21h)
//   quebrada    a ofensiva quebrou ontem e hoje ainda não bateu a meta
//   urgente     18h ou mais, e a meta de hoje ainda não veio
//   manha       o resto (começo do dia)
export function streakMood(info, at = new Date(nowMs())) {
  const h = at.getHours();
  if (info.idle >= 3 && !info.todayMet) return 'abandonado';
  if (info.todayMet) return h >= 21 || h < 4 ? 'pijama' : 'feito';
  if (info.broken) return 'quebrada';
  if (h >= 18) return 'urgente';
  return 'manha';
}
