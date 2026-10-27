import { doc, collection, getDoc, getDocs, onSnapshot, runTransaction, writeBatch, type DocumentData } from 'firebase/firestore';
import { db, decryptLegacyData } from './firebase';
import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useEconomyStore, applyRemoteEconomy } from '../store/useEconomyStore';
import { useVisionStore } from '../store/useVisionStore';
import { useConfigStore } from '../store/useConfigStore';
import { useReflectionStore } from '../store/useReflectionStore';
import { useNoteStore } from '../store/useNoteStore';
import { useFeedStore } from '../store/useFeedStore';
import { useScoreStore } from '../store/useScoreStore';
import { pickDomain, DOMAINS, contentHash, type Snapshot } from './snapshot';
import { applyShard, buildLocalShards, reconcileLocal, snapshotToShards, sortShardIds, META_DOC_ID, type ShardContent } from './shards';
import { extractCounters, newLedger } from './economyLedger';
import {
  createKeyCheck, decryptText, deriveVaultKey, encryptText, forgetVaultKey, getVaultId, getVaultKey, loadVaultKey,
  newKdfParams, storeVaultKey, verifyKeyCheck, isValidKdf, type KdfParams,
} from './vaultCrypto';
import { idbGet, idbSet, isIdbAvailable } from './idb';
import { useSyncStatus, FIRESTORE_DOC_LIMIT, PAYLOAD_WARNING_BYTES } from './syncStatus';

/* eslint-disable @typescript-eslint/no-explicit-any */

// =====================================================================
// COFRE v2
//   users/{uid}               -> documento ANTIGO (só leitura; backup da migração)
//   users/{uid}/vault/_meta   -> parâmetros da chave + índice de pedaços (revisões)
//   users/{uid}/vault/{id}    -> um pedaço criptografado (AES-GCM)
//
// Cada aparelho escuta só o _meta. Quando a revisão de um pedaço muda, baixa
// apenas aquele pedaço. Ao gravar, envia apenas os pedaços que mudaram, dentro
// de uma transação que confere se a nuvem ainda está na versão que este
// aparelho já mesclou (senão baixa, mescla e tenta de novo).
// =====================================================================

export const SCHEMA_VERSION = 2;
const LEGACY_CLEANUP_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

interface MetaShardInfo { rev: string; at: number; size: number }
interface CloudState { uid: string | null; vaultId: string | null; revs: Record<string, string>; hashes: Record<string, string> }

const metaRef = (uid: string) => doc(db, 'users', uid, 'vault', META_DOC_ID);
const shardRef = (uid: string, id: string) => doc(db, 'users', uid, 'vault', id);
const vaultCol = (uid: string) => collection(db, 'users', uid, 'vault');
const legacyRef = (uid: string) => doc(db, 'users', uid);
const shardContext = (vaultId: string, id: string) => `lida:${vaultId}:${id}`;

let unsubscribeMeta: (() => void) | null = null;
let isApplyingCloudData = false;
let metaShards: Record<string, MetaShardInfo> | null = null;
let cloudState: CloudState = { uid: null, vaultId: null, revs: {}, hashes: {} };
let legacyCleanupChecked = false;

let hasSyncedOnce = false;
const markSynced = () => {
  hasSyncedOnce = true;
  if (!useSyncStatus.getState().initialSyncDone) useSyncStatus.setState({ initialSyncDone: true });
};
export const getSyncStatus = () => hasSyncedOnce;
export const isApplyingCloud = () => isApplyingCloudData;

const emitStatus = (type: 'error' | 'warning', message: string) => {
  if (type === 'error') useSyncStatus.setState({ lastError: message });
  else useSyncStatus.setState({ lastWarning: message });
  window.dispatchEvent(new CustomEvent('lida-sync-status', { detail: { type, message } }));
};

const isPermissionError = (e: any) => e?.code === 'permission-denied' || /permission/i.test(String(e?.message || ''));
const reportError = (e: any, fallback: string) => {
  console.error(fallback, e);
  emitStatus('error', isPermissionError(e)
    ? 'A nuvem recusou o acesso ao cofre novo. As regras do Firestore precisam ser atualizadas (veja o guia da migração). Seus dados continuam salvos neste aparelho.'
    : fallback);
};

class VaultReplacedError extends Error {}
class StaleShardsError extends Error {}

