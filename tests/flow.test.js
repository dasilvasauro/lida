// Flow: fila, ordem, horários, pausa e resumo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../js/core/flow.js';

const DAY = '2026-11-19';
const at = (hh, mm = 0) => new Date(`${DAY}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`).getTime();
function state(tasks, routines = []) {
  const task = tasks.map((t, i) => ({ priority: 'P4', _ca: i + 1, ...t }));
  const byId = new Map([...task, ...routines].map((x) => [x.id, x]));
  return { task, routine: routines, byId, ev: [] };
}

test('fila sugerida: hoje, atrasadas e rotinas de hoje; entrada e próximos à parte', () => {
  const S = state([
    { id: 'a', due: DAY },
    { id: 'b', due: '2026-11-17' },
    { id: 'c' },
    { id: 'd', due: '2026-11-22' },
    { id: 'e', due: DAY, done: true },
    { id: 'r', kind: 'routine', due: DAY, routineId: 'R' },
    { id: 'r0', kind: 'routine', due: '2026-11-18', routineId: 'R' },
    { id: 's', kind: 'sprint', due: DAY },
  ]);
  const c = F.flowCandidates(S, DAY);
  assert.deepEqual(c.queue.map((t) => t.id).sort(), ['a', 'b', 'r']);
  assert.deepEqual(c.inbox.map((t) => t.id), ['c']);
  assert.deepEqual(c.later.map((t) => t.id), ['d']);
});

test('ordem: prioridade, criação e personalizada', () => {
  const S = state([
    { id: 'x', priority: 'P3', due: DAY },
    { id: 'y', priority: 'P0', due: DAY },
    { id: 'z', priority: 'P1', due: DAY, time: '09:00' },
    { id: 'w', priority: 'P1', due: DAY, time: '08:00' },
  ]);
  assert.deepEqual(F.orderFlow(S.task, 'priority').map((t) => t.id), ['y', 'w', 'z', 'x']);
  assert.deepEqual(F.orderFlow(S.task, 'created').map((t) => t.id), ['x', 'y', 'z', 'w']);
  assert.deepEqual(F.orderFlow(S.task, 'custom', ['z', 'x', 'y', 'w']).map((t) => t.id), ['z', 'x', 'y', 'w']);
});

test('concluir, pular e tirar', () => {
  let f = F.newFlow({ ids: ['a', 'b', 'c'] }, at(9));
  assert.equal(F.flowCur(f), 'a');
  f = F.advance(f, 'skip', at(9, 5));
  assert.deepEqual(f.queue, ['b', 'c', 'a']);
  f = F.advance(f, 'done', at(9, 10));
  assert.deepEqual(f.queue, ['c', 'a']);
  assert.deepEqual(f.done, ['b']);
  f = F.advance(f, 'remove', at(9, 11));
  assert.deepEqual(f.queue, ['a']);
  assert.equal(f.total, 2);
  // a única: pular não faz nada
  assert.deepEqual(F.advance(f, 'skip', at(9, 12)).queue, ['a']);
});

test('horário: só depois do começo, um por vez, e cada modo põe no lugar certo', () => {
  const S = state([
    { id: 'a', due: DAY },
    { id: 'b', due: DAY, time: '10:00' },
    { id: 'c', due: DAY, time: '08:30' },
    { id: 'd', due: DAY },
  ]);
  const f = F.newFlow({ ids: ['a', 'd', 'c', 'b'] }, at(9));
  assert.equal(F.dueNow(f, S, DAY, at(9, 59)), null); // 08:30 já tinha passado; 10:00 ainda não
  const due = F.dueNow(f, S, DAY, at(10));
  assert.equal(due.id, 'b');
  const auto = F.promote(f, 'b', 'auto', at(10));
  assert.deepEqual(auto.queue, ['b', 'a', 'd', 'c']); // a interrompida volta para o topo
  assert.equal(auto.curSince, at(10));
  assert.equal(F.dueNow(auto, S, DAY, at(10, 1)), null); // já tratada
  const wait = F.promote(f, 'b', 'wait', at(10));
  assert.deepEqual(wait.queue, ['a', 'b', 'd', 'c']);
  assert.equal(wait.curSince, f.curSince);
  // pausado: nada troca
  assert.equal(F.dueNow(F.pauseFlow(f, at(9, 50)), S, DAY, at(10)), null);
});

test('rotina usa o alarme como horário', () => {
  const S = state([{ id: 'rt', kind: 'routine', due: DAY, routineId: 'R' }], [{ id: 'R', alarmTime: '07:15' }]);
  assert.equal(F.schedMin(S, S.byId.get('rt'), DAY), 7 * 60 + 15);
  assert.equal(F.schedMin(S, S.byId.get('rt'), '2026-11-20'), null);
});

test('pausa não conta no tempo do Flow nem no da tarefa', () => {
  let f = F.newFlow({ ids: ['a', 'b'] }, at(9));
  f = F.pauseFlow(f, at(9, 10));
  assert.equal(F.flowElapsed(f, at(9, 40)), 10 * 60000);
  assert.equal(F.curElapsed(f, at(9, 40)), 10 * 60000);
  f = F.resumeFlow(f, at(9, 40));
  assert.equal(f.pauses, 1);
  assert.equal(F.flowElapsed(f, at(9, 50)), 20 * 60000);
  assert.equal(F.curElapsed(f, at(9, 50)), 20 * 60000);
  f = F.advance(f, 'done', at(9, 50));
  const g = F.endFlow(F.advance(f, 'done', at(10)), at(10));
  const r = F.flowRecord(g, DAY, at(10));
  assert.equal(r.done, 2);
  assert.equal(r.cleared, true);
  assert.equal(r.sec, 30 * 60);
  assert.equal(F.flowActive(g), false);
});

test('tarefa concluída fora do Flow sai da fila e conta', () => {
  const S = state([{ id: 'a', due: DAY, done: true }, { id: 'b', due: DAY }]);
  const f = F.cleanFlow(F.newFlow({ ids: ['a', 'b'] }, at(9)), S, at(9, 3));
  assert.deepEqual(f.queue, ['b']);
  assert.deepEqual(f.done, ['a']);
  assert.equal(f.curSince, at(9, 3));
});

test('resumo e números das conquistas', () => {
  const S = state([{ id: 'a', title: 'A', due: DAY }, { id: 'b', title: 'B', due: DAY }]);
  const f = F.newFlow({ ids: ['a', 'b'] }, at(9));
  const s = F.flowSummary(S, f, at(9, 1));
  assert.equal(s.cur.title, 'A');
  assert.deepEqual(s.next, ['B']);
  assert.equal(s.total, 2);
  assert.equal(s.elapsedSec, 60);
  S.ev = [
    { kind: 'flow', done: 4, sec: 3000, cleared: true },
    { kind: 'flow', done: 12, sec: 4000, cleared: false },
    { kind: 'flow', done: 0, sec: 600 },
  ];
  assert.deepEqual(F.flowStats(S), { flows: 2, flowBest: 12, flowCleared: 1, flowH: 1 });
});
