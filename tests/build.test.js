// Versão, variantes do APK (Google e Libre) e metadados do F-Droid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const { versionCode } = await import('../scripts/version.mjs');
const { stripMarked, cloudStub } = await import('../scripts/flavor.mjs');
const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('versionCode cresce de versão em versão', () => {
  const order = ['3.0.0-alfa.9', '3.0.0-alfa.9.1', '3.0.0-alfa.10', '3.0.0-alfa.15', '3.0.0-beta.1', '3.0.0-rc.1', '3.0.0', '3.0.1', '3.1.0-alfa.1', '4.0.0'];
  const codes = order.map(versionCode);
  for (let i = 1; i < codes.length; i++) assert.ok(codes[i] > codes[i - 1], `${order[i]} > ${order[i - 1]}`);
  assert.ok(versionCode('20.99.99') < 2_100_000_000);
  assert.throws(() => versionCode('3.0'));
});

test('android/version.properties confere com o package.json e o app', async () => {
  const pkg = JSON.parse(read('package.json')).version;
  const props = read('android/version.properties');
  assert.equal(/^versionName=(.+)$/m.exec(props)[1].trim(), pkg, 'rode node scripts/version.mjs');
  assert.equal(Number(/^versionCode=(\d+)/m.exec(props)[1]), versionCode(pkg));
  const { app } = await import('../js/state.js');
  assert.equal(app.version, pkg);
  assert.ok(existsSync(new URL(`fastlane/metadata/android/pt-BR/changelogs/${versionCode(pkg)}.txt`, root)), 'changelog do F-Droid desta versão');
  const ch = read(`fastlane/metadata/android/pt-BR/changelogs/${versionCode(pkg)}.txt`);
  assert.ok([...ch].length <= 500, 'changelog do F-Droid com até 500 caracteres');
});

test('Libre: os blocos marcados do Google saem do Gradle e do manifesto', () => {
  const app = stripMarked(read('android/app/build.gradle'), 'google');
  assert.ok(!/google-services|com\.google\.gms/.test(app.replace(/^\s*\/\/.*$/gm, '')));
  assert.ok(app.includes("apply from: 'capacitor.build.gradle'"));
  const rootG = stripMarked(read('android/build.gradle'), 'google');
  assert.ok(!rootG.includes('com.google.gms'));
  assert.ok(rootG.includes('com.android.tools.build:gradle'));
  const vars = stripMarked(read('android/variables.gradle'), 'google');
  assert.ok(!vars.includes('rgcfaIncludeGoogle') && vars.includes('minSdkVersion'));
  const man = stripMarked(read('android/app/src/main/AndroidManifest.xml'), 'updater');
  assert.ok(!man.includes('REQUEST_INSTALL_PACKAGES') && man.includes('android.permission.INTERNET'));
});

test('Libre: o cloud.js de mentira tem os mesmos nomes e nada do Firebase', async () => {
  const src = read('js/core/cloud.js');
  const stub = cloudStub(src);
  const names = (t) => [...t.matchAll(/^export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]).sort();
  assert.deepEqual(names(stub), names(src));
  assert.ok(!/gstatic|firebase-config|import /.test(stub));
  const m = await import(`data:text/javascript,${encodeURIComponent(stub)}`);
  assert.equal(m.googleAvailable(), false);
  assert.equal(await m.currentUser(), null);
  assert.throws(() => m.loadFirebase());
});

test('metadados do F-Droid', () => {
  for (const loc of ['pt-BR', 'en-US']) {
    const short = read(`fastlane/metadata/android/${loc}/short_description.txt`).trim();
    assert.ok(short.length <= 80 && short.length > 10, `${loc}: descrição curta`);
    assert.ok(read(`fastlane/metadata/android/${loc}/title.txt`).trim().length <= 50);
    assert.ok(existsSync(new URL(`fastlane/metadata/android/${loc}/images/icon.png`, root)));
  }
  assert.ok(read('LICENSE').includes('GNU GENERAL PUBLIC LICENSE'));
  assert.equal(JSON.parse(read('package.json')).license, 'GPL-3.0-or-later');
});
