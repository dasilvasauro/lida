// Ofensiva: o dia conta quando a parte feita do programado chega à meta; folga não quebra.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage ??= (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
})();

const { streakInfo, streakMood, dayProgress } = await import('../js/core/streak.js');
const { addDays, weekday } = await import('../js/lib/util.js');

const NOW = '2026-11-18'; // quarta
const at = (d, h = 10) => new Date(`${d}T${String(h).padStart(2, '0')}:00`).getTime();
let n = 0;
const task = (due, doneDay = null) => ({ id: `t${n++}`, title: 'x', due, done: !!doneDay, doneAt: doneDay ? at(doneDay) : undefined, createdDay: '2026-10-01' });
const snap = (task, prefs = {}, habit = [], hlog = []) => ({ prefs: { streakGoal: 50, ...prefs }, task, habit, hlog, hlogMap: new Map(hlog.map((l) => [`${l.habitId}|${l.date}`, l])) });

// 10 dias para trás: 2 tarefas por dia, uma sempre feita, a outra só em dias alternados (50% ou 100%)
function history(days = 10) {
  const out = [];
  for (let i = days; i >= 1; i--) {
    const d = addDays(NOW, -i);
    out.push(task(d, d), task(d, i % 2 ? d : null));
  }
  return out;
}

test('ofensiva conta os dias que chegam à meta', () => {
  const S = snap([...history(), task(NOW, NOW), task(NOW)]);
  const s = streakInfo(S, NOW);
  assert.equal(s.count, 11, '10 dias + hoje (1 de 2 = 50%)');
  assert.equal(s.todayMet, true);
  assert.equal(s.week.length, 7);
  const t = dayProgress(S, NOW);
  assert.deepEqual([t.planned, t.done, t.need], [2, 1, 0]);
});

test('meta de 75%: os dias de 50% quebram', () => {
  const S = snap([...history(), task(NOW)], { streakGoal: 75 });
  const s = streakInfo(S, NOW);
  // ontem (i=1, ímpar) foi 100%; anteontem (i=2) 50%: a ofensiva é 1 e hoje ainda falta
  assert.equal(s.count, 1);
  assert.equal(s.todayMet, false);
  assert.equal(s.today.need, 1);
});

test('folga não quebra; dia sem nada programado pede uma ação', () => {
  const y = addDays(NOW, -1);
  const tasks = history(5).filter((t) => t.due !== y); // ontem sem nada
  let s = streakInfo(snap([...tasks, task(NOW)]), NOW);
  assert.equal(s.count, 0, 'ontem sem nada feito quebra');
  assert.ok(s.broken >= 2, 'e marca que quebrou');
  assert.equal(streakMood(s, new Date(`${NOW}T10:00`)), 'quebrada');
  s = streakInfo(snap([...tasks, task(NOW)], { daysOff: [weekday(y)] }), NOW);
  assert.equal(s.count, 4, 'com ontem de folga, os 4 dias antes continuam');
  s = streakInfo(snap([...tasks, task(NOW), task(null, y)]), NOW);
  assert.equal(s.count, 5, 'uma tarefa sem data concluída ontem basta');
});

test('hábitos entram na conta', () => {
  const h = { id: 'h', title: 'Ler', goal: 1, createdDay: '2026-10-01' };
  const log = (d, count) => ({ habitId: 'h', date: d, count });
  const S = snap([task(NOW)], {}, [h], [log(addDays(NOW, -1), 1), log(addDays(NOW, -2), 1), log(NOW, 1)]);
  const s = streakInfo(S, NOW);
  assert.equal(s.today.planned, 2);
  assert.equal(s.todayMet, true, 'hábito feito = 1 de 2');
  assert.equal(s.count, 3);
});

test('humor do Lidinho', () => {
  const base = { idle: 0, todayMet: false, broken: 0 };
  const h = (x) => new Date(`${NOW}T${String(x).padStart(2, '0')}:00`);
  assert.equal(streakMood(base, h(9)), 'manha');
  assert.equal(streakMood(base, h(19)), 'urgente');
  assert.equal(streakMood({ ...base, todayMet: true }, h(15)), 'feito');
  assert.equal(streakMood({ ...base, todayMet: true }, h(22)), 'pijama');
  assert.equal(streakMood({ ...base, idle: 4 }, h(10)), 'abandonado');
});