// === ESTADO LOCAL DA SINCRONIZAÇÃO (revisões e hashes do que está na nuvem) ===
const CLOUD_STATE_KEY = 'lida-cloud-state';
const loadCloudState = async (uid: string, vaultId: string) => {
  if (cloudState.uid === uid && cloudState.vaultId === vaultId) return;
  let saved: CloudState | undefined;
  if (isIdbAvailable()) { try { saved = await idbGet<CloudState>(CLOUD_STATE_KEY); } catch { /* ignore */ } }
  cloudState = saved && saved.uid === uid && saved.vaultId === vaultId ? saved : { uid, vaultId, revs: {}, hashes: {} };
};
const saveCloudState = async () => {
  if (!isIdbAvailable()) return;
  try { await idbSet(CLOUD_STATE_KEY, cloudState); } catch { /* ignore */ }
};

// === FILA: puxar e enviar nunca rodam ao mesmo tempo ===
let queue: Promise<unknown> = Promise.resolve();
const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
};

// === DEBOUNCE COM TEMPO MÁXIMO ===
const SYNC_DEBOUNCE_MS = 1500;
const SYNC_MAX_WAIT_MS = 10000;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let firstPendingAt: number | null = null;
const scheduleSync = () => {
  const now = Date.now();
  if (firstPendingAt === null) firstPendingAt = now;
  if (syncTimeout) clearTimeout(syncTimeout);
  const delay = Math.max(0, Math.min(SYNC_DEBOUNCE_MS, firstPendingAt + SYNC_MAX_WAIT_MS - now));
  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    firstPendingAt = null;
    syncToCloud().catch(() => { /* já reportado */ });
  }, delay);
};

// === O COFRE FOI APAGADO OU RECRIADO EM OUTRO APARELHO ===
// Este aparelho para de sincronizar (não recria nada com a chave antiga) e pede
// login de novo. Os dados locais continuam aqui e serão mesclados no novo login.
const handleVaultReplaced = async () => {
  stopCloudListener();
  metaShards = null;
  cloudState = { uid: null, vaultId: null, revs: {}, hashes: {} };
  await forgetVaultKey();
  useConfigStore.setState({ hasVaultKey: false });
  emitStatus('error', 'O cofre na nuvem foi apagado ou recriado em outro aparelho. Entre novamente para continuar sincronizando; seus dados deste aparelho foram mantidos.');
};

const checkVaultIdentity = (uid: string, metaData: DocumentData | undefined) => {
  const vaultId = getVaultId(uid);
  if (!metaData || !vaultId || metaData.kdf?.salt !== vaultId) throw new VaultReplacedError();
};

// === APLICAR PEDAÇOS VINDOS DA NUVEM ===
const applyShards = (contents: Record<string, ShardContent>) => {
  isApplyingCloudData = true;
  try {
    for (const id of sortShardIds(Object.keys(contents))) applyShard(id, contents[id]);
    reconcileLocal();
  } finally {
    isApplyingCloudData = false;
  }
};

// Há alterações deste aparelho que ainda não estão na nuvem? Na dúvida
// (sem chave carregada ou sem estado de sincronização), responde que sim.
export const hasUnsyncedChanges = () => {
  const { uid, isLocalMode } = useConfigStore.getState();
  if (!uid || isLocalMode) return false;
  if (!getVaultKey(uid) || cloudState.uid !== uid) return true;
  const known = new Set([...Object.keys(cloudState.revs), ...Object.keys(metaShards || {})]);
  const local = buildLocalShards([...known]);
  return Object.keys(local).some(id => contentHash(local[id]) !== cloudState.hashes[id]);
};

const localDiffersFromCloud = () => {
  const local = buildLocalShards(Object.keys(metaShards || {}));
  return Object.keys(local).some(id => contentHash(local[id]) !== cloudState.hashes[id]);
};

