// Confere, sem navegador, que todo nome importado existe no módulo de origem
// e que todo arquivo do app está na lista do service worker (para funcionar offline).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(join(ROOT, 'js')).filter((f) => f.endsWith('.js') && !f.includes('/vendor/'));

function exportsOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) for (const part of m[1].split(',')) names.add(part.trim().split(/\s+as\s+/).pop());
  if (/export\s+default/.test(src)) names.add('default');
  return names;
}

test('todo nome importado existe no módulo de origem', () => {
  const problems = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'(\.[^']+)'/g)) {
      const target = resolve(dirname(f), m[2]);
      const ex = exportsOf(readFileSync(target, 'utf8'));
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0];
        if (name && !ex.has(name)) problems.push(`${relative(ROOT, f)}: "${name}" não existe em ${m[2]}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('o service worker guarda todos os arquivos do app', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const shell = new Set([...sw.matchAll(/^\s*'([^']+)',$/gm)].map((m) => m[1]));
  const need = [...walk(join(ROOT, 'js')), ...walk(join(ROOT, 'css')), ...walk(join(ROOT, 'fonts')), ...walk(join(ROOT, 'icons'))].map((f) => relative(ROOT, f));
  const missing = need.filter((f) => !shell.has(f));
  const extra = [...shell].filter((f) => f !== './' && !need.includes(f) && !['index.html', 'manifest.webmanifest'].includes(f));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
});
