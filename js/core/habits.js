// Hábitos, água, rotinas e desapego.
//
// Cada dia de um hábito é um registro próprio (hl_<hábito>_<dia>), então marcar o mesmo hábito
// em dois aparelhos não se sobrepõe a outros dias. Bater a meta do dia rende progresso de voucher
// (a cada 3, um voucher), num evento com id derivado (ev_hv_<hábito>_<dia>): desmarcar desfaz.
import { personal, P } from '../state.js';
import { HABIT_DAYS_ALL } from './model.js';
import { commit, useItemEvent, strip, xpFloorPenalty } from './game.js';
import { routineBatch, routineTaskId } from './tasks.js';
import { today, nowMs } from '../lib/clock.js';
import { addDays, weekday, daysBetween, isoOfMs, sum, uid } from '../lib/util.js';

export const isScheduled = (h, day) => (h.days || HABIT_DAYS_ALL).includes(weekday(day));
export const logOf = (S, h, day) => S.hlogMap.get(`${h.id}|${day}`) || null;
export const isDone = (S, h, day) => {
  const l = logOf(S, h, day);
  return (l?.count || 0) >= (h.goal || 1) || !!l?.mod;
};

// Sequência atual: dias programados seguidos cumpridos (ou protegidos), contando hoje se já feito.
export function streak(S, h, day = today()) {
  let n = 0;
  let d = isDone(S, h, day) ? day : addDays(day, -1);
  for (let i = 0; i < 800; i++) {
    if (h.createdDay && d < h.createdDay && !logOf(S, h, d)) break;
    if (!isScheduled(h, d)) {
      d = addDays(d, -1);
      continue;
    }
    if (!isDone(S, h, d)) break;
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function bestStreak(S, h) {
  const logs = (S.hlogByHabit.get(h.id) || []).map((l) => l.date).sort();
  if (!logs.length) return 0;
  let best = 0;
  let cur = 0;
  for (let d = logs[0]; d <= today(); d = addDays(d, 1)) {
    if (!isScheduled(h, d)) continue;
    if (isDone(S, h, d)) best = Math.max(best, ++cur);
    else if (d !== today()) cur = 0;
  }
  return best;
}

// Últimos 7 dias, do mais antigo para hoje: 'done' | 'part' | 'miss' | 'off' | 'free' | 'todo'.
export function week(S, h, day = today()) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(day, -i);
    const l = logOf(S, h, d);
    let st;
    if (!isScheduled(h, d)) st = 'off';
    else if (l?.mod) st = 'free';
    else if ((l?.count || 0) >= (h.goal || 1)) st = 'done';
    else if (l?.count) st = 'part';
    else st = d === day ? 'todo' : 'miss';
    out.push({ date: d, st });
  }
  return out;
}

export async function setCount(h, count, day = today()) {
  const S = P();
  const id = `hl_${h.id}_${day}`;
  const prev = logOf(S, h, day);
  const goal = h.goal || 1;
  const was = (prev?.count || 0) >= goal;
  const now = count >= goal;
  const batch = [{ type: 'hlog', id, data: { habitId: h.id, date: day, count: Math.max(0, count), ...(prev?.mod ? { mod: prev.mod } : {}) } }];
  const evId = `ev_hv_${h.id}_${day}`;
  if (now && !was && !personal.get(evId)) batch.push({ type: 'ev', id: evId, data: { kind: 'habit', ref: h.id, date: day, voucherProgress: 1 } });
  const res = await commit(batch);
  if (!now && was && personal.get(evId)) await personal.remove(evId);
  return { completed: now && !was, undone: was && !now, fraction: Math.min(1, count / goal), ...res };
}

// Toque no hábito: soma um até a meta; na meta, volta a zero.
export const tap = (h, day = today()) => {
  const c = logOf(P(), h, day)?.count || 0;
  return setCount(h, c >= (h.goal || 1) ? 0 : c + 1, day);
};

export async function protect(h, kind = 'freeze', day = today()) {
  const S = P();
  const item = kind === 'freeze' ? 'freeze' : 'dayOff';
  if (!(S.money.items[item] > 0)) return false;
  const prev = logOf(S, h, day);
  await personal.saveMany([useItemEvent(item, h.id), { type: 'hlog', id: `hl_${h.id}_${day}`, data: { habitId: h.id, date: day, count: prev?.count || 0, mod: kind } }]);
  return true;
}

// Folga: todos os hábitos programados para hoje ficam protegidos.
export async function dayOff(day = today()) {
  const S = P();
  if (!(S.money.items.dayOff > 0)) return false;
  const batch = [useItemEvent('dayOff', day)];
  for (const h of S.habit) if (!h.archived && isScheduled(h, day) && !isDone(S, h, day)) batch.push({ type: 'hlog', id: `hl_${h.id}_${day}`, data: { habitId: h.id, date: day, count: logOf(S, h, day)?.count || 0, mod: 'dayOff' } });
  await personal.saveMany(batch);
  return true;
}

export async function saveHabit(id, data) {
  const clean = { ...data, goal: Math.max(1, Math.min(99, Number(data.goal) || 1)) };
  if (!id) clean.createdDay = today();
  return personal.save('habit', clean, id || undefined);
}

export async function removeHabit(h) {
  const S = P();
  const ids = [h.id, ...(S.hlogByHabit.get(h.id) || []).map((l) => l.id)];
  await personal.removeMany(ids);
}