// Baixa pedaços (tudo ou nada: se um falhar, nenhum é aplicado).
const fetchAndApply = async (uid: string, ids: string[], key: CryptoKey) => {
  if (ids.length === 0) return;
  const vaultId = getVaultId(uid)!;
  const docs = await Promise.all(ids.map(id => getDoc(shardRef(uid, id))));
  const contents: Record<string, ShardContent> = {};
  const revs: Record<string, string> = {};
  const missing: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const snap = docs[i];
    if (!snap.exists()) { missing.push(ids[i]); continue; }
    const data = snap.data();
    if (data.vid !== vaultId) throw new VaultReplacedError();
    contents[ids[i]] = JSON.parse(await decryptText(key, data.c, shardContext(vaultId, ids[i])));
    revs[ids[i]] = data.rev;
  }
  applyShards(contents);
  for (const id of Object.keys(contents)) {
    cloudState.revs[id] = revs[id];
    cloudState.hashes[id] = contentHash(contents[id]);
  }
  // Listado no _meta mas inexistente: marca como visto para não buscar de novo.
  for (const id of missing) {
    if (metaShards?.[id]) cloudState.revs[id] = metaShards[id].rev;
    delete cloudState.hashes[id];
  }
  await saveCloudState();
};

const pullChanged = async (uid: string) => {
  const key = getVaultKey(uid);
  if (!key || !metaShards) return;
  const changed = Object.keys(metaShards).filter(id => metaShards![id].rev !== cloudState.revs[id]);
  if (changed.length) await fetchAndApply(uid, changed, key);
  if (localDiffersFromCloud()) scheduleSync();
};

const refreshMeta = async (uid: string) => {
  const snap = await getDoc(metaRef(uid));
  if (snap.metadata.fromCache) throw new Error('Sem conexão com a nuvem.');
  const data = snap.exists() ? snap.data() : undefined;
  checkVaultIdentity(uid, data);
  metaShards = data!.shards || {};
};

const pullAll = async (uid: string) => {
  await refreshMeta(uid);
  await pullChanged(uid);
};

// === ENVIAR PEDAÇOS ALTERADOS ===
const newRev = () => crypto.randomUUID();
const MAX_DOCS_PER_TX = 100;
const MAX_BYTES_PER_TX = 8 * 1024 * 1024; // limite do Firestore por requisição: 10 MiB

const pushShards = async (uid: string, force = false, attempt = 0): Promise<void> => {
  const key = getVaultKey(uid);
  const vaultId = getVaultId(uid);
  if (!key || !vaultId) return;
  if (!metaShards) await refreshMeta(uid);

  const local = buildLocalShards(Object.keys(metaShards || {}));
  const dirty = Object.keys(local).filter(id => force || contentHash(local[id]) !== cloudState.hashes[id]);
  if (dirty.length === 0) return;

  const prepared: { id: string; rev: string; c: string; hash: string }[] = [];
  let total = 0;
  for (const id of dirty) {
    const c = await encryptText(key, JSON.stringify(local[id]), shardContext(vaultId, id));
    if (c.length >= FIRESTORE_DOC_LIMIT - 1024) {
      emitStatus('error', `A parte "${id}" do seu cofre passou de 1 MB e não pôde ser enviada. Ela continua salva neste aparelho.`);
      continue;
    }
    if (c.length >= PAYLOAD_WARNING_BYTES) emitStatus('warning', `A parte "${id}" do seu cofre está com ${(c.length / 1024).toFixed(0)} KB, perto do limite de 1 MB.`);
    total += c.length;
    prepared.push({ id, rev: newRev(), c, hash: contentHash(local[id]) });
  }
  useSyncStatus.setState({ lastPayloadBytes: total });

  // Agrupa em transações respeitando o limite de tamanho por requisição.
  const groups: typeof prepared[] = [];
  let current: typeof prepared = [];
  let currentBytes = 0;
  for (const p of prepared) {
    if (current.length && (current.length >= MAX_DOCS_PER_TX || currentBytes + p.c.length > MAX_BYTES_PER_TX)) {
      groups.push(current); current = []; currentBytes = 0;
    }
    current.push(p); currentBytes += p.c.length;
  }
  if (current.length) groups.push(current);

  try {
    for (const group of groups) {
      const now = Date.now();
      const shardsUpdate: Record<string, MetaShardInfo> = {};
      const serverShards = await runTransaction(db, async (tx) => {
        const metaSnap = await tx.get(metaRef(uid));
        if (!metaSnap.exists() || metaSnap.data().kdf?.salt !== vaultId) throw new VaultReplacedError();
        const server: Record<string, MetaShardInfo> = metaSnap.data().shards || {};
        // Só grava se a nuvem ainda estiver na revisão que este aparelho já mesclou.
        if (group.some(p => server[p.id]?.rev !== cloudState.revs[p.id])) throw new StaleShardsError();
        for (const p of group) {
          tx.set(shardRef(uid, p.id), { v: SCHEMA_VERSION, vid: vaultId, rev: p.rev, c: p.c, at: now });
          shardsUpdate[p.id] = { rev: p.rev, at: now, size: p.c.length };
        }
        tx.set(metaRef(uid), { shards: shardsUpdate, updatedAt: now }, { merge: true });
        return server;
      });
      metaShards = { ...serverShards, ...shardsUpdate };
      for (const p of group) {
        cloudState.revs[p.id] = p.rev;
        cloudState.hashes[p.id] = p.hash;
      }
      await saveCloudState();
    }
  } catch (e) {
    if (e instanceof StaleShardsError) {
      // Outro aparelho gravou antes: baixa TUDO o que mudou, mescla e tenta de novo.
      if (attempt >= 4) throw new Error('Não foi possível conciliar com a nuvem após várias tentativas.');
      await pullAll(uid);
      return pushShards(uid, force, attempt + 1);
    }
    throw e;
  }
  markSynced();
  if (useSyncStatus.getState().lastError) useSyncStatus.setState({ lastError: null });
};

