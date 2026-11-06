// Testes do núcleo (rodam no Node, com um IndexedDB em memória): npm test
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage ??= (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
})();

const { nextOccurrence, levelTitle, levelOf, wallet, recurrenceLabel } = await import('../js/core/model.js');
const { openDB } = await import('../js/lib/idb.js');
const { createKey } = await import('../js/lib/crypto.js');
const { initHLC } = await import('../js/lib/hlc.js');
const { personal, P } = await import('../js/state.js');
const tasks = await import('../js/core/tasks.js');
const legacy = await import('../js/core/legacy.js');
const { today } = await import('../js/lib/clock.js');
const { addDays } = await import('../js/lib/util.js');

initHLC('test01');
const { key } = await createKey('senha-de-teste');
await personal.init(await openDB('lida3-test'), key);

test('repetição: próxima data', () => {
  assert.equal(nextOccurrence('2026-11-06', { type: 'daily' }), '2026-11-07');
  assert.equal(nextOccurrence('2026-11-06', { type: 'daily', every: 3 }), '2026-11-09');
  // 06/11/2026 é sexta (5). Dias úteis: a próxima é segunda, 09/11.
  assert.equal(nextOccurrence('2026-11-06', { type: 'weekly', weekdays: [1, 2, 3, 4, 5] }), '2026-11-09');
  assert.equal(nextOccurrence('2026-11-06', { type: 'weekly', weekdays: [5] }), '2026-11-13');
  assert.equal(nextOccurrence('2026-01-31', { type: 'monthly', dayOfMonth: 31 }), '2026-02-28');
  assert.equal(nextOccurrence('2028-02-29', { type: 'yearly', dayOfMonth: 29, monthOfYear: 1 }), '2029-02-28');
  assert.equal(nextOccurrence('2026-11-06', { type: 'none' }), null);
  assert.equal(recurrenceLabel({ type: 'weekly', weekdays: [1, 2, 3, 4, 5] }), 'Dias úteis');
});

test('níveis e títulos', () => {
  assert.equal(levelOf(0), 1);
  assert.equal(levelOf(2500), 6);
  assert.equal(levelTitle(1), 'Aprendiz');
  assert.equal(levelTitle(41), 'Grão-Mestre');
  const w = wallet([{ xp: 10, gold: 5, voucherProgress: 2 }, { xp: 5, voucherProgress: 2, items: { dado: 1 } }]);
  assert.deepEqual([w.xp, w.gold, w.vouchers, w.voucherProgress, w.items.dado], [15, 5, 1, 1, 1]);
});

test('concluir dá recompensa; reabrir devolve', async () => {
  const id = await tasks.addTask({ title: 'Escrever relatório', priority: 'P1', due: today() });
  const r = await tasks.toggleTask(id);
  assert.equal(r.done, true);
  assert.deepEqual(r.reward, { xp: 100, gold: 40 });
  assert.equal(P().money.xp, 100);
  assert.ok(tasks.buckets(P()).doneToday.some((t) => t.id === id));
  await tasks.toggleTask(id);
  assert.equal(P().money.xp, 0);
  assert.equal(P().byId.get(id).done, undefined);
});

test('tarefa repetida gera a próxima uma única vez, com id previsível', async () => {
  const d = today();
  const id = await tasks.addTask({ title: 'Regar as plantas', due: d, recurrence: { type: 'daily' } });
  await tasks.toggleTask(id);
  const nextId = `rc_${id}_${addDays(d, 1)}`;
  const next = P().byId.get(nextId);
  assert.ok(next, 'próxima ocorrência criada');
  assert.equal(next.series, id);
  assert.equal(next.done, undefined);
  // Reabrir e concluir de novo não duplica.
  await tasks.toggleTask(id);
  await tasks.toggleTask(id);
  assert.equal(P().task.filter((t) => t.series === id).length, 1);
  // A série continua a partir da cópia.
  await tasks.toggleTask(nextId);
  assert.ok(P().byId.get(`rc_${id}_${addDays(d, 2)}`));
});

test('lembretes: só tarefas abertas com data e horário, mais o fechamento do dia', async () => {
  const d = addDays(today(), 1);
  await tasks.addTask({ title: 'Dentista', due: d, time: '09:30' });
  await tasks.addTask({ title: 'Sem horário', due: d });
  const items = tasks.reminders(P(), { tasks: true, daily: true, dailyAt: '21:00' });
  const t = items.filter((x) => x.key.startsWith('task:'));
  assert.equal(t.length, 1);
  assert.equal(t[0].title, 'Dentista');
  assert.match(t[0].body, /Amanhã às 9:30/);
  assert.equal(items.filter((x) => x.key.startsWith('daily:')).length, 14);
});

