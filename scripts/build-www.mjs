// Monta a pasta www/ que vai dentro do APK: os mesmos arquivos da versão web, sem etapa de build.
// Uso: node scripts/build-www.mjs   (o "npm run android:sync" já chama este script)
// Na variante Libre (android/flavor.properties ou LIDA_FLAVOR = libre/fdroid), o www/ sai sem nada do
// Google: js/core/cloud.js vira um módulo que só diz "indisponível" e js/firebase-config.js fica de fora.
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudStub } from './flavor.mjs';

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

const flavorOf = () => {
  try {
    const m = /^flavor=(\w+)/m.exec(readFileSync(join(ROOT, 'android/flavor.properties'), 'utf8'));
    if (m) return m[1];
  } catch {
    /* sem arquivo: usa a variável */
  }
  return process.env.LIDA_FLAVOR || 'google';
};
const flavor = flavorOf();
const libre = flavor === 'libre' || flavor === 'fdroid';
if (libre) {
  writeFileSync(join(OUT, 'js/core/cloud.js'), cloudStub(readFileSync(join(ROOT, 'js/core/cloud.js'), 'utf8')));
  rmSync(join(OUT, 'js/firebase-config.js'), { force: true });
}
writeFileSync(join(OUT, 'js/flavor.js'), `export const FLAVOR = '${libre ? 'libre' : 'google'}';\n`);
console.log(`www/ pronta (${ITEMS.join(', ')}) · variante ${libre ? 'libre' : 'google'}`);

