// === INDEXEDDB MÍNIMO ===
// Armazenamento assíncrono, sem o limite de ~5 MB do localStorage.
// Dois "object stores": 'kv' (estado das stores e metadados de sync) e
// 'keys' (a chave do cofre, guardada como CryptoKey não-exportável).

const DB_NAME = 'lida';
const DB_VERSION = 1;
export type IdbStoreName = 'kv' | 'keys';

let dbPromise: Promise<IDBDatabase> | null = null;

export const isIdbAvailable = () => {
  try { return typeof indexedDB !== 'undefined' && indexedDB !== null; } catch { return false; }
};

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('keys')) db.createObjectStore('keys');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
    req.onblocked = () => console.warn('IndexedDB bloqueado por outra aba aberta.');
  });
  return dbPromise;
};

const run = async <T>(store: IdbStoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

export const idbGet = <T = unknown>(key: string, store: IdbStoreName = 'kv') => run<T | undefined>(store, 'readonly', s => s.get(key));
export const idbSet = (key: string, value: unknown, store: IdbStoreName = 'kv') => run<IDBValidKey>(store, 'readwrite', s => s.put(value, key)).then(() => undefined);
export const idbDel = (key: string, store: IdbStoreName = 'kv') => run<undefined>(store, 'readwrite', s => s.delete(key)).then(() => undefined);
export const idbClearAll = async () => {
  if (!isIdbAvailable()) return;
  await run<undefined>('kv', 'readwrite', s => s.clear());
  await run<undefined>('keys', 'readwrite', s => s.clear());
};