// Mensagens de incentivo por sequência alcançada.
export function cheer(n) {
  if (n === 1) return 'Primeiro dia feito. O começo é a parte mais difícil.';
  if (n === 3) return 'Três dias seguidos. O ritmo está chegando.';
  if (n === 7) return 'Uma semana inteira. Isso já é constância.';
  if (n === 14) return 'Duas semanas! Está virando parte do seu dia.';
  if (n === 21) return '21 dias. Dizem que é aqui que o hábito se firma.';
  if (n === 30) return 'Um mês inteiro. Que orgulho.';
  if (n > 30 && n % 50 === 0) return `${n} dias. Você é inspiração.`;
  return '';
}

/* ---------- Água ---------- */
export const waterGoal = (S = P()) => S.prefs.waterGoal || 2000;
export const waterGlass = (S = P()) => S.prefs.waterGlass || 250;
export const waterToday = (S = P(), day = today()) => sum(S.waterByDate.get(day) || [], (w) => w.ml || 0);

export async function addWater(ml, day = today()) {
  const S = P();
  const before = waterToday(S, day);
  const goal = waterGoal(S);
  const batch = [{ type: 'water', id: `wa_${uid(10)}`, data: { date: day, ml, at: nowMs() } }];
  const hit = before < goal && before + ml >= goal;
  if (hit && !personal.get(`ev_water_${day}`)) batch.push({ type: 'ev', id: `ev_water_${day}`, data: { kind: 'water', date: day, xp: 20, gold: 10 } });
  const res = await commit(batch);
  return { total: before + ml, goal, hit, ...res };
}

export async function undoWater(day = today()) {
  const S = P();
  const list = [...(S.waterByDate.get(day) || [])].sort((a, b) => (b.at || 0) - (a.at || 0));
  if (!list.length) return null;
  await personal.remove(list[0].id);
  if (waterToday(P(), day) < waterGoal() && personal.get(`ev_water_${day}`)) await personal.remove(`ev_water_${day}`);
  return list[0].ml;
}

/* ---------- Rotinas ---------- */
export const MAX_ROUTINES = 5;

export async function saveRoutine(id, data) {
  const rid = id || uid();
  await personal.save('routine', data, rid);
  const day = today();
  const tid = routineTaskId(rid, day);
  const t = personal.get(tid);
  const scheduled = (data.weekdays || HABIT_DAYS_ALL).includes(weekday(day));
  if (t && !t.done) {
    if (!scheduled) await personal.remove(tid);
    else {
      const old = new Map((t.subtasks || []).map((s) => [s.title, s.done]));
      await personal.patch(tid, { title: data.title, color: data.color, subtasks: (data.items || []).map((title, i) => ({ id: `i${i}`, title, done: !!old.get(title) })) });
    }
  } else if (!t && scheduled) {
    const batch = routineBatch(P(), day);
    if (batch.length) await personal.saveMany(batch);
  }
  return rid;
}

export async function removeRoutine(r) {
  const tid = routineTaskId(r.id, today());
  const t = personal.get(tid);
  await personal.removeMany([r.id, ...(t && !t.done ? [tid] : [])]);
}

/* ---------- Desapego ---------- */
const QUIT_REWARD = [
  [60, 100],
  [80, 170],
  [100, 210],
  [200, 300],
  [250, 350],
  [300, 400],
  [500, 500],
];
export const quitSlots = (S = P()) => 1 + (S.money.items.extraQuitter || 0);
export const daysClean = (q, day = today()) => Math.max(0, daysBetween(isoOfMs(q.lastRelapseAt || q._ca || nowMs()), day));
export const nextQuitReward = (q) => {
  const n = (q.rewardCycle || 0) >= 7 ? 1 : (q.rewardCycle || 0) + 1;
  const [gold, xp] = QUIT_REWARD[n - 1];
  return { n, gold, xp, card: n === 7 };
};

export async function addQuit(title) {
  return personal.save('quit', { title, lastRelapseAt: nowMs(), checkins: [], rewardCycle: 0 });
}

export async function checkinQuit(q, day = today()) {
  if ((q.checkins || []).includes(day)) return null;
  const r = nextQuitReward(q);
  const res = await commit([
    { type: 'quit', id: q.id, data: { ...strip(q), checkins: [...(q.checkins || []).slice(-60), day], rewardCycle: r.n } },
    { type: 'ev', id: `ev_quit_${q.id}_${day}`, data: { kind: 'quit', ref: q.id, date: day, xp: r.xp, gold: r.gold, items: r.card ? { luckyCard: 1 } : undefined } },
  ]);
  return { ...r, ...res };
}

// Recaída: o dia 1 recomeça e metade do progresso do nível e do ouro é perdida (regra do Lida).
export async function relapseQuit(q) {
  const loss = xpFloorPenalty(0.5);
  await personal.saveMany([
    { type: 'quit', id: q.id, data: { ...strip(q), lastRelapseAt: nowMs(), checkins: [], rewardCycle: 0 } },
    { type: 'ev', id: `ev_relapse_${q.id}_${uid(6)}`, data: { kind: 'relapse', ref: q.id, date: today(), ...loss } },
  ]);
  return loss;
}

export async function removeQuit(q) {
  const loss = xpFloorPenalty(0.5);
  await personal.saveMany([{ type: 'ev', id: `ev_quitdel_${q.id}`, data: { kind: 'relapse', ref: q.id, date: today(), ...loss } }]);
  await personal.remove(q.id);
  return loss;
}