const guarded = async (fn: () => Promise<void>, fallback: string) => {
  try { await fn(); }
  catch (e) {
    if (e instanceof VaultReplacedError) { await handleVaultReplaced(); return; }
    reportError(e, fallback);
    throw e;
  }
};

export const syncToCloud = async (force = false) => {
  const config = useConfigStore.getState();
  if (!config.uid || config.isLocalMode || !getVaultKey(config.uid)) return;
  if (!force && (!hasSyncedOnce || config.isManualOffline || !navigator.onLine)) return;
  const uid = config.uid;
  return exclusive(() => guarded(() => pushShards(uid, force), 'Não foi possível sincronizar com a nuvem. Suas alterações continuam salvas neste aparelho.'));
};

export const syncFromCloud = async () => {
  const uid = useConfigStore.getState().uid;
  if (!uid || !getVaultKey(uid)) return;
  return exclusive(() => guarded(async () => { await pullAll(uid); markSynced(); }, 'Não foi possível baixar os dados da nuvem.'));
};

// === CRIAÇÃO / DESBLOQUEIO / MIGRAÇÃO ===
export type VaultKind = 'v2' | 'legacy' | 'none';

export const getVaultKind = async (uid: string): Promise<VaultKind> => {
  const meta = await getDoc(metaRef(uid));
  if (meta.exists()) return 'v2';
  const legacy = await getDoc(legacyRef(uid));
  return legacy.exists() ? 'legacy' : 'none';
};

// Cria o _meta (se ninguém criou ainda) ou adota o existente. A transação garante
// que dois aparelhos migrando ao mesmo tempo acabem com o MESMO sal/chave.
const createOrAdoptMeta = async (uid: string, pin: string, extra: Record<string, unknown> = {}): Promise<{ key: CryptoKey; vaultId: string } | 'wrong_pin'> => {
  const kdf = newKdfParams();
  const key = await deriveVaultKey(pin, kdf);
  const keyCheck = await createKeyCheck(key);
  const existing = await runTransaction(db, async (tx) => {
    const snap = await tx.get(metaRef(uid));
    if (snap.exists()) return snap.data();
    tx.set(metaRef(uid), { schemaVersion: SCHEMA_VERSION, kdf, keyCheck, createdAt: Date.now(), shards: {}, ...extra });
    return null;
  });
  if (!existing) return { key, vaultId: kdf.salt };
  if (!isValidKdf(existing.kdf)) return 'wrong_pin';
  const adopted = await deriveVaultKey(pin, existing.kdf as KdfParams);
  return (await verifyKeyCheck(adopted, existing.keyCheck)) ? { key: adopted, vaultId: existing.kdf.salt } : 'wrong_pin';
};

const activateKey = async (uid: string, key: CryptoKey, vaultId: string) => {
  await storeVaultKey(uid, key, vaultId);
  metaShards = null;
  await loadCloudState(uid, vaultId);
};

