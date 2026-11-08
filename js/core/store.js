// Repositório de registros (mesmo motor do Pago e do Zelo).
//
// Cada entidade (tarefa, hábito, registro de água, evento de XP...) é um registro independente,
// cifrado no aparelho, versionado por HLC e guardado no IndexedDB com uma fila de envio (outbox).
//
// 1. Conflitos são resolvidos por CAMPO. Cada campo guarda a própria versão (fv) e quem o gravou (fb).
//    Se uma pessoa muda o prazo e a outra marca uma subtarefa ao mesmo tempo, as duas alterações ficam.
//    A junção é comutativa, associativa e idempotente: todos os aparelhos convergem.
// 2. Quando o MESMO campo foi alterado pelas duas pessoas sem uma ter visto a outra, vence a mais nova
//    e quem perdeu recebe um aviso para decidir (conflicts()).
// 3. su = última versão deste registro que o aparelho sabe estar no servidor. Vai no envio como base,
//    e as regras do Firestore só aceitam a gravação se ela ainda for a versão atual (compare-and-swap).
//
// Diferente do Zelo, o Lida abre DOIS espaços ao mesmo tempo (o pessoal e o compartilhado), cada um
// com a sua chave. Por isso o repositório é uma fábrica: createStore() devolve uma instância.
import { seal, unseal } from '../lib/crypto.js';
import { tick, observe, hlcMs } from '../lib/hlc.js';
import { uid } from '../lib/util.js';
import { nowMs } from '../lib/clock.js';

const CONFLICT_WINDOW = 60 * 60000;
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const aad = (r) => `${r.id}|${r.u}|${r.del ? 1 : 0}`;

