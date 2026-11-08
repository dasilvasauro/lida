// Atualiza a lista SHELL do sw.js com todos os arquivos do app (rode depois de criar ou apagar arquivos).
// Uso: node scripts/sw-shell.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = ['css', 'fonts', 'icons', 'js', 'sounds'].flatMap((d) => walk(join(ROOT, d))).map((f) => relative(ROOT, f)).sort();
const list = ['./', 'index.html', 'manifest.webmanifest', ...files].map((f) => `  '${f}',`).join('\n');
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8').replace(/const SHELL = \[[\s\S]*?\n\];/, `const SHELL = [\n${list}\n];`);
writeFileSync(join(ROOT, 'sw.js'), sw);
console.log(`sw.js: ${files.length + 3} arquivos na lista`);
