// Versão do app num lugar só: package.json manda; este script grava o resto.
//   android/version.properties   versionName e versionCode do APK (o F-Droid lê daqui, sem variáveis de ambiente)
//   fastlane/.../changelogs/<versionCode>.txt   novidades da versão (F-Droid e IzzyOnDroid mostram)
// Uso: node scripts/version.mjs   (rode depois de mudar a versão no package.json e no changelog)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// O cálculo do versionCode fica em js/lib/version.js (o app do Linux usa o mesmo para comparar versões).
import { versionCode } from '../js/lib/version.js';
export { versionCode };

export function readVersion() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const v = readVersion();
  const code = versionCode(v);
  writeFileSync(join(ROOT, 'android/version.properties'), `# Gerado por scripts/version.mjs a partir do package.json. Não edite à mão.\nversionName=${v}\nversionCode=${code}\n`);
  const { CHANGELOG, KIND_LABEL } = await import('../js/core/changelog.js');
  const entry = CHANGELOG.find((r) => r.v === v);
  if (entry) {
    // O F-Droid corta em 500 caracteres. Português sempre; inglês quando a versão traz (entry.en).
    const KIND_EN = { novo: 'New', melhoria: 'Improvement', correcao: 'Fix' };
    const write = (folder, title, items, label, more) => {
      let txt = `${title}\n\n${items.map((t, i) => `• ${label[entry.items[i][0]] || entry.items[i][0]}: ${t}`).join('\n')}`;
      if (txt.length > 500) txt = `${txt.slice(0, 440).replace(/\s+\S*$/, '')}…\n${more}`;
      const dir = join(ROOT, `fastlane/metadata/android/${folder}/changelogs`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${code}.txt`), `${txt}\n`);
    };
    write('pt-BR', entry.title, entry.items.map(([, t]) => t), KIND_LABEL, 'Mais em Ajustes > Novidades e correções.');
    if (entry.en) write('en-US', entry.en.title, entry.en.items, KIND_EN, "More in Settings > What's new and fixes.");
  } else console.warn(`Aviso: ${v} ainda não está em js/core/changelog.js`);
  console.log(`versão ${v} · versionCode ${code}`);
}
