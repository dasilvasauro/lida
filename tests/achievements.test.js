// Conquistas: números, desbloqueio (com histórico), resgate manual do ouro e textos nos três idiomas.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage ??= (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
})();

const { openDB } = await import('../js/lib/idb.js');
const { createKey } = await import('../js/lib/crypto.js');
const { initHLC } = await import('../js/lib/hlc.js');
const { personal, P } = await import('../js/state.js');
const A = await import('../js/core/achievements.js');
const { tr, setLang } = await import('../js/core/i18n.js');
const { today } = await import('../js/lib/clock.js');
const { addDays } = await import('../js/lib/util.js');

initHLC('achtest');
const { key } = await createKey('senha-de-teste');
await personal.init(await openDB('lida3-ach'), key);

test('dezenas de conquistas, com nome e descrição em pt, en e es, e ouro pela dificuldade', () => {
  assert.ok(A.ACHIEVEMENTS.length >= 40, `${A.ACHIEVEMENTS.length} conquistas`);
  const ids = new Set();
  for (const a of A.ACHIEVEMENTS) {
    assert.ok(!ids.has(a.id), `id repetido ${a.id}`);
    ids.add(a.id);
    for (const l of ['pt', 'en', 'es']) {
      assert.ok(a.name[l] && a.desc[l], `${a.id}: falta ${l}`);
      if (a.goal > 1 || a.desc.pt.includes('{n}')) assert.equal(a.desc[l].includes('{n}'), a.desc.pt.includes('{n}'), `${a.id}: {n} em ${l}`);
    }
    assert.ok(A.CATS[a.cat], `${a.id}: grupo`);
    assert.equal(a.gold, A.TIER_GOLD[a.tier]);
  }
  for (const c of ['tasks', 'ipl', 'water', 'streak', 'habit', 'active', 'off']) assert.ok(A.ACHIEVEMENTS.some((a) => a.cat === c), c);
  setLang('en');
  assert.equal(A.achDesc(A.achById.get('t_c50')), 'Create 50 tasks: out of your head and into Lida.');
  setLang('es');
  assert.equal(tr(A.achById.get('w_run7').name), 'Semana mojada');
  setLang('pt');
});

test('o histórico conta: na primeira vez, desbloqueia o que já foi feito, de uma vez', async () => {
  const d = today();
  const items = [];
  for (let i = 0; i < 12; i++) items.push({ type: 'task', id: `tk${i}`, data: { title: `T${i}`, priority: i < 2 ? 'P0' : 'P3', kind: 'normal', createdDay: addDays(d, -i), done: true, doneAt: Date.now() - i * 86400000 } });
  for (let i = 0; i < 8; i++) items.push({ type: 'water', id: `wt${i}`, data: { date: addDays(d, -i), ml: 2000, at: Date.now() } });
  items.push({ type: 'habit', id: 'hb1', data: { title: 'Ler', goal: 1, createdDay: addDays(d, -10) } });
  for (let i = 0; i < 8; i++) items.push({ type: 'hlog', id: `hl_hb1_${addDays(d, -i)}`, data: { habitId: 'hb1', date: addDays(d, -i), count: 1 } });
  items.push({ type: 'month', id: 'mo_2026-09', data: { month: '2026-09', score: 82 } });
  items.push({ type: 'month', id: 'mo_2026-10', data: { month: '2026-10', score: 74 } });
  await personal.saveMany(items);
  const s = A.achStats(P());
  assert.equal(s.created, 12);
  assert.equal(s.done, 12);
  assert.equal(s.doneP0, 2);
  assert.equal(s.waterRun, 8);
  assert.equal(s.waterL, 16);
  assert.equal(s.habitBest, 8);
  assert.equal(s.bestMonth, 82);
  assert.equal(s.monthRun70, 2);
  assert.ok(s.activeRun >= 8);
  const r = await A.checkAchievements(P());
  assert.equal(r.first, true);
  const got = r.fresh.map((a) => a.id);
  for (const id of ['t_c1', 't_c10', 't_d1', 'w_goal1', 'w_10l', 'w_run7', 's_h7', 'h_new1', 'm_first', 'm60', 'm70', 'm80', 'a_r3', 'a_r7']) assert.ok(got.includes(id), id);
  assert.ok(!got.includes('t_c50'));
  assert.ok(personal.get('ach_t_c1').retro);
  // Segunda vez: nada novo.
  assert.equal((await A.checkAchievements(P())).fresh.length, 0);
});

test('nova conquista depois do histórico não é retroativa; o ouro só vem ao resgatar, uma vez', async () => {
  const d = today();
  const items = [];
  for (let i = 12; i < 50; i++) items.push({ type: 'task', id: `tk${i}`, data: { title: `T${i}`, priority: 'P4', kind: 'normal', createdDay: d } });
  await personal.saveMany(items);
  const r = await A.checkAchievements(P());
  assert.equal(r.first, false);
  assert.deepEqual(r.fresh.map((a) => a.id), ['t_c50']);
  assert.ok(!personal.get('ach_t_c50').retro);
  const gold = P().money.gold;
  const c = await A.claimAchievement('t_c50');
  assert.equal(c.gold, A.TIER_GOLD[2]);
  assert.equal(P().money.gold, gold + A.TIER_GOLD[2]);
  assert.equal(await A.claimAchievement('t_c50'), null);
  assert.equal(P().money.gold, gold + A.TIER_GOLD[2]);
  assert.ok(!A.toClaim(P()).some((a) => a.id === 't_c50'));
  // Conquista não desbloqueada não paga.
  assert.equal(await A.claimAchievement('t_c1000'), null);
  // Uma vez desbloqueada, fica (mesmo apagando tarefas).
  await personal.removeMany(items.map((x) => x.id));
  assert.ok(A.achList(P()).find((a) => a.id === 't_c50').unlocked);
});