// Converte o documento antigo (CryptoJS) e mescla no estado local.
const applyLegacy = (data: DocumentData, pin: string): boolean => {
  const domains: Partial<Snapshot> = {};
  try {
    for (const d of DOMAINS) {
      if (!data[d]) continue;
      domains[d] = pickDomain(d, JSON.parse(decryptLegacyData(data[d], pin)));
    }
    if (!domains.config) return false;
  } catch {
    return false;
  }

  isApplyingCloudData = true;
  try {
    const legacyShards = snapshotToShards(domains);
    for (const id of sortShardIds(Object.keys(legacyShards))) applyShard(id, legacyShards[id]);
    reconcileLocal();
    // Economia: o registro nasce aqui. Vale a versão mais recente (local x nuvem antiga).
    const local = useEconomyStore.getState() as any;
    const cloudEcon = domains.economy;
    const winner = cloudEcon && (cloudEcon.updatedAt || 0) >= (local.updatedAt || 0) ? cloudEcon : local;
    applyRemoteEconomy(() => useEconomyStore.setState({ ...pickDomain('economy', winner), ledger: newLedger(extractCounters(winner)) } as any));
  } finally {
    isApplyingCloudData = false;
  }
  return true;
};

export type UnlockResult = 'success' | 'wrong_pin' | 'no_data';

export const unlockVault = async (uid: string, pin: string): Promise<UnlockResult> => exclusive(async () => {
  const meta = await getDoc(metaRef(uid));
  if (meta.exists()) {
    const data = meta.data();
    if (!isValidKdf(data.kdf)) return 'wrong_pin';
    const key = await deriveVaultKey(pin, data.kdf as KdfParams);
    if (!(await verifyKeyCheck(key, data.keyCheck))) return 'wrong_pin';
    await activateKey(uid, key, data.kdf.salt);
    await pullAll(uid);
    markSynced();
    return 'success';
  }

  const legacy = await getDoc(legacyRef(uid));
  if (!legacy.exists()) return 'no_data';
  if (!applyLegacy(legacy.data(), pin)) return 'wrong_pin';

  const created = await createOrAdoptMeta(uid, pin, { migratedFromLegacy: true, migratedAt: Date.now() });
  if (created === 'wrong_pin') return 'wrong_pin';
  await activateKey(uid, created.key, created.vaultId);
  await pullAll(uid);            // se outro aparelho migrou antes, mescla o que ele enviou
  await pushShards(uid, true);   // envia o cofre completo no formato novo
  markSynced();
  return 'success';
});

export const createVault = async (uid: string, pin: string): Promise<'success' | 'wrong_pin'> => exclusive(async () => {
  const created = await createOrAdoptMeta(uid, pin);
  if (created === 'wrong_pin') return 'wrong_pin';
  await activateKey(uid, created.key, created.vaultId);
  await pullAll(uid);
  await pushShards(uid, true);
  markSynced();
  return 'success';
});

// Chamado na abertura do app. Carrega a chave deste aparelho ou, se o app acabou
// de ser atualizado da versão antiga, migra o cofre usando a Chave Mestra que a
// versão antiga deixou salva — e depois apaga essa cópia em texto puro.
export type VaultReadiness = 'ready' | 'local' | 'pending' | 'locked';
export const ensureVaultReady = async (): Promise<VaultReadiness> => {
  const config = useConfigStore.getState();
  if (!config.uid || config.isLocalMode) return 'local';
  const key = await loadVaultKey(config.uid);
  if (key) {
    await loadCloudState(config.uid, getVaultId(config.uid)!);
    if (config.e2eePin) config.clearLegacyPin();
    if (!config.hasVaultKey) useConfigStore.setState({ hasVaultKey: true });
    return 'ready';
  }
  if (config.e2eePin) {
    if (!navigator.onLine || config.isManualOffline) return 'pending';
    try {
      const result = await unlockVault(config.uid, config.e2eePin);
      if (result === 'success') { useConfigStore.getState().setAuth(config.uid); return 'ready'; }
      if (result === 'no_data') {
        const created = await createVault(config.uid, config.e2eePin);
        if (created === 'success') { useConfigStore.getState().setAuth(config.uid); return 'ready'; }
      }
      emitStatus('error', 'Não foi possível abrir o cofre com a Chave Mestra salva. Saia e entre novamente.');
      return 'locked';
    } catch (e) {
      reportError(e, 'Não foi possível migrar o cofre para o formato novo agora. Tentaremos de novo na próxima conexão.');
      return 'pending';
    }
  }
  // A chave sumiu deste aparelho (ex.: dados do navegador limpos): pede login de novo.
  useConfigStore.setState({ hasVaultKey: false });
  return 'locked';
};

