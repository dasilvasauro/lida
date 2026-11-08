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
const { reminders } = await import('../js/core/reminders.js');
const legacy = await import('../js/core/legacy.js');
const { today } = await import('../js/lib/clock.js');
const { addDays } = await import('../js/lib/util.js');
const game = await import('../js/core/game.js');
const habits = await import('../js/core/habits.js');
const { shiftDays, resetClock, initClock } = await import('../js/lib/clock.js');

initHLC('test01');
const { key } = await createKey('senha-de-teste');
await personal.init(await openDB('lida3-test'), key);

test('repetição: próxima data', () => {
  assert.equal(nextOccurrence('2026-11-06', { type: 'daily' }), '2026-11-07');
  assert.equal(nextOccurrence('2026-11-06', { type: 'daily', every: 3 }), '2026-11-09');
  // 06/11/2026 é sexta (5). Dias úteis: a próxima é segunda, 09/11.
  assert.equal(nextOccurrence('2026-11-06', { type: 'weekly', weekdays: [1, 2, 3, 4, 5] }), '2026-11-09');
  assert.equal(nextOccurrence('2026-11-06', { type: 'weekly', weekdays: [5] }), '2026-11-13');
  // Segunda, quarta e sexta: depois de sexta vem segunda; depois de segunda, quarta.
  assert.equal(nextOccurrence('2026-11-06', { type: 'weekly', weekdays: [1, 3, 5] }), '2026-11-09');
  assert.equal(nextOccurrence('2026-11-09', { type: 'weekly', weekdays: [1, 3, 5] }), '2026-11-11');
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
  assert.deepEqual([r.reward.xp, r.reward.gold], [100, 40]);
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
  const items = reminders(P(), { tasks: true, daily: true, dailyAt: '21:00' });
  const t = items.filter((x) => x.key.startsWith('task:'));
  assert.equal(t.length, 1);
  assert.equal(t[0].title, 'Dentista');
  assert.match(t[0].body, /Amanhã às 9:30/);
  assert.ok(items.filter((x) => x.key.startsWith('daily:')).length >= 13);
  assert.ok(t[0].long.includes('Amanhã às 9:30'));
  assert.equal(t[0].actions, 'TASK');
  const w = reminders(P(), { water: true, waterFrom: '09:00', waterTo: '21:00', waterEvery: 2 });
  assert.ok(w.every((x) => x.key.startsWith('water:') && x.actions === 'WATER'));
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

/* ---------- Regras de jogo ---------- */
const give = (data) => personal.saveMany([{ type: 'ev', id: `ev_t_${Math.random()}`, data }]);

test('loja: compra só com saldo; Sorte instantânea vira Carta da Sorte', async () => {
  const g0 = P().money.gold;
  assert.equal((await game.buy('xpBoost')).ok, g0 >= 300);
  await give({ gold: 1000, vouchers: 10 });
  assert.equal((await game.buy('respite')).ok, true);
  assert.equal(P().money.items.respite >= 1, true);
  const cards = P().money.items.luckyCard || 0;
  await game.buy('instantLuck');
  assert.equal(P().money.items.luckyCard, cards + 1);
  assert.equal(P().money.items.instantLuck || 0, 0);
});

test('Respiro empurra o horário em 3 horas e gasta o item', async () => {
  const id = await tasks.addTask({ title: 'Reunião', due: today(), time: '14:15' });
  const n = P().money.items.respite;
  assert.equal(await game.applyTaskItem('respite', P().byId.get(id)), true);
  assert.equal(P().byId.get(id).time, '17:15');
  assert.equal(P().money.items.respite, n - 1);
});

test('limite de P0 até o nível 30, furado por P0 Extra', async () => {
  const before = P().task.filter((t) => t.priority === 'P0' && !t.done && !t.failed && (!t.due || t.due === today())).length;
  if (!before) await tasks.addTask({ title: 'Crítica', priority: 'P0', due: today() });
  const c = tasks.checkTask({ title: 'Outra', priority: 'P0', due: today() });
  assert.equal(c.ok, false);
  await give({ gold: 100 });
  await game.buy('extraP0');
  const c2 = tasks.checkTask({ title: 'Outra', priority: 'P0', due: today() });
  assert.deepEqual([c2.ok, c2.consume], [true, ['extraP0']]);
  // P0 para outro dia não conta no limite de hoje.
  assert.equal(tasks.checkTask({ title: 'Futura', priority: 'P0', due: addDays(today(), 3) }).ok, true);
});

test('desafio: um por dia; sprint: um ativo e com etapas', async () => {
  await tasks.addTask({ title: 'Desafio', kind: 'challenge' });
  assert.equal(tasks.checkTask({ title: 'Outro', kind: 'challenge' }).ok, false);
  assert.equal(tasks.checkTask({ title: 'S', kind: 'sprint', due: addDays(today(), 7) }).ok, false);
  const ok = tasks.checkTask({ title: 'S', kind: 'sprint', due: addDays(today(), 7), subtasks: [{ id: 'a', title: 'a' }] });
  assert.equal(ok.ok, true);
  await tasks.addTask({ title: 'Sprint', kind: 'sprint', due: addDays(today(), 7), subtasks: [{ id: 'a', title: 'a' }] });
  assert.equal(tasks.checkTask({ title: 'S2', kind: 'sprint', due: addDays(today(), 9), subtasks: [{ id: 'a', title: 'a' }] }).ok, false);
});

test('marcos de nível dão Cartas da Sorte e vouchers uma única vez', async () => {
  const m = P().money;
  const cards = m.items.luckyCard || 0;
  // Leva até o nível 15 (xp 19600).
  const r = await game.commit([{ type: 'ev', id: 'ev_t_lvl', data: { xp: Math.max(0, 19600 - m.xp) } }]);
  assert.equal(r.levelUp, 15);
  const gained = [...Array(15 - m.level).keys()].map((i) => game.levelGift(m.level + 1 + i));
  assert.equal(P().money.items.luckyCard, cards + gained.reduce((a, g) => a + g.cards, 0));
  assert.ok(personal.get('ev_lvl_15'));
});

test('virada do dia: vencida falha com punição, bônus não pune, rotina é criada', async () => {
  initClock(true);
  const d0 = today();
  const late = await tasks.addTask({ title: 'Vence hoje', priority: 'P2', due: d0 });
  await give({ items: { bonusTask: 1 } });
  const bonus = await tasks.addTask({ title: 'Bônus', kind: 'bonus', due: d0 }, ['bonusTask']);
  await personal.save('routine', { title: 'Manhã', items: ['Água', 'Alongar'], weekdays: [0, 1, 2, 3, 4, 5, 6] }, 'r1');
  await personal.save('prefs', { ...(personal.get('prefs') ? game.strip(personal.get('prefs')) : {}), lastDay: d0 }, 'prefs');
  shiftDays(1);
  const xp0 = P().money.xp;
  const sum = await tasks.processDays();
  assert.equal(sum.days, 1);
  assert.equal(P().byId.get(late).failed, true);
  assert.equal(P().byId.get(bonus).failed, true);
  assert.ok(personal.get(`ev_fail_${late}`));
  assert.equal(personal.get(`ev_fail_${bonus}`), null);
  assert.ok(P().money.xp <= xp0);
  assert.ok(P().byId.get(`rt_r1_${today()}`), 'rotina de hoje criada');
  assert.ok(personal.get(`sc_${d0}`));
  // Rodar de novo no mesmo dia não faz nada.
  const again = await tasks.processDays();
  assert.equal(again.days, 0);
  resetClock();
  initClock(false);
});

test('hábitos: meta do dia rende progresso de voucher; desmarcar desfaz; sequência', async () => {
  const hid = await habits.saveHabit(null, { title: 'Ler', goal: 2 });
  const h = () => P().byId.get(hid);
  const vp = P().money.voucherProgress + P().money.vouchers * 3;
  await habits.tap(h());
  let r = await habits.tap(h());
  assert.equal(r.completed, true);
  assert.equal(P().money.voucherProgress + P().money.vouchers * 3, vp + 1);
  assert.equal(habits.streak(P(), h()), 1);
  r = await habits.tap(h()); // na meta, volta a zero
  assert.equal(r.undone, true);
  assert.equal(P().money.voucherProgress + P().money.vouchers * 3, vp);
  // Ontem feito + hoje feito = 2.
  await habits.setCount(h(), 2, addDays(today(), -1));
  await habits.setCount(h(), 2);
  assert.equal(habits.streak(P(), h()), 2);
  assert.equal(habits.week(P(), h()).at(-1).st, 'done');
});

test('água: meta rende XP uma vez; desfazer abaixo da meta devolve', async () => {
  const xp = P().money.xp;
  await habits.addWater(1500);
  const r = await habits.addWater(500);
  assert.equal(r.hit, true);
  assert.equal(P().money.xp, xp + 20);
  await habits.undoWater();
  assert.equal(P().money.xp, xp);
});

test('desapego: check-in diário com ciclo de 7; recaída zera o ciclo', async () => {
  const qid = await habits.addQuit('Refrigerante');
  const r = await habits.checkinQuit(P().byId.get(qid));
  assert.deepEqual([r.n, r.gold, r.xp], [1, 60, 100]);
  assert.equal(await habits.checkinQuit(P().byId.get(qid)), null, 'um check-in por dia');
  const loss = await habits.relapseQuit(P().byId.get(qid));
  assert.ok(loss.gold <= 0);
  assert.equal(P().byId.get(qid).rewardCycle, 0);
});

test('concluir uma tarefa vencida não devolve a punição', async () => {
  initClock(true);
  const d0 = today();
  const id = await tasks.addTask({ title: 'Atrasada', priority: 'P3', due: d0 });
  await personal.save('prefs', { ...game.strip(personal.get('prefs')), lastDay: d0 }, 'prefs');
  shiftDays(1);
  await tasks.processDays();
  assert.ok(personal.get(`ev_fail_${id}`));
  const r = await tasks.toggleTask(id);
  assert.equal(r.reward.xp, 0);
  await tasks.processDays();
  assert.ok(personal.get(`ev_fail_${id}`), 'punição continua');
  assert.equal(P().byId.get(id).failed, true);
  resetClock();
  initClock(false);
});

/* ---------- Adição rápida ---------- */
const { parseQuick } = await import('../js/core/parse.js');
test('linguagem natural: datas, horário, prioridade, projeto, etiquetas e repetição', () => {
  const ctx = { today: '2026-11-06', projects: [{ id: 'p1', name: 'Casa' }, { id: 'p2', name: 'Trabalho remoto' }], tags: [{ id: 't1', name: 'contas' }] };
  let r = parseQuick('Pagar luz amanhã 9h p1 #casa @contas @urgente', ctx);
  assert.deepEqual([r.title, r.due, r.time, r.priority, r.projectId, r.tags, r.newTags], ['Pagar luz', '2026-11-07', '09:00', 'P1', 'p1', ['t1'], ['urgente']]);
  r = parseQuick('Reunião sexta às 14:30 #trabalho', ctx); // 06/11/2026 é sexta: "sexta" = a próxima
  assert.deepEqual([r.title, r.due, r.time, r.projectId], ['Reunião', '2026-11-13', '14:30', 'p2']);
  r = parseQuick('Academia toda segunda 7h', ctx);
  assert.deepEqual([r.title, r.due, r.time, r.recurrence], ['Academia', '2026-11-09', '07:00', { type: 'weekly', weekdays: [1] }]);
  r = parseQuick('Tirar o lixo toda segunda, quarta e sexta 20h', ctx);
  assert.deepEqual([r.title, r.due, r.time, r.recurrence], ['Tirar o lixo', '2026-11-06', '20:00', { type: 'weekly', weekdays: [1, 3, 5] }]);
  r = parseQuick('Inglês todas as terças e quintas', ctx);
  assert.deepEqual([r.title, r.due, r.recurrence.weekdays], ['Inglês', '2026-11-10', [2, 4]]);
  r = parseQuick('Aluguel dia 5 todo mês', ctx);
  assert.equal(r.due, '2026-12-05');
  assert.equal(r.recurrence.type, 'monthly');
  r = parseQuick('Consulta 20/01 às 10', ctx);
  assert.deepEqual([r.due, r.time], ['2027-01-20', '10:00']);
  r = parseQuick('Ligar para o João em 3 dias', ctx);
  assert.deepEqual([r.title, r.due], ['Ligar para o João', '2026-11-09']);
  r = parseQuick('Comprar 2 litros de leite', ctx);
  assert.deepEqual([r.title, r.due, r.time], ['Comprar 2 litros de leite', null, null]);
  r = parseQuick('Ler #inexistente', ctx);
  assert.equal(r.title, 'Ler #inexistente');
});

test('prêmio do dia: cresce em 7 dias seguidos, volta ao 1 se pular', async () => {
  initClock(true);
  const st0 = game.checkinState();
  const r1 = await game.claimCheckin();
  assert.equal(r1.n, st0.n);
  assert.equal(await game.claimCheckin(), null, 'um por dia');
  const g = P().money.gold;
  shiftDays(1);
  const r2 = await game.claimCheckin();
  assert.equal(r2.n, (st0.n % 7) + 1);
  assert.equal(P().money.gold, g + game.CHECKIN[r2.n - 1].gold);
  // Até o 7º dia.
  while (game.checkinState().n !== 7 || game.checkinState().claimed) {
    shiftDays(1);
    if (game.checkinState().n === 7) break;
    await game.claimCheckin();
  }
  const v = P().money.vouchers;
  const r7 = await game.claimCheckin();
  assert.equal(r7.n, 7);
  assert.ok(P().money.vouchers >= v + 2);
  // Pula um dia: volta ao 1.
  shiftDays(2);
  const st = game.checkinState();
  assert.deepEqual([st.n, st.claimed], [1, false]);
  resetClock();
  initClock(false);
});

test('IPL: partes que não se aplicam ficam de fora; prioridade pesa; folga sem nada não tem nota', async () => {
  const { buildPersonal } = await import('../js/core/model.js');
  const { dayIPL, grade } = await import('../js/core/ipl.js');
  const day = '2026-11-04'; // quarta
  const at = (d, h = 12) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime();
  const mk = (recs) => buildPersonal((t) => recs[t] || []);
  const task = (id, priority, extra = {}) => ({ id, title: id, kind: 'task', priority, due: day, createdDay: '2026-11-01', ...extra });

  // Só tarefas: P0 feita e P4 não feita vale mais que o contrário.
  const a = dayIPL(mk({ task: [task('a', 'P0', { done: true, doneAt: at(day) }), task('b', 'P4')] }), day);
  const b = dayIPL(mk({ task: [task('a', 'P0'), task('b', 'P4', { done: true, doneAt: at(day) })] }), day);
  assert.ok(a.parts.exec > b.parts.exec);
  assert.ok(a.score > b.score);
  // Sem hábitos, projetos ou Pomodoro: essas partes não entram.
  assert.equal(a.parts.habits, null);
  assert.equal(a.parts.proj, null);
  assert.equal(a.parts.focus, null);

  // Tudo feito, hábitos em dia: nota alta.
  const habit = { id: 'h1', title: 'Ler', goal: 2, createdDay: '2026-10-01' };
  const logs = ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', day].map((d) => ({ id: `hl_h1_${d}`, habitId: 'h1', date: d, count: 2 }));
  const full = dayIPL(mk({ task: [task('a', 'P1', { done: true, doneAt: at(day) })], habit: [habit], hlog: logs }), day);
  assert.ok(full.score >= 95, `nota ${full.score}`);
  assert.equal(grade(full.score)[0], 'A');

  // Meia meta do hábito conta meio.
  const half = dayIPL(mk({ habit: [habit], hlog: [{ id: 'x', habitId: 'h1', date: day, count: 1 }] }), day);
  assert.equal(half.parts.habits, 0.5);

  // Sprint atrasado em relação ao calendário puxa a parte de projetos para baixo.
  const sprint = { id: 's', title: 'S', kind: 'sprint', start: '2026-11-01', due: '2026-11-07', subtasks: [{ id: 1, done: false }, { id: 2, done: false }, { id: 3, done: false }, { id: 4, done: true }] };
  const sp = dayIPL(mk({ task: [sprint, task('a', 'P2', { done: true, doneAt: at(day) })] }), day);
  assert.ok(sp.parts.proj < 0.6, `projetos ${sp.parts.proj}`);

  // Folga sem nada feito: sem nota.
  const off = dayIPL(mk({ prefs: [{ id: 'prefs', daysOff: [3] }], task: [task('z', 'P2', { due: '2026-11-10' })] }), day);
  assert.equal(off.score, null);

  // Ao vivo (hoje): tarefa ainda aberta não vira perdida nos fatos.
  const live = dayIPL(mk({ task: [task('a', 'P2')] }), day, { live: true });
  assert.equal(live.facts.missed, 0);
});

test('virada do mês fecha o mês com IPL médio', async () => {
  const S = P();
  const ym = '2020-01';
  const rec = tasks.monthRecord(S, ym, new Map([['2020-01-10', { date: '2020-01-10', score: 80, habitsDone: 2, habitsTotal: 3 }], ['2020-01-11', { date: '2020-01-11', score: 60 }]]));
  assert.equal(rec.score, 70);
  assert.equal(rec.days, 2);
  assert.equal(rec.best.score, 80);
});

test('foco global: tarefa em foco, Pomodoro no registro sincronizado e resumo', async () => {
  const F = await import('../js/core/focus.js');
  const { glance } = await import('../js/core/glance.js');
  const id = await tasks.addTask({ title: 'Escrever o relatório', priority: 'P2', due: today() });
  await F.setFocus(id);
  let S = P();
  assert.equal(F.focusedTask(S)?.id, id);
  assert.ok(F.focusOf(S).since > 0);
  const endsAt = Date.now() + 10 * 60000;
  await F.saveFocus({ pomo: { ...F.POMO_DEF, running: true, endsAt } });
  S = P();
  const sum = F.focusSummary(S);
  assert.equal(sum.task.title, 'Escrever o relatório');
  assert.ok(sum.pomo.running && sum.pomo.leftSec > 590 && sum.pomo.leftSec <= 600);
  assert.equal(glance(S).focus.task.id, id);
  // Concluída, deixa de estar em foco.
  await tasks.toggleTask(id);
  assert.equal(F.focusedTask(P()), null);
  await F.setFocus(null);
  assert.equal(F.focusOf(P()).taskId, null);
});
