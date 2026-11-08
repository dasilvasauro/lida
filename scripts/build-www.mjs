// Monta a pasta www/ que vai dentro do APK: os mesmos arquivos da versão web, sem etapa de build.
// Uso: node scripts/build-www.mjs   (o "npm run android:sync" já chama este script)
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'www');
const ITEMS = ['index.html', 'manifest.webmanifest', 'css', 'js', 'fonts', 'icons', 'sounds'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const it of ITEMS) {
  const src = join(ROOT, it);
  if (!existsSync(src)) throw new Error(`Falta ${it}`);
  cpSync(src, join(OUT, it), { recursive: true });
}
console.log(`www/ pronta (${ITEMS.join(', ')})`);
