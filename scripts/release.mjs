// Monta os arquivos da Release a partir do APK compilado e das Novidades e correções da versão.
// Uso (no GitHub Actions, em tags v*): node scripts/release.mjs <versão> <versionCode> <apk> <pasta de saída>
// Gera: lida.apk (nome fixo, para o link .../releases/latest/download/lida.apk), latest.json (lido
// pelo atualizador do app) e release-notes.md (texto da Release). Falha se a versão não estiver no
// js/core/changelog.js: toda versão publicada precisa dizer o que mudou.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CHANGELOG, KIND_LABEL } from '../js/core/changelog.js';

const [version, code, apk, out] = process.argv.slice(2);
if (!version || !code || !apk || !out) {
  console.error('Uso: node scripts/release.mjs <versão> <versionCode> <apk> <pasta>');
  process.exit(2);
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
const repo = process.env.GITHUB_REPOSITORY || 'dasilvasauro/lida';
const latest = {
  version,
  versionCode: Number(code),
  date: entry.date,
  title: entry.title,
  apk: `https://github.com/${repo}/releases/download/v${version}/lida.apk`,
  sha256,
  size: bytes.length,
  items: entry.items,
};
writeFileSync(join(out, 'latest.json'), JSON.stringify(latest, null, 2));
const notes = [`## ${entry.title}`, '', ...entry.items.map(([k, t]) => `- **${KIND_LABEL[k] || k}:** ${t}`), '', `SHA-256 do APK: \`${sha256}\``, '', `Baixar: https://github.com/${repo}/releases/latest/download/lida.apk`].join('\n');
writeFileSync(join(out, 'release-notes.md'), notes + '\n');
console.log(`Release ${version} (${code}): ${bytes.length} bytes, sha256 ${sha256}`);
