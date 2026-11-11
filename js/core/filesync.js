// Sincronização por arquivos, na nuvem da própria pessoa (Dropbox, OneDrive, WebDAV/Nextcloud).
// Mesma interface do motor do Firestore (sync.js): start, stop, onStatus, getStatus, syncNow,
// pullNow, lastSync, pending. O resto do app não sabe qual dos dois está rodando.
//
// Pasta do Lida na nuvem:
//   space.json                     { app: 'lida', v, sid, wrap }  a chave do espaço, embrulhada pela
//                                  senha (sem a senha, nada ali é legível)
//   log/<aparelho>.<de>.<até>.json  pacotes de registros cifrados que ESTE aparelho enviou, em ordem.
// Cada aparelho só escreve os próprios pacotes (nunca dois aparelhos no mesmo arquivo, então não há
// arquivo "em conflito" no Dropbox/OneDrive) e lê os dos outros a partir de onde parou (um cursor por
// aparelho). Juntar o que chega segue a regra de sempre: campo a campo, vence a versão mais nova, e
// mudanças ao mesmo tempo viram aviso de conflito. Ler um pacote duas vezes não muda nada.
// Quando um aparelho acumula muitos pacotes, ele os junta num só (só a versão mais nova de cada
// registro) e apaga os antigos.
import { b64, unb64, b64big } from '../lib/crypto.js';

const LOG = 'log';
const SPACE = 'space.json';
const CHUNK = 400; // registros por pacote
const COMPACT_AT = 40; // pacotes do próprio aparelho antes de juntar
const POLL = 60000;
const pad = (n) => String(n).padStart(8, '0');
export const segName = (dev, from, to) => `${dev}.${pad(from)}.${pad(to)}.json`;
export function parseSeg(name) {
  const m = /^([a-z0-9]+)\.(\d{8})\.(\d{8})\.json$/.exec(name);
  return m ? { name, dev: m[1], from: Number(m[2]), to: Number(m[3]) } : null;
}

const enc = (r) => ({ id: r.id, u: r.u, by: r.by, del: r.del ? 1 : 0, iv: b64(r.iv), ct: b64big(r.ct) });
const dec = (r) => ({ id: r.id, u: r.u, by: r.by, del: !!r.del, iv: unb64(r.iv), ct: unb64(r.ct) });

export const wrapOut = (w) => ({ v: w.v, iter: w.iter, salt: b64(w.salt), iv: b64(w.iv), ct: b64(w.ct) });
export const wrapIn = (w) => ({ v: w.v, iter: w.iter, salt: unb64(w.salt), iv: unb64(w.iv), ct: unb64(w.ct) });
export const spaceDoc = (sid, wrap) => JSON.stringify({ app: 'lida', v: 1, sid, wrap: wrapOut(wrap), at: Date.now() });
export async function readSpace(provider) {
  const t = await provider.get(SPACE);
  if (t == null) return null;
  let x;
  try {
    x = JSON.parse(t);
  } catch {
    x = null;
  }
  if (x?.app !== 'lida' || !x.sid || !x.wrap) {
    const e = new Error('Esta pasta tem um space.json que não é do Lida.');
    e.code = 'config';
    throw e;
  }
  return { sid: x.sid, wrap: wrapIn(x.wrap) };
}

