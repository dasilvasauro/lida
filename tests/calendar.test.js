// Calendário: repetições previstas (as frequentes viram faixa no mês), hábitos e linha do tempo.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { itemsBetween, frequentSummary, layoutDay, monthGrid, habitsDay } = await import('../js/core/calendar.js');

const NOW = '2026-11-18';
const snap = (task, extra = {}) => ({ task, routine: [], habit: [], hlog: [], hlogMap: new Map(), byId: new Map(task.map((t) => [t.id, t])), ...extra });

test('repetições: a ocorrência atual e as previstas; frequentes marcadas', () => {
  const S = snap([
    { id: 'a', title: 'Ler', due: NOW, recurrence: { type: 'daily' }, priority: 'P3' },
    { id: 'b', title: 'Feira', due: NOW, recurrence: { type: 'weekly', weekdays: [3] } },
    { id: 'c', title: 'Velha', due: '2026-11-10', done: true, doneAt: Date.parse('2026-11-10T12:00') },
  ]);
  const m = itemsBetween(S, '2026-11-15', '2026-11-30', { today: NOW });
  assert.equal(m.get(NOW).filter((x) => x.kind === 'task').length, 2);
  assert.equal(m.get('2026-11-25').filter((x) => x.kind === 'ghost').map((x) => x.title).sort().join(), 'Feira,Ler');
  assert.ok(m.get('2026-11-19').every((x) => x.kind !== 'ghost' || x.freq), 'Ler é frequente');
  assert.deepEqual(frequentSummary(m).daily, ['Ler']);
  assert.equal(m.has('2026-11-10'), false, 'fora da janela');
});

test('a próxima ocorrência já criada não aparece duas vezes', () => {
  const t = { id: 'a', title: 'Ler', due: NOW, recurrence: { type: 'daily' } };
  const next = { id: `rc_a_2026-11-19`, title: 'Ler', due: '2026-11-19', series: 'a', recurrence: { type: 'daily' } };
  const m = itemsBetween(snap([t, next]), NOW, '2026-11-20', { today: NOW });
  assert.equal(m.get('2026-11-19').length, 1);
  assert.equal(m.get('2026-11-19')[0].kind, 'task');
});

test('eventos externos de dia inteiro e com horário', () => {
  const ev = [
    { id: 'e1', title: 'Feriado', allDay: true, date: '2026-11-20', endDate: '2026-11-21', color: '#f00' },
    { id: 'e2', title: 'Call', allDay: false, start: Date.parse(`${NOW}T10:00`), end: Date.parse(`${NOW}T11:30`) },
  ];
  const m = itemsBetween(snap([]), NOW, '2026-11-22', { today: NOW, events: ev });
  assert.equal(m.get('2026-11-21')[0].title, 'Feriado');
  const call = m.get(NOW)[0];
  assert.deepEqual([call.min, call.dur], [600, 90]);
});

test('linha do tempo divide os horários que se sobrepõem', () => {
  const lay = layoutDay([{ min: 600, dur: 60 }, { min: 630, dur: 30 }, { min: 720, dur: 30 }]);
  assert.deepEqual(lay.map((x) => [x.lane, x.lanes]), [[0, 2], [1, 2], [0, 1]]);
});

test('grade do mês começa no domingo e hábitos contam feitos/total', () => {
  const g = monthGrid('2026-11');
  assert.equal(g[0][0], '2026-11-01');
  assert.equal(g.length, 5);
  const S = snap([], { habit: [{ id: 'h', title: 'Água', goal: 2 }], hlogMap: new Map([['h|2026-11-17', { count: 2 }]]) });
  assert.deepEqual([habitsDay(S, '2026-11-17', NOW).done, habitsDay(S, '2026-11-25', NOW).done], [1, 0]);
});
