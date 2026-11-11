// Todo ícone de conquista existe (desenho próprio em achicons.js ou um ícone de ui.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('ícones das conquistas existem', () => {
  const ach = readFileSync(new URL('../js/core/achievements.js', import.meta.url), 'utf8');
  const glyphs = readFileSync(new URL('../js/ui/achicons.js', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../js/ui/ui.js', import.meta.url), 'utf8');
  const names = [...ach.matchAll(/^\s*\['[a-z0-9_]+', '[a-z]+', '([A-Za-z]+)'/gm)].map((m) => m[1]);
  assert.ok(names.length >= 100);
  for (const n of new Set(names)) assert.ok(new RegExp(`^\\s+${n}: '`, 'm').test(glyphs) || new RegExp(`^\\s+${n}: '`, 'm').test(ui), `ícone ${n}`);
});

test('cada título e cada fantasia tem o desenho inteiro e a selfie', async () => {
  const { existsSync } = await import('node:fs');
  globalThis.localStorage ??= { getItem: () => null, setItem() {} };
  const { LEVEL_TITLES } = await import('../js/core/model.js');
  const M = await import('../js/ui/mascot.js');
  const keys = [...LEVEL_TITLES.map(([, t]) => t), ...M.COSTUMES.map((c) => M.costumeKey(c.id))];
  for (const k of keys) {
    for (const src of [M.mascotSrc(k), M.selfieSrc(k)]) assert.ok(existsSync(new URL(`../${src}`, import.meta.url)), src);
  }
  assert.equal(M.COSTUMES.length, 3);
  assert.ok(M.mascotSrc('c:pinguim').endsWith('/pinguim.webp'));
});