/* ---------- Importação do Lida anterior ---------- */
const OLD = {
  tasks: [
    { id: 't1', title: 'Pagar aluguel', priority: 'P0', type: 'normal', deadlineDate: '2026-11-10', deadlineTime: '10:00', subtasks: [{ id: 's', title: 'Pix', completed: true }], recurrence: { type: 'monthly', dayOfMonth: 10 }, createdAt: 1 },
    { id: 't2', title: 'Velha', priority: 'P3', type: 'daily_challenge', isCompleted: true, completedAt: 5, isArchived: true },
  ],
  folders: [{ id: 'default', name: 'Geral' }, { id: 'f1', name: 'Casa', color: '#fff' }],
  routines: [],
  moodHistory: { '2026-11-01': 'bom' },
  habits: { habits: [{ id: 'h1', title: 'Água', type: 'positive', goal: 8 }], logs: { h1: { '2026-11-01': 5 } }, modifiers: {}, quitterItems: [] },
  economy: { xp: 1234, gold: 300, vouchers: 2, purchasedThemes: ['pink', 'matrix'] },
  config: { userName: 'Bruno', theme: 'todoist', font: 'serif', lastLoginDate: '2026-11-05' },
};

test('converte o formato antigo em registros', () => {
  const recs = legacy.toRecords(OLD);
  const by = (id) => recs.find((r) => r.id === id);
  assert.equal(by('t1').data.kind, 'normal');
  assert.equal(by('t1').data.due, '2026-11-10');
  assert.deepEqual(by('t1').data.subtasks, [{ id: 's', title: 'Pix', done: true }]);
  assert.equal(by('t2').data.kind, 'challenge');
  assert.equal(by('f1').type, 'project');
  assert.equal(by('default'), undefined);
  assert.equal(by('hl_h1_2026-11-01').data.count, 5);
  assert.equal(by('ev_import').data.xp, 1234);
  assert.deepEqual(by('wallet').data.themes, ['rosa', 'matrix', 'tomate']);
  assert.equal(by('prefs').data.theme, 'tomate');
  assert.equal(by('prefs').data.font, 'lora');
  assert.equal(recs.filter((r) => r.type === 'note' || r.type === 'feed').length, 0);
});

test('importar duas vezes não duplica', async () => {
  const recs = legacy.toRecords(OLD);
  await personal.importPlain(legacy.toPlain(recs, 'local'));
  const n = personal.stats().live;
  await personal.importPlain(legacy.toPlain(legacy.toRecords(OLD), 'local'));
  assert.equal(personal.stats().live, n);
  assert.equal(P().byId.get('t1').title, 'Pagar aluguel');
});

// Monta um cofre v2 igual ao do Lida anterior (PBKDF2 → AES-GCM, iv||ct em base64, contexto como AAD).
async function makeVault(pin, shards) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = Buffer.from(salt).toString('base64');
  const kdf = { salt: saltB64, iterations: 1000, hash: 'SHA-256' };
  const mat = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: 1000, salt }, mat, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const seal = async (text, ctx) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(ctx) }, k, enc.encode(text)));
    return Buffer.concat([iv, ct]).toString('base64');
  };
  const out = {};
  for (const [id, c] of Object.entries(shards)) out[id] = { c: await seal(JSON.stringify(c), `lida:${saltB64}:${id}`) };
  return { meta: { kdf, keyCheck: await seal('lida-vault-v2', 'key-check') }, shards: out };
}

test('abre o cofre v2 da nuvem com a Chave Mestra', async () => {
  const vault = await makeVault('minha-chave', {
    't-0': { tasks: OLD.tasks },
    'tasks-meta': { folders: OLD.folders, routines: [], moodHistory: {} },
    'n-0': { notes: [{ id: 'x', text: 'nota' }] },
    economy: { ledger: { base: { xp: 100, gold: 10 }, devices: { a: { delta: { xp: 50 } } }, events: { e1: { gold: 5 } } }, purchasedThemes: ['pink'] },
  });
  await assert.rejects(legacy.decryptVault(vault, 'errada'), (e) => e.code === 'bad-pass');
  const L = await legacy.decryptVault(vault, 'minha-chave');
  assert.equal(L.tasks.length, 2);
  assert.equal(L.economy.xp, 150);
  assert.equal(L.economy.gold, 15);
  assert.equal(L.notes, undefined);
});