// O documento antigo usa a criptografia fraca da versão anterior. Ele fica como
// backup por 30 dias após a migração e depois é apagado automaticamente
// (só ele: a subcoleção do cofre novo não é afetada).
const maybeCleanupLegacy = async (uid: string, meta: DocumentData) => {
  if (legacyCleanupChecked) return;
  legacyCleanupChecked = true;
  const migratedAt = Number(meta.migratedAt || 0);
  if (!migratedAt || Date.now() - migratedAt < LEGACY_CLEANUP_AFTER_MS) return;
  try {
    const legacy = await getDoc(legacyRef(uid));
    if (!legacy.exists()) return;
    const batch = writeBatch(db);
    batch.delete(legacyRef(uid));
    await batch.commit();
  } catch (e) {
    console.warn('Não foi possível apagar o cofre antigo.', e);
  }
};

// === LISTENER ===
export const startCloudListener = () => {
  const uid = useConfigStore.getState().uid;
  if (!uid || !getVaultKey(uid)) return;
  if (unsubscribeMeta) unsubscribeMeta();

  if (useConfigStore.getState().isManualOffline) {
    markSynced();
    return;
  }

  unsubscribeMeta = onSnapshot(metaRef(uid), (snap) => {
    // Só age sobre o que o servidor confirmou. Offline, o SDK entrega o cache
    // local (que pode estar vazio) — isso não significa que o cofre sumiu.
    if (snap.metadata.hasPendingWrites || snap.metadata.fromCache) return;
    const data = snap.exists() ? snap.data() : undefined;
    exclusive(async () => {
      checkVaultIdentity(uid, data);
      metaShards = data!.shards || {};
      await pullChanged(uid);
      void maybeCleanupLegacy(uid, data!);
    })
      .then(() => markSynced())
      .catch(async (e) => {
        if (e instanceof VaultReplacedError) await handleVaultReplaced();
        else reportError(e, 'Não foi possível baixar as alterações da nuvem.');
        markSynced();
      });
  }, (error) => {
    reportError(error, 'Conexão com a nuvem interrompida. Tentando novamente quando possível.');
    markSynced();
  });
};

export const stopCloudListener = () => {
  if (unsubscribeMeta) { unsubscribeMeta(); unsubscribeMeta = null; }
};

export const setupAutoSync = () => {
  const handleStoreChange = () => {
    const config = useConfigStore.getState();
    if (isApplyingCloudData || config.isLocalMode || config.isManualOffline) return;
    scheduleSync();
  };
  const unsubs = [
    useTaskStore.subscribe(handleStoreChange),
    useHabitStore.subscribe(handleStoreChange),
    useEconomyStore.subscribe(handleStoreChange),
    useVisionStore.subscribe(handleStoreChange),
    useConfigStore.subscribe(handleStoreChange),
    useReflectionStore.subscribe(handleStoreChange),
    useNoteStore.subscribe(handleStoreChange),
    useFeedStore.subscribe(handleStoreChange),
    useScoreStore.subscribe(handleStoreChange),
  ];
  return () => unsubs.forEach(u => u());
};

// Apaga o cofre novo (todos os pedaços), o documento antigo e a chave local.
// O _meta é apagado primeiro: outros aparelhos online percebem e param de gravar.
export const deleteCloudVault = async (uid: string) => {
  try {
    const all = await getDocs(vaultCol(uid));
    const ids = all.docs.map(d => d.id).sort((a, b) => (a === META_DOC_ID ? -1 : b === META_DOC_ID ? 1 : 0));
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach(id => batch.delete(shardRef(uid, id)));
      await batch.commit();
    }
    const legacy = await getDoc(legacyRef(uid));
    if (legacy.exists()) {
      const batch = writeBatch(db);
      batch.delete(legacyRef(uid));
      await batch.commit();
    }
  } catch (error) {
    console.error("Erro ao deletar cofre na nuvem:", error);
  }
  await lockVault();
};

export const lockVault = async () => {
  stopCloudListener();
  metaShards = null;
  cloudState = { uid: null, vaultId: null, revs: {}, hashes: {} };
  await forgetVaultKey();
};