// watch: { [tipo]: { campo: 'rótulo' } } — campos em que vale avisar sobre alteração sobreposta.
export function createStore({ name = 'space', watch = {} } = {}) {
  let db = null;
  let key = null;
  let me = 'local';
  const recs = new Map();
  let version = 0;
  const subs = new Set();
  let queued = false;
  let kick = () => {};
  let pending = [];
  const csubs = new Set();
  const snaps = new Map(); // cache de fotografias por construtor

  function notify() {
    version++;
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      subs.forEach((f) => f());
    });
  }

  async function sealRow(rec) {
    const payload = rec.del ? { type: rec.type } : { type: rec.type, data: rec.data, fv: rec.fv, fb: rec.fb, fp: rec.fp, cb: rec.cb, ca: rec.ca };
    const { iv, ct } = await seal(key, payload, aad(rec));
    return { id: rec.id, u: rec.u, by: rec.by, su: rec.su || null, del: rec.del ? 1 : 0, iv, ct };
  }

  async function persist(rec, outbox = true) {
    const row = await sealRow(rec);
    await db.write([row], outbox ? [rec.id] : []);
    return row;
  }

  // Nova versão de um registro, versionando só os campos que mudaram.
  function build(type, data, id, prev) {
    const u = tick();
    const live = prev && !prev.del ? prev : null;
    const clean = {};
    for (const [k, v] of Object.entries(data)) if (k !== 'id' && !k.startsWith('_') && v !== undefined) clean[k] = v;
    const fv = { ...(live?.fv || {}) };
    const fb = { ...(live?.fb || {}) };
    const fp = { ...(live?.fp || {}) };
    const old = live?.data || {};
    for (const k of new Set([...Object.keys(old), ...Object.keys(clean)])) {
      if (!same(old[k], clean[k]) || !fv[k]) {
        fp[k] = fv[k] || '';
        fv[k] = u;
        fb[k] = me;
      }
    }
    return { id, type, data: clean, fv, fb, fp, u, by: me, su: prev?.su || null, cb: live ? live.cb : me, ca: live ? live.ca : nowMs(), del: false };
  }

  /* ---------- Junção campo a campo ---------- */
  function mergeLive(a, b) {
    const data = {};
    const fv = {};
    const fb = {};
    const fp = {};
    let fromA = false;
    let fromB = false;
    const lost = [];
    const keys = new Set([...Object.keys(a.fv || {}), ...Object.keys(b.fv || {}), ...Object.keys(a.data || {}), ...Object.keys(b.data || {})]);
    for (const k of keys) {
      const va = a.fv?.[k] || '';
      const vb = b.fv?.[k] || '';
      const useB = vb > va;
      const src = useB ? b : a;
      if (src.data && k in src.data) data[k] = src.data[k];
      if (src.fv?.[k]) fv[k] = src.fv[k];
      if (src.fb?.[k]) fb[k] = src.fb[k];
      if (src.fp?.[k] != null) fp[k] = src.fp[k];
      if (same(a.data?.[k], b.data?.[k])) continue;
      if (useB) {
        fromB = true;
        lost.push(k);
      } else if (va > vb) fromA = true;
    }
    return { data, fv, fb, fp, fromA, fromB, lost };
  }

  function noteConflicts(local, remote, lost) {
    const w = watch[local.type];
    if (!w) return;
    const now = nowMs();
    for (const k of lost) {
      if (!w[k]) continue;
      if (local.fb?.[k] !== me || remote.fb?.[k] === me) continue;
      if ((remote.fp?.[k] ?? '') === (local.fv?.[k] ?? '')) continue; // a outra pessoa partiu do meu valor
      if (now - hlcMs(local.fv?.[k]) > CONFLICT_WINDOW) continue;
      pending = pending.filter((c) => !(c.id === local.id && c.field === k));
      pending.push({ cid: uid(8), id: local.id, type: local.type, field: k, label: w[k], mine: local.data?.[k], theirs: remote.data?.[k], by: remote.fb?.[k], at: now });
    }
    if (pending.length) csubs.forEach((f) => f(pending));
  }

  async function mergeIn(r, serverU) {
    const cur = recs.get(r.id);
    observe(r.u);
    const incoming = r.del
      ? { id: r.id, type: r.type, u: r.u, by: r.by, su: serverU ?? cur?.su ?? null, del: true }
      : { id: r.id, type: r.type, data: r.data || {}, fv: r.fv || {}, fb: r.fb || {}, fp: r.fp || {}, u: r.u, by: r.by, cb: r.cb, ca: r.ca, su: serverU ?? cur?.su ?? null, del: false };

    if (!cur) return { rec: incoming, outbox: false };
    if (cur.u === r.u) return serverU && cur.su !== serverU ? { rec: { ...cur, su: serverU }, outbox: false, quiet: true } : null;

    if (cur.del || incoming.del) {
      if (incoming.u > cur.u) return { rec: incoming, outbox: false };
      return { rec: { ...cur, su: incoming.su }, outbox: true, quiet: true };
    }

    const m = mergeLive(cur, incoming);
    if (!m.fromA && !m.fromB) return { rec: incoming, outbox: false, quiet: true };
    if (!m.fromB) return { rec: { ...cur, u: cur.u > incoming.u ? cur.u : tick(), su: incoming.su }, outbox: true, quiet: true };
    noteConflicts(cur, incoming, m.lost);
    if (!m.fromA) return { rec: incoming, outbox: false };
    return {
      rec: { ...cur, data: m.data, fv: m.fv, fb: m.fb, fp: m.fp, u: tick(), by: me, su: incoming.su, cb: cur.cb || incoming.cb, ca: Math.min(cur.ca || Infinity, incoming.ca || Infinity) },
      outbox: true,
    };
  }

  async function commitMerged(results) {
    const rows = [];
    const outIds = [];
    const dropIds = [];
    let changed = false;
    for (const res of results) {
      if (!res) continue;
      recs.set(res.rec.id, res.rec);
      rows.push(await sealRow(res.rec));
      if (res.outbox) outIds.push(res.rec.id);
      else dropIds.push(res.rec.id);
      if (!res.quiet) changed = true;
    }
    if (!rows.length) return 0;
    await db.write(rows, outIds, dropIds);
    if (changed) notify();
    if (outIds.length) kick();
    return rows.length;
  }

  const view = (r) => ({ id: r.id, ...r.data, _by: r.by, _cb: r.cb, _ca: r.ca, _u: r.u, _fb: r.fb || {}, _fv: r.fv || {} });

  const api = {
    name,
    subscribe: (f) => (subs.add(f), () => subs.delete(f)),
    setKick: (f) => (kick = f),
    setMe: (u) => (me = u),
    getMe: () => me,
    getVersion: () => version,
    getDB: () => db,
    ready: () => !!db,

    async init(_db, _key) {
      db = _db;
      key = _key;
      recs.clear();
      const rows = await db.all('records');
      const bad = [];
      await Promise.all(
        rows.map(async (row) => {
          try {
            const p = await unseal(key, row.iv, row.ct, aad(row));
            recs.set(row.id, { id: row.id, u: row.u, by: row.by, su: row.su || null, del: !!row.del, ...p });
            observe(row.u);
          } catch {
            bad.push(row.id);
          }
        }),
      );
      if (bad.length) {
        await db.removeRecords(bad);
        await db.put('meta', 0, 'cursor');
      }
      notify();
      return { count: rows.length, rejected: bad.length };
    },

    // Grava o registro inteiro (campos ausentes deixam de existir).
    async save(type, data, id) {
      id = id || uid();
      const rec = build(type, data, id, recs.get(id));
      await persist(rec);
      recs.set(id, rec);
      notify();
      kick();
      return id;
    },

    // Altera só alguns campos de um registro existente.
    async patch(id, fields) {
      const prev = recs.get(id);
      if (!prev || prev.del) return null;
      return api.save(prev.type, { ...prev.data, ...fields }, id);
    },

    // Vários registros numa transação. items: [{ type, data, id, ca? }]
    async saveMany(items) {
      const out = [];
      const rows = [];
      for (const it of items) {
        const id = it.id || uid();
        const rec = build(it.type, it.data, id, recs.get(id));
        if (it.ca) rec.ca = it.ca;
        recs.set(id, rec);
        out.push(id);
        rows.push(sealRow(rec));
      }
      const sealed = await Promise.all(rows);
      for (let i = 0; i < sealed.length; i += 500) await db.write(sealed.slice(i, i + 500), sealed.slice(i, i + 500).map((r) => r.id));
      notify();
      kick();
      return out;
    },

    async remove(id) {
      const prev = recs.get(id);
      if (!prev || prev.del) return;
      const rec = { id, type: prev.type, u: tick(), by: me, su: prev.su || null, del: true };
      await persist(rec);
      recs.set(id, rec);
      notify();
      kick();
    },

    async removeMany(ids) {
      const rows = [];
      for (const id of ids) {
        const prev = recs.get(id);
        if (!prev || prev.del) continue;
        const rec = { id, type: prev.type, u: tick(), by: me, su: prev.su || null, del: true };
        recs.set(id, rec);
        rows.push(await sealRow(rec));
      }
      if (!rows.length) return;
      await db.write(rows, rows.map((r) => r.id));
      notify();
      kick();
    },

    // Linhas cifradas vindas do servidor: { id, u, by, del, iv, ct }.
    async applyRemoteMany(rows) {
      const results = [];
      for (const row of rows) {
        try {
          const p = await unseal(key, row.iv, row.ct, `${row.id}|${row.u}|${row.del ? 1 : 0}`);
          results.push(await mergeIn({ id: row.id, u: row.u, by: row.by, del: !!row.del, ...p }, row.u));
        } catch {
          /* cifrado com outra chave ou adulterado: ignora */
        }
      }
      return commitMerged(results);
    },

    // Versões já decifradas (modo demo simulando outra pessoa, backup, importação).
    async applyPlainMany(list) {
      const results = [];
      for (const r of list) results.push(await mergeIn(r, null));
      return commitMerged(results);
    },

    async markServer(id, u) {
      const cur = recs.get(id);
      if (!cur || cur.u !== u) return false;
      if (cur.su === u) return true;
      cur.su = u;
      const row = await db.get('records', id);
      if (row && row.u === u) {
        row.su = u;
        await db.write([row], [], [id]);
      }
      return true;
    },

    // Versão "de outra pessoa" (modo demo).
    foreignVersion(id, fields, by, { concurrent = false } = {}) {
      const cur = recs.get(id);
      if (!cur || cur.del) return null;
      const u = tick();
      const fv = { ...cur.fv };
      const fb = { ...cur.fb };
      const fp = { ...(cur.fp || {}) };
      for (const k of Object.keys(fields)) {
        fp[k] = concurrent ? (cur.fp?.[k] ?? '') : fv[k] || '';
        fv[k] = u;
        fb[k] = by;
      }
      return { id, type: cur.type, data: { ...cur.data, ...fields }, fv, fb, fp, u, by, cb: cur.cb, ca: cur.ca, del: false };
    },
    foreignNew(type, data, by, id = uid()) {
      const u = tick();
      const fv = {};
      const fb = {};
      for (const k of Object.keys(data)) {
        fv[k] = u;
        fb[k] = by;
      }
      return { id, type, data, fv, fb, u, by, cb: by, ca: nowMs(), del: false };
    },

    /* ---------- Conflitos do mesmo campo ---------- */
    conflicts: () => pending,
    onConflicts: (f) => (csubs.add(f), () => csubs.delete(f)),
    async resolveConflict(cid, keepMine) {
      const c = pending.find((x) => x.cid === cid);
      pending = pending.filter((x) => x.cid !== cid);
      csubs.forEach((f) => f(pending));
      if (c && keepMine) await api.patch(c.id, { [c.field]: c.mine });
    },

    /* ---------- Manutenção ---------- */
    // Registros em texto puro (importação, backup). Sem fv, cada campo recebe a versão do registro.
    async importPlain(list) {
      const fixed = list.map((r) => (r.del ? r : { ...r, fv: r.fv || Object.fromEntries(Object.keys(r.data || {}).map((k) => [k, r.u])), fb: r.fb || {} }));
      return api.applyPlainMany(fixed);
    },

    // Passa os registros criados no modo "só neste aparelho" para a conta Google.
    async claimLocal(newMe) {
      me = newMe;
      for (const rec of [...recs.values()]) {
        const next = { ...rec, u: tick(), by: newMe, su: null };
        if (!rec.del) {
          if (rec.cb === 'local') next.cb = newMe;
          next.fb = Object.fromEntries(Object.entries(rec.fb || {}).map(([k, v]) => [k, v === 'local' ? newMe : v]));
        }
        await persist(next);
        recs.set(rec.id, next);
      }
      notify();
      kick();
    },

    async gcLocal(horizonMs) {
      const out = new Set(await db.keys('outbox'));
      const drop = [];
      for (const r of recs.values()) if (r.del && hlcMs(r.u) < horizonMs && !out.has(r.id)) drop.push(r.id);
      if (!drop.length) return 0;
      await db.removeRecords(drop);
      drop.forEach((id) => recs.delete(id));
      return drop.length;
    },

    async dropMissing(serverIds) {
      const out = new Set(await db.keys('outbox'));
      const drop = [...recs.keys()].filter((id) => !serverIds.has(id) && !out.has(id));
      if (!drop.length) return 0;
      await db.removeRecords(drop);
      drop.forEach((id) => recs.delete(id));
      notify();
      return drop.length;
    },

    raw: (id) => recs.get(id) || null,
    get(id) {
      const r = recs.get(id);
      return r && !r.del ? view(r) : null;
    },
    allRecords: () => [...recs.values()],
    // Registros vivos de um tipo (já no formato de leitura).
    list(type) {
      const out = [];
      for (const r of recs.values()) if (!r.del && r.type === type) out.push(view(r));
      return out;
    },
    stats() {
      let live = 0;
      let tomb = 0;
      for (const r of recs.values()) r.del ? tomb++ : live++;
      return { live, tomb };
    },

    // Fotografia imutável construída por `builder(list)`; refeita só quando algo muda.
    snapshot(builder) {
      const hit = snaps.get(builder);
      if (hit && hit.v === version) return hit.s;
      const s = Object.freeze(builder(api.list, api));
      snaps.set(builder, { v: version, s });
      return s;
    },
  };
  return api;
}
