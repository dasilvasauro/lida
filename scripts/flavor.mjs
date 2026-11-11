// Prepara a árvore para compilar uma variante do APK. Rode ANTES do npm install / cap sync.
//   node scripts/flavor.mjs libre    sem Google nem Firebase (Releases do GitHub, IzzyOnDroid, Obtainium)
//   node scripts/flavor.mjs fdroid   igual à libre e sem o atualizador dentro do app (F-Droid)
//   node scripts/flavor.mjs google   só grava o flavor.properties (é o padrão do repositório)
//
// O que a Libre tira:
//   - o plugin de login com Google (@capacitor-firebase/authentication) do package.json;
//   - o plugin google-services do Gradle (blocos marcados com <google>);
//   - a configuração do plugin no capacitor.config.json;
//   - no www/ do APK: js/core/cloud.js vira um módulo vazio (sem SDK do Firebase) e js/firebase-config.js
//     não vai junto (ver scripts/build-www.mjs).
// fdroid tira também a permissão de instalar apps (blocos <updater> do AndroidManifest).
// Mexe nos arquivos do repositório: use numa cópia de trabalho de build (Actions, F-Droid), não na sua.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Apaga blocos marcados: "<tag>" ... "</tag>" (em comentários // ou <!-- -->) e linhas com "<tag/>".
export const stripMarked = (text, tag) =>
  text
    .replace(new RegExp(`^[^\\n]*<${tag}>[^\\n]*\\n[\\s\\S]*?^[^\\n]*</${tag}>[^\\n]*\\n?`, 'gm'), '')
    .replace(new RegExp(`^[^\\n]*<${tag}/>[^\\n]*\\n?`, 'gm'), '');

// Lida Libre: js/core/cloud.js com os mesmos nomes exportados e nenhum código do Google (usado pelo build-www).
export function cloudStub(src) {
  const names = [...src.matchAll(/^export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
  const fixed = {
    loadConfig: 'async () => {}',
    getConfigError: "() => ''",
    cloudConfigured: '() => false',
    nativeGoogle: '() => false',
    googleAvailable: '() => false',
    firebase: '() => null',
    currentUser: 'async () => null',
    signOut: 'async () => {}',
    legacyVault: 'async () => null',
  };
  const body = names.map((n) => `export const ${n} = ${fixed[n] || 'off'};`).join('\n');
  return `// Lida Libre: sem conta Google nem servidor do Lida. Sincronize pela sua nuvem (Dropbox, OneDrive, WebDAV).\nconst off = () => {\n  throw new Error('Indisponível na versão Libre.');\n};\n${body}\n`;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const flavor = process.argv[2];
  if (!['google', 'libre', 'fdroid'].includes(flavor)) {
    console.error('Uso: node scripts/flavor.mjs <google|libre|fdroid>');
    process.exit(2);
  }
  const file = (p) => join(ROOT, p);
  const edit = (p, fn) => {
    const before = readFileSync(file(p), 'utf8');
    const after = fn(before);
    if (after !== before) writeFileSync(file(p), after);
    return after !== before;
  };
  writeFileSync(file('android/flavor.properties'), `# Gerado por scripts/flavor.mjs\nflavor=${flavor}\n`);

  if (flavor !== 'google') {
    edit('package.json', (t) => {
      const j = JSON.parse(t);
      delete j.devDependencies?.['@capacitor-firebase/authentication'];
      delete j.dependencies?.['@capacitor-firebase/authentication'];
      return `${JSON.stringify(j, null, 2)}\n`;
    });
    edit('capacitor.config.json', (t) => {
      const j = JSON.parse(t);
      delete j.plugins?.FirebaseAuthentication;
      j.appId = 'io.github.dasilvasauro.lida.libre';
      j.appName = 'Lida Libre';
      return `${JSON.stringify(j, null, 2)}\n`;
    });
    for (const p of ['android/build.gradle', 'android/app/build.gradle', 'android/variables.gradle']) edit(p, (t) => stripMarked(t, 'google'));
    if (flavor === 'fdroid') edit('android/app/src/main/AndroidManifest.xml', (t) => stripMarked(t, 'updater'));
  }
  console.log(`variante: ${flavor}`);
}