export function createFileSync(store, { idb, provider, device, sid, wrap, onLost = () => {} }) {
  let status = 'local';
  let timer = null;
  let poll = null;
  let job = null;
  let again = false;
  let lastOk = 0;
  let lastErr = '';
  let checked = false;
  let compactDay = 0;
  const listeners = new Set();
  const online = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

  const setStatus = (s) => {
    status = s;
    listeners.forEach((f) => f(s));
  };
  const markOk = () => {
    lastOk = Date.now();
    listeners.forEach((f) => f(status));
    idb.put('meta', lastOk, 'lastSyncOk').catch?.(() => {});
  };
  const schedule = (ms) => {
    clearTimeout(timer);
    timer = setTimeout(() => run().catch(() => {}), ms);
  };
  const onOnline = () => schedule(0);
  const onOffline = () => setStatus('offline');
  const onVis = () => typeof document !== 'undefined' && document.visibilityState === 'visible' && schedule(300);

  // A pasta ainda é deste espaço? (alguém pode ter apagado a pasta ou trocado o conteúdo)
  async function checkSpace() {
    if (checked) return;
    const sp = await readSpace(provider);
    if (!sp) {
      // Pasta vazia (apagada?): escreve de novo e manda tudo.
      await provider.put(SPACE, spaceDoc(sid, wrap));
      await store.queue(store.allRecords().map((r) => r.id));
      await idb.put('meta', {}, 'fcur');
    } else if (sp.sid !== sid) {
      const e = new Error('A pasta na nuvem agora tem outro Lida. Conecte de novo em Ajustes.');
      e.code = 'auth';
      throw e;
    }
    checked = true;
  }

  async function ack(row) {
    await store.markServer(row.id, row.u);
    const cur = await idb.get('records', row.id);
    if (cur && cur.u === row.u) await idb.del('outbox', row.id);
  }

  async function push() {
    const ids = await idb.keys('outbox');
    for (let i = 0; i < ids.length; i += CHUNK) {
      const rows = (await Promise.all(ids.slice(i, i + CHUNK).map((id) => idb.get('records', id)))).filter(Boolean);
      if (!rows.length) continue;
      // O número do pacote avança antes de enviar: um envio que "falhou" mas chegou não é sobrescrito.
      const seq = ((await idb.get('meta', 'fseq')) || 0) + 1;
      await idb.put('meta', seq, 'fseq');
      await provider.put(`${LOG}/${segName(device, seq, seq)}`, JSON.stringify({ v: 1, dev: device, from: seq, to: seq, at: Date.now(), rows: rows.map(enc) }));
      for (const r of rows) await ack(r);
    }
    // Chegou algo novo para enviar enquanto este envio rodava.
    return (await idb.keys('outbox')).length;
  }

  async function pull(files) {
    const cur = (await idb.get('meta', 'fcur')) || {};
    const todo = files.filter((f) => f.dev !== device && f.to > (cur[f.dev] || 0)).sort((a, b) => a.to - b.to || a.from - b.from);
    const gone = new Set();
    for (const f of todo) {
      if (gone.has(f.dev) || f.to <= (cur[f.dev] || 0)) continue;
      const text = await provider.get(`${LOG}/${f.name}`);
      if (text == null) {
        // Sumiu entre listar e baixar (o outro aparelho juntou os pacotes): pega na próxima rodada.
        gone.add(f.dev);
        again = true;
        continue;
      }
      let pkg;
      try {
        pkg = JSON.parse(text);
      } catch {
        continue; // arquivo pela metade (ainda subindo): tenta de novo na próxima
      }
      const rows = (pkg.rows || []).map(dec);
      if (rows.length) await store.applyRemoteMany(rows);
      cur[f.dev] = Math.max(cur[f.dev] || 0, f.to);
      await idb.put('meta', cur, 'fcur');
    }
  }

  // Junta os pacotes deste aparelho num só (uma vez por dia, no máximo).
  async function compact(files) {
    const mine = files.filter((f) => f.dev === device).sort((a, b) => a.from - b.from);
    const day = Math.floor(Date.now() / 86400000);
    if (mine.length < COMPACT_AT || compactDay === day) return;
    compactDay = day;
    const best = new Map();
    for (const f of mine) {
      const t = await provider.get(`${LOG}/${f.name}`);
      if (t == null) continue;
      for (const r of JSON.parse(t).rows || []) {
        const p = best.get(r.id);
        if (!p || r.u > p.u) best.set(r.id, r);
      }
    }
    const from = mine[0].from;
    const to = Math.max(...mine.map((f) => f.to));
    const name = segName(device, from, to);
    await provider.put(`${LOG}/${name}`, JSON.stringify({ v: 1, dev: device, from, to, at: Date.now(), rows: [...best.values()] }));
    for (const f of mine) if (f.name !== name) await provider.del(`${LOG}/${f.name}`);
  }

  async function round() {
    if (!online()) return setStatus('offline');
    setStatus('syncing');
    try {
      await checkSpace();
      const left = await push();
      const files = (await provider.list(LOG)).map((f) => parseSeg(f.name)).filter(Boolean);
      await pull(files);
      const pendingNow = left || (await idb.keys('outbox')).length;
      if (pendingNow) again = true;
      else markOk();
      lastErr = '';
      setStatus('synced');
      compact(files).catch(() => {});
      return true;
    } catch (e) {
      lastErr = e?.message || String(e);
      if (e?.code === 'auth') {
        setStatus('denied');
        onLost(e);
      } else setStatus(!online() || e?.code === 'offline' ? 'offline' : 'error');
      return false;
    }
  }

  // Uma rodada por vez; pedidos durante a rodada viram mais uma rodada no fim.
  function run() {
    if (job) {
      again = true;
      return job;
    }
    job = round().finally(() => {
      job = null;
      if (again) {
        again = false;
        schedule(1200);
      }
    });
    return job;
  }

  return {
    kind: provider.kind,
    onStatus: (f) => (listeners.add(f), f(status), () => listeners.delete(f)),
    getStatus: () => status,
    lastError: () => lastErr,
    syncNow: () => schedule(0),
    lastSync: () => lastOk,
    pending: async () => (await idb.keys('outbox')).length,

    // Envia e recebe agora e espera terminar (a virada do dia depende disso). false sem conexão.
    async pullNow(ms = 15000) {
      if (!online()) return false;
      const t = new Promise((r) => setTimeout(() => r(false), ms));
      return Promise.race([(job || Promise.resolve()).then(() => run()), t]);
    },

    async start() {
      lastOk = (await idb.get('meta', 'lastSyncOk')) || 0;
      store.setKick(() => schedule(1500));
      if (typeof window !== 'undefined') {
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        document.addEventListener('visibilitychange', onVis);
      }
      poll = setInterval(() => (typeof document === 'undefined' || document.visibilityState === 'visible') && run(), POLL);
      setStatus(online() ? 'syncing' : 'offline');
      schedule(0);
    },

    stop() {
      clearTimeout(timer);
      clearInterval(poll);
      store.setKick(() => {});
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        document.removeEventListener('visibilitychange', onVis);
      }
    },
    // Para os testes: uma rodada completa, esperando.
    _round: () => run(),
  };
}
