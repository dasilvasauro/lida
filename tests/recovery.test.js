// Chave de recuperação: o código abre a mesma chave dos dados e cria uma senha nova.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const C = await import('../js/lib/crypto.js');

test('código de recuperação: formato e normalização', () => {
  const c = C.newRecoveryCode();
  assert.match(c, /^[0-9A-Z]{4}(-[0-9A-Z]{4}){5}$/);
  assert.ok(C.validCode(c));
  assert.ok(C.validCode(c.toLowerCase().replace(/-/g, ' ')), 'minúsculas e espaços valem');
  assert.equal(C.normCode('ab0o-il1'), 'AB00111');
  assert.ok(!C.validCode('1234'));
});

test('conta nova: senha e código abrem a mesma chave; senha nova pelo código', async () => {
  const { key, wrap, rwrap, code } = await C.createKeyWithRecovery('senha-antiga');
  const box = await C.seal(key, { x: 1 }, 'r1');
  const byPass = await C.unlockKey('senha-antiga', wrap);
  assert.deepEqual(await C.unseal(byPass, box.iv, box.ct, 'r1'), { x: 1 });
  const rec = await C.recoverWithCode(code.toLowerCase(), rwrap, 'senha-nova');
  assert.deepEqual(await C.unseal(rec.key, box.iv, box.ct, 'r1'), { x: 1 });
  const again = await C.unlockKey('senha-nova', rec.wrap);
  assert.deepEqual(await C.unseal(again, box.iv, box.ct, 'r1'), { x: 1 });
  await assert.rejects(C.unlockKey('senha-antiga', rec.wrap), /Senha incorreta/);
  await assert.rejects(C.recoverWithCode(C.newRecoveryCode(), rwrap, 'x'), (e) => e.code === 'bad-code');
});

test('conta antiga: criar a chave pede a senha atual', async () => {
  const { key, wrap } = await C.createKey('minha-senha');
  await assert.rejects(C.addRecovery('errada', wrap), (e) => e.code === 'bad-pass');
  const { rwrap, code } = await C.addRecovery('minha-senha', wrap);
  const box = await C.seal(key, { ok: true }, 'r2');
  const rec = await C.recoverWithCode(code, rwrap, 'outra');
  assert.deepEqual(await C.unseal(rec.key, box.iv, box.ct, 'r2'), { ok: true });
});
