// Monta os arquivos da Release a partir do APK compilado e das Novidades e correções da versão.
// Uso (no GitHub Actions, em tags v*): node scripts/release.mjs <versão> <apk> <apk-libre> <pasta de saída>
// Gera: lida.apk e lida-libre.apk (nomes fixos, para os links .../releases/latest/download/...), latest.json
// (lido pelo atualizador do app, com os dois APKs) e release-notes.md (texto da Release). O versionCode
// vem de android/version.properties. Falha se a versão não estiver no js/core/changelog.js: toda versão
// publicada precisa dizer o que mudou.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CHANGELOG, KIND_LABEL } from '../js/core/changelog.js';

const [version, apk, apkLibre, out] = process.argv.slice(2);
if (!version || !apk || !apkLibre || !out) {
  console.error('Uso: node scripts/release.mjs <versão> <apk> <apk-libre> <pasta>');
  process.exit(2);
}
const props = readFileSync(new URL('../android/version.properties', import.meta.url), 'utf8');
const code = /^versionCode=(\d+)/m.exec(props)?.[1];
const propName = /^versionName=(.+)$/m.exec(props)?.[1]?.trim();
if (propName !== version) {
  console.error(`::error::android/version.properties está na ${propName}, a tag é ${version}. Rode node scripts/version.mjs e faça commit.`);
  process.exit(1);
}
const entry = CHANGELOG.find((r) => r.v === version);
if (!entry) {
  console.error(`::error::A versão ${version} não está em js/core/changelog.js. Registre as novidades antes de publicar.`);
  process.exit(1);
}
const { version: appVersion } = await import('../js/state.js').then((m) => ({ version: m.app.version })).catch(() => ({ version }));
if (appVersion !== version) console.log(`::warning::app.version (${appVersion}) é diferente da tag (${version}).`);

mkdirSync(out, { recursive: true });
const bytes = readFileSync(apk);
const sha256 = createHash('sha256').update(bytes).digest('hex');
copyFileSync(apk, join(out, 'lida.apk'));
const bytesL = readFileSync(apkLibre);
const sha256Libre = createHash('sha256').update(bytesL).digest('hex');
copyFileSync(apkLibre, join(out, 'lida-libre.apk'));
const repo = process.env.GITHUB_REPOSITORY || 'dasilvasauro/lida';
const latest = {
  version,
  versionCode: Number(code),
  date: entry.date,
  title: entry.title,
  apk: `https://github.com/${repo}/releases/download/v${version}/lida.apk`,
  sha256,
  size: bytes.length,
  apkLibre: `https://github.com/${repo}/releases/download/v${version}/lida-libre.apk`,
  sha256Libre,
  sizeLibre: bytesL.length,
  items: entry.items,
};
writeFileSync(join(out, 'latest.json'), JSON.stringify(latest, null, 2));
const notes = [`## ${entry.title}`, '', ...entry.items.map(([k, t]) => `- **${KIND_LABEL[k] || k}:** ${t}`), '', '| APK | Para quem | SHA-256 |', '|---|---|---|', `| [lida.apk](https://github.com/${repo}/releases/latest/download/lida.apk) | Com login Google (e também Dropbox, OneDrive, Nextcloud) | \`${sha256}\` |`, `| [lida-libre.apk](https://github.com/${repo}/releases/latest/download/lida-libre.apk) | Lida Libre: sem nada do Google | \`${sha256Libre}\` |`].join('\n');
writeFileSync(join(out, 'release-notes.md'), notes + '\n');
console.log(`Release ${version} (${code}): ${bytes.length} bytes, sha256 ${sha256}`);
