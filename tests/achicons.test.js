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
