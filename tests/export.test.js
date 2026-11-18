// Exportar: CSV de tarefas e de hábitos (aspas, vírgulas, acentos) e o JSON com tudo.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
const E = await import('../js/core/export.js');

const S = {
  project: [{ id: 'p', name: 'Casa' }],
  tag: [{ id: 'g', name: 'contas' }],
  task: [
    { id: 't1', title: 'Pagar "luz", água', due: '2026-11-20', time: '09:00', priority: 'P1', projectId: 'p', tags: ['g'], notes: 'linha 1\nlinha 2', subtasks: [{ title: 'boleto', done: true }], createdDay: '2026-11-18' },
    { id: 't2', title: 'Sem data', done: true, doneAt: Date.UTC(2026, 10, 18, 12), priority: 'P4' },
  ],
  habit: [{ id: 'h', title: 'Ler', goal: 10, unit: 'páginas' }],
  hlog: [{ habitId: 'h', date: '2026-11-17', count: 10 }, { habitId: 'h', date: '2026-11-18', count: 4 }],
};

test('CSV das tarefas', () => {
  const csv = E.tasksCsv(S);
  assert.ok(csv.startsWith('﻿id,Título,'));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[1].includes('"Pagar ""luz"", água"'), 'aspas e vírgula escapadas');
  assert.ok(lines[1].includes('"linha 1\nlinha 2"'), 'quebra de linha dentro de aspas');
  assert.ok(lines[1].includes(',Casa,contas,'));
  assert.ok(lines[1].includes('[x] boleto'));
  assert.ok(lines[2].includes('Concluída') && lines[2].includes('2026-11-18T12:00:00.000Z'));
});

test('CSV dos hábitos', () => {
  const lines = E.habitsCsv(S).trim().split('\r\n');
  assert.deepEqual(lines.slice(1), ['2026-11-17,Ler,10,10,páginas,Feito', '2026-11-18,Ler,4,10,páginas,Parcial']);
});

test('JSON com tudo, sem excluídos', () => {
  const recs = [
    { id: 't1', type: 'task', data: { title: 'A' } },
    { id: 't9', type: 'task', del: true },
    { id: 'h', type: 'habit', data: { title: 'Ler' } },
    { id: 'x', type: 'desconhecido', data: {} },
  ];
  const j = JSON.parse(E.allJson(recs, { version: '3.0.0', at: 0 }));
  assert.equal(j.format, 'lida-export');
  assert.deepEqual(j.tasks, [{ id: 't1', title: 'A' }]);
  assert.deepEqual(j.habits, [{ id: 'h', title: 'Ler' }]);
  assert.equal(j.moods, undefined);
});
