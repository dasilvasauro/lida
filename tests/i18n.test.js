// Idiomas e alarmes: todo texto da interface tem tradução, o tradutor da tela acerta lacunas e
// separadores, a adição rápida entende inglês e espanhol, e a lista de alarmes sai na ordem certa.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.localStorage ??= (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
})();

const { extract } = await import('../scripts/i18n-extract.mjs');
const en = (await import('../js/i18n/en.js')).default;
const es = (await import('../js/i18n/es.js')).default;
const i18n = await import('../js/core/i18n.js');

test('todo texto da interface tem tradução em inglês e espanhol', () => {
  const ignore = new Set(JSON.parse(readFileSync(new URL('../scripts/i18n-ignore.json', import.meta.url), 'utf8')));
  const missing = [...extract().keys()].filter((k) => !ignore.has(k) && (!(k in en) || !(k in es)));
  assert.deepEqual(missing, [], 'rode node scripts/i18n-extract.mjs e traduza em js/i18n/en.js e es.js');
});

test('as traduções têm as mesmas lacunas que o português', () => {
  const ph = (s) => [...s.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort().join();
  const bad = [];
  for (const [name, d] of [['en', en], ['es', es]]) for (const [k, v] of Object.entries(d)) if (ph(k) !== ph(v)) bad.push(`${name}: ${k}`);
  assert.deepEqual(bad, []);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort(), 'en.js e es.js com as mesmas chaves');
});

test('tradutor: texto exato, lacunas, separadores e listas', () => {
  i18n.setDict(en);
  const { t } = i18n;
  assert.equal(t('Hoje'), 'Today');
  assert.equal(t('  Hoje\n'), '  Today\n');
  assert.equal(t('Nível 7'), 'Level 7');
  assert.equal(t('Em 3 dias'), 'In 3 days', 'a lacuna também é traduzida');
  assert.equal(t('Hoje: +40 XP, +10 de ouro'), 'Today: +40 XP, +10 gold', 'lacuna vazia no fim');
  assert.equal(t('Ativo · Em prática toda semana.'), 'Active · Practiced every week.');
  assert.equal(t('Organizado · Virou cronograma e tarefas.'), 'Organized · Turned into a schedule and tasks.', 'lacuna não engole o separador');
  assert.equal(t('Diligente: +3 vouchers + Carta da Sorte'), 'Diligent: +3 vouchers + Luck Card');
  assert.equal(t('Empresa X'), 'Empresa X', 'o que não está no dicionário fica igual');
  assert.equal(t('Salvar'), 'Save');
  i18n.setDict(es);
  assert.equal(t('Nível 7'), 'Nivel 7');
  assert.equal(t('Pelos que você já tem (Iniciado, Diligente e Perseverante)'), 'Pelos que você já tem (Iniciado, Diligente e Perseverante)');
  i18n.setDict(null);
  assert.equal(t('Hoje'), 'Hoje', 'sem dicionário, português');
});

test('adição rápida em inglês e espanhol', async () => {
  const { parseQuick } = await import('../js/core/parse.js');
  const ctx = { today: '2026-11-12', projects: [{ id: 'w', name: 'Work' }], tags: [] }; // quinta
  let r = parseQuick('Pay bills tomorrow 9am p1 #work', { ...ctx, lang: 'en' });
  assert.deepEqual([r.title, r.due, r.time, r.priority, r.projectId], ['Pay bills', '2026-11-13', '09:00', 'P1', 'w']);
  r = parseQuick('Gym every monday and wednesday 7:00', { ...ctx, lang: 'en' });
  assert.deepEqual([r.title, r.recurrence.weekdays, r.time], ['Gym', [1, 3], '07:00']);
  r = parseQuick('Dentist 1/20 at 10', { ...ctx, lang: 'en' });
  assert.deepEqual([r.due, r.time], ['2027-01-20', '10:00'], 'mês/dia no inglês');
  r = parseQuick('Read in 3 days 8pm', { ...ctx, lang: 'en' });
  assert.deepEqual([r.due, r.time], ['2026-11-15', '20:00']);
  r = parseQuick('Gimnasio todos los lunes y miércoles 7h', { ...ctx, lang: 'es' });
  assert.deepEqual([r.title, r.recurrence.weekdays], ['Gimnasio', [1, 3]]);
  r = parseQuick('Alquiler el día 5 cada mes', { ...ctx, lang: 'es' });
  assert.deepEqual([r.title, r.due, r.recurrence], ['Alquiler', '2026-12-05', { type: 'monthly', dayOfMonth: 5 }]);
  r = parseQuick('Ir al mar pasado mañana', { ...ctx, lang: 'es' });
  assert.deepEqual([r.title, r.due], ['Ir al mar', '2026-11-14'], '"mar" não vira terça');
  r = parseQuick('Sex ed class tomorrow', { ...ctx, lang: 'en' });
  assert.equal(r.title, 'Sex ed class', 'palavras do português não valem no inglês');
});

test('alarmes: próximos toques e limite', async () => {
  const { upcoming, alarmCount, canAddAlarm, MAX_ALARMS } = await import('../js/core/alarms.js');
  const from = new Date(2026, 10, 12, 8, 0).getTime(); // quinta, 08:00
  const S = {
    task: [
      { id: 'a', title: 'Reunião', due: '2026-11-12', time: '09:30', alarm: 'digital', notes: 'Sala 2' },
      { id: 'b', title: 'Sem horário', due: '2026-11-12', alarm: 'classico' },
      { id: 'c', title: 'Feita', due: '2026-11-12', time: '10:00', alarm: 'classico', done: true },
    ],
    routine: [{ id: 'r', title: 'Manhã', time: '07:00', weekdays: [5], items: ['Água', 'Alongar'], alarm: 'sinos' }],
    habit: [{ id: 'h', title: 'Ler', alarm: 'passaros', alarmTime: '21:00', days: [0, 1, 2, 3, 4, 5, 6], notes: 'Antes de dormir' }],
  };
  const list = upcoming(S, { days: 7, from });
  assert.deepEqual(list.map((a) => [a.kind, a.ref, new Date(a.at).getDate(), a.time]), [
    ['task', 'a', 12, '09:30'],
    ['habit', 'h', 12, '21:00'],
    ['routine', 'r', 13, '07:00'], // rotina de sexta: a de hoje (07:00) já passou e hoje é quinta
  ]);
  assert.equal(list[0].desc, 'Sala 2');
  assert.equal(list[2].desc, 'Água · Alongar');
  assert.equal(list[0].tone, 'digital');
  assert.equal(alarmCount(S), 3, 'sem horário e concluída não contam');
  const many = { routine: [], habit: [], task: Array.from({ length: MAX_ALARMS }, (_, i) => ({ id: `t${i}`, title: 'x', due: '2026-11-20', time: '10:00', alarm: 'classico' })) };
  assert.equal(canAddAlarm(many), false);
  assert.equal(canAddAlarm(many, 't0'), true, 'editar um que já tem alarme não esbarra no limite');
});
