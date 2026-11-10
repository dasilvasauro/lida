// Motor de sincronização de UM espaço (mesmo do Pago e do Zelo).
//
// Envio: fila local (outbox) -> writeBatch. Cada gravação leva a base "b" (a versão do servidor que
// este aparelho conhecia). As regras só aceitam se b for a versão atual e u for maior (compare-and-swap).
// Se alguém gravou antes, o aparelho baixa a versão nova, junta campo a campo e envia de novo.
// Recebimento: listener por "ts > cursor" (só o que mudou desde a última vez).
// Exclusões: apagadas do servidor quando todos os membros ativos já sincronizaram depois delas e
// passaram 30 dias. Uma réplica que ficou fora além desse prazo faz uma reconciliação completa.
import { loadFirebase, B, U, listMembers } from './cloud.js';

const DAY = 86400000;
const HORIZON = 30 * DAY;

export function createSync(store, { sid, uid: me, idb }) {
  let fb = null;
  let unsub = null;
  let pushing = false;
  let again = false;
  let timer = null;
  let status = 'local';
  let lastPresence = 0;
  let conflictRounds = 0;
  let cursor = 0;
  let lastOk = 0; // última vez em que este aparelho conversou com o servidor sem nada pendente
  const markOk = () => {
    lastOk = Date.now();
    listeners.forEach((f) => f(status));
    idb.put('meta', lastOk, 'lastSyncOk').catch?.(() => {});
  };
  let markStarted = () => {};
  const started = new Promise((r) => (markStarted = r));
  const listeners = new Set();
  const toRow = (d) => {
    const x = d.data();
    return x.ts ? { id: d.id, u: x.u, by: x.by, del: !!x.del, iv: U(x.iv), ct: U(x.ct), ts: x.ts.toMillis() } : null;
  };

  const setStatus = (s) => {
    status = s;
    listeners.forEach((f) => f(s));
  };
  const recDoc = (id) => fb.F.doc(fb.db, 'spaces', sid, 'records', id);
  const recCol = () => fb.F.collection(fb.db, 'spaces', sid, 'records');
  const toDoc = (r) => ({ u: r.u, by: me, del: !!r.del, b: r.su || null, iv: B(r.iv), ct: B(r.ct), ts: fb.F.serverTimestamp() });

  const schedule = (ms) => {
    clearTimeout(timer);
    timer = setTimeout(push, ms);
  };
  const onOnline = () => schedule(0);
  const onOffline = () => setStatus('offline');

  async function ack(row) {
    await store.markServer(row.id, row.u);
    const cur = await idb.get('records', row.id);
    if (cur && cur.u === row.u) await idb.del('outbox', row.id);
  }

  async function push() {
    if (!fb) return;
    if (pushing) {
      again = true;
      return;
    }
    if (!navigator.onLine) return setStatus('offline');
    pushing = true;
    const { F } = fb;
    try {
      const ids = await idb.keys('outbox');
      if (ids.length) setStatus('syncing');
      for (let i = 0; i < ids.length; i += 400) {
        const rows = (await Promise.all(ids.slice(i, i + 400).map((id) => idb.get('records', id)))).filter(Boolean);
        const batch = F.writeBatch(fb.db);
        for (const r of rows) batch.set(recDoc(r.id), toDoc(r));
        try {
          await batch.commit();
          for (const r of rows) await ack(r);
        } catch (e) {
          if (e.code !== 'permission-denied') throw e;
          // Algum registro tem versão mais nova no servidor: resolve um a um.
          for (const r of rows) {
            try {
              await F.setDoc(recDoc(r.id), toDoc(r));
              await ack(r);
            } catch (e2) {
              if (e2.code !== 'permission-denied') throw e2;
              const s = await F.getDoc(recDoc(r.id)); // falha aqui = não é mais membro
              await idb.del('outbox', r.id);
              if (s.exists()) {
                const x = s.data();
                await store.applyRemoteMany([{ id: s.id, u: x.u, by: x.by, del: !!x.del, iv: U(x.iv), ct: U(x.ct) }]);
                conflictRounds++;
              }
            }
          }
        }
      }
      const left = (await idb.keys('outbox')).length;
      if (left && conflictRounds < 6) again = true;
      else conflictRounds = 0;
      setStatus('synced');
      if (!left) markOk();
    } catch (e) {
      setStatus(!navigator.onLine ? 'offline' : e.code === 'permission-denied' ? 'denied' : 'error');
    } finally {
      pushing = false;
      if (again) {
        again = false;
        schedule(400);
      }
    }
  }

  async function heartbeat() {
    if (Date.now() - lastPresence < 10 * 60000) return;
    lastPresence = Date.now();
    try {
      await fb.F.setDoc(fb.F.doc(fb.db, 'spaces', sid, 'members', me), { lastSync: fb.F.serverTimestamp() }, { merge: true });
    } catch {
      /* tenta de novo depois */
    }
  }

  async function reconcile() {
    const s = await fb.F.getDocs(recCol());
    await store.dropMissing(new Set(s.docs.map((d) => d.id)));
    await idb.put('meta', 0, 'cursor');
  }

  async function collectGarbage() {
    try {
      const last = (await idb.get('meta', 'gcAt')) || 0;
      if (Date.now() - last < DAY) return;
      await idb.put('meta', Date.now(), 'gcAt');
      const members = (await listMembers(sid)).filter((m) => Date.now() - m.lastSync < 90 * DAY);
      const stable = members.length ? Math.min(...members.map((m) => m.lastSync)) : 0;
      const horizon = Math.min(stable, Date.now() - HORIZON);
      if (horizon <= 0) return;
      await store.gcLocal(horizon);
      const { F } = fb;
      const q = F.query(recCol(), F.where('del', '==', true), F.where('ts', '<', F.Timestamp.fromMillis(horizon)), F.limit(400));
      const snap = await F.getDocs(q);
      if (snap.empty) return;
      const batch = F.writeBatch(fb.db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch {
      /* índice ausente ou offline: tenta amanhã */
    }
  }

  return {
    onStatus: (f) => (listeners.add(f), f(status), () => listeners.delete(f)),
    getStatus: () => status,
    syncNow: () => schedule(0),
    lastSync: () => lastOk,
    pending: async () => (await idb.keys('outbox')).length,

    // Puxa do SERVIDOR (não do cache) tudo o que mudou desde o último cursor e espera aplicar.
    // A virada do dia só roda depois disso: o listener pode estar parado (app em segundo plano a
    // noite toda) e o status "sincronizado" não garante que as mudanças dos outros aparelhos chegaram.
    // Devolve false sem conexão ou se o servidor não responder a tempo.
    async pullNow(ms = 9000) {
      const timeout = new Promise((r) => setTimeout(() => r('timeout'), ms));
      try {
        if ((await Promise.race([started.then(() => 'ok'), timeout])) !== 'ok' || !fb || !navigator.onLine) return false;
        const { F } = fb;
        const q = F.query(recCol(), F.where('ts', '>', F.Timestamp.fromMillis(Math.max(0, cursor - 120000))));
        const snap = await Promise.race([F.getDocsFromServer(q), timeout]);
        if (snap === 'timeout') return false;
        const rows = snap.docs.map(toRow).filter(Boolean);
        if (rows.length) await store.applyRemoteMany(rows);
        const max = Math.max(cursor, ...rows.map((r) => r.ts));
        if (max > cursor) {
          cursor = max;
          await idb.put('meta', cursor, 'cursor');
        }
        await idb.put('meta', Date.now(), 'lastPull');
        if (!(await idb.keys('outbox')).length) markOk();
        return true;
      } catch {
        return false;
      }
    },

    async start() {
      fb = await loadFirebase();
      const { F } = fb;
      store.setKick(() => schedule(700));
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);

      const lastPull = (await idb.get('meta', 'lastPull')) || 0;
      if (lastPull && Date.now() - lastPull > HORIZON - 5 * DAY) await reconcile();

      cursor = (await idb.get('meta', 'cursor')) || 0;
      lastOk = (await idb.get('meta', 'lastSyncOk')) || 0;
      markStarted();
      const q = F.query(recCol(), F.where('ts', '>', F.Timestamp.fromMillis(Math.max(0, cursor - 120000))));
      setStatus(navigator.onLine ? 'syncing' : 'offline');
      unsub = F.onSnapshot(
        q,
        async (snap) => {
          const rows = [];
          let max = cursor;
          for (const ch of snap.docChanges()) {
            if (ch.type === 'removed') continue;
            const d = ch.doc;
            if (d.metadata.hasPendingWrites) continue;
            const x = d.data();
            if (!x.ts) continue;
            max = Math.max(max, x.ts.toMillis());
            rows.push({ id: d.id, u: x.u, by: x.by, del: !!x.del, iv: U(x.iv), ct: U(x.ct) });
          }
          if (rows.length) await store.applyRemoteMany(rows);
          if (max > cursor) {
            cursor = max;
            await idb.put('meta', cursor, 'cursor');
          }
          await idb.put('meta', Date.now(), 'lastPull');
          heartbeat();
          if (!pushing) setStatus('synced');
          if (!snap.metadata.fromCache && !pushing && !(await idb.keys('outbox')).length) markOk();
        },
        (err) => setStatus(err.code === 'permission-denied' ? 'denied' : 'error'),
      );
      schedule(0);
      setTimeout(collectGarbage, 15000);
    },

    stop() {
      unsub?.();
      unsub = null;
      clearTimeout(timer);
      store.setKick(() => {});
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    },
  };
}
