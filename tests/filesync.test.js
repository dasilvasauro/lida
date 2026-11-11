// Sincronização por arquivos (Dropbox, OneDrive, WebDAV), com uma "nuvem" em memória e dois aparelhos.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createStore } = await import('../js/core/store.js');
const { openDB } = await import('../js/lib/idb.js');
const { createKey } = await import('../js/lib/crypto.js');
const { initHLC } = await import('../js/lib/hlc.js');
const { createFileSync, readSpace, spaceDoc, parseSeg, segName } = await import('../js/core/filesync.js');
const { parsePropfind } = await import('../js/core/providers.js');

initHLC('fstest');
const { key, wrap } = await createKey('senha-de-teste');
const SID = 'espaco1';

// Nuvem em memória com a mesma interface dos provedores.
function memCloud() {
  const files = new Map();
  return {
    files,
    kind: 'mem',
    async list(dir) {
      return [...files.keys()].filter((k) => k.startsWith(`${dir}/`) && !k.slice(dir.length + 1).includes('/')).map((k) => ({ name: k.slice(dir.length + 1) }));
    },
    get: async (p) => (files.has(p) ? files.get(p) : null),
    put: async (p, t) => void files.set(p, t),
    del: async (p) => void files.delete(p),
    account: async () => 'teste',
  };
}

async function device(name, cloud) {
  const store = createStore({ name, watch: { task: { title: 'Título' } } });
  const idb = await openDB(`fs-${name}`);
  await store.init(idb, key);
  store.setDevice(name);
  const sync = createFileSync(store, { idb, provider: cloud, device: name, sid: SID, wrap });
  return { store, idb, sync };
}

test('nomes dos pacotes', () => {
  assert.equal(segName('abc123', 1, 12), 'abc123.00000001.00000012.json');
  assert.deepEqual(parseSeg('abc123.00000001.00000012.json'), { name: 'abc123.00000001.00000012.json', dev: 'abc123', from: 1, to: 12 });
  assert.equal(parseSeg('notas.txt'), null);
});

test('dois aparelhos pela mesma pasta: envia, recebe, junta campo a campo', async () => {
  const cloud = memCloud();
  await cloud.put('space.json', spaceDoc(SID, wrap));
  const A = await device('aaa', cloud);
  const B = await device('bbb', cloud);

  const id = await A.store.save('task', { title: 'Comprar pão', priority: 'P3' });
  assert.equal(await A.sync._round(), true);
  assert.ok([...cloud.files.keys()].some((k) => k.startsWith('log/aaa.')), 'pacote do A na pasta');
  assert.equal(await A.sync.pending(), 0);
  // O conteúdo na pasta é cifrado.
  assert.ok(![...cloud.files.values()].some((t) => t.includes('Comprar pão')));

  await B.sync._round();
  assert.equal(B.store.get(id)?.title, 'Comprar pão');

  // Cada um muda um campo diferente: os dois ficam.
  await A.store.patch(id, { title: 'Comprar pão integral' });
  await B.store.patch(id, { priority: 'P1' });
  await A.sync._round();
  await B.sync._round();
  await A.sync._round();
  assert.equal(A.store.get(id).title, 'Comprar pão integral');
  assert.equal(A.store.get(id).priority, 'P1');
  assert.equal(B.store.get(id).title, 'Comprar pão integral');
  assert.equal(B.store.get(id).priority, 'P1');
  assert.ok(A.sync.lastSync() > 0);

  // Apagar também viaja.
  await B.store.remove(id);
  await B.sync._round();
  await A.sync._round();
  assert.equal(A.store.get(id), null);
});

test('muitos pacotes do mesmo aparelho viram um só, e quem chega depois recebe tudo', async () => {
  const cloud = memCloud();
  await cloud.put('space.json', spaceDoc(SID, wrap));
  const A = await device('ccc', cloud);
  const ids = [];
  for (let i = 0; i < 42; i++) {
    ids.push(await A.store.save('task', { title: `Tarefa ${i}`, priority: 'P4' }));
    await A.sync._round();
  }
  await A.sync._round();
  await new Promise((r) => setTimeout(r, 50)); // a junção roda depois da rodada
  const mine = [...cloud.files.keys()].filter((k) => k.startsWith('log/ccc.'));
  // Juntou ao chegar a 40 (uma vez por dia); os enviados depois continuam separados.
  assert.ok(mine.length <= 3, `poucos pacotes (${mine.length})`);
  assert.ok(mine.some((k) => { const s = parseSeg(k.slice(4)); return s.to - s.from >= 39; }), 'um pacote juntando os 40 primeiros');
  const C = await device('ddd', cloud);
  await C.sync._round();
  assert.equal(ids.filter((x) => C.store.get(x)).length, 42);
});

test('pasta vazia de novo: o aparelho recria o space.json e reenvia tudo; pasta de outro espaço é recusada', async () => {
  const cloud = memCloud();
  const A = await device('eee', cloud);
  const id = await A.store.save('task', { title: 'Sobrevive', priority: 'P2' });
  await A.sync._round();
  const sp = await readSpace(cloud);
  assert.equal(sp.sid, SID);
  assert.ok([...cloud.files.keys()].some((k) => k.startsWith('log/eee.')));

  const other = memCloud();
  await other.put('space.json', spaceDoc('outro', wrap));
  const X = createFileSync(A.store, { idb: A.idb, provider: other, device: 'eee', sid: SID, wrap });
  assert.equal(await X._round(), false);
  assert.equal(X.getStatus(), 'denied');
  assert.ok(A.store.get(id));
});

test('WebDAV: lê a lista de arquivos do PROPFIND', () => {
  const xml = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
    <d:response><d:href>/remote.php/dav/files/ana/Lida/log/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>
    <d:response><d:href>/remote.php/dav/files/ana/Lida/log/abc.00000001.00000001.json</d:href><d:propstat><d:prop><d:resourcetype/><d:getcontentlength>120</d:getcontentlength></d:prop></d:propstat></d:response>
    <d:response><d:href>/remote.php/dav/files/ana/Lida/log/sub%20pasta/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>
  </d:multistatus>`;
  const out = parsePropfind(xml, 'https://nuvem.exemplo.com/remote.php/dav/files/ana/Lida/log/');
  assert.deepEqual(out, [{ name: 'abc.00000001.00000001.json', size: 120 }]);
});
