// === ECONOMIA COMO REGISTRO POR DISPOSITIVO ===
// Em vez de sincronizar "gold = 1200" (o último a gravar vence e o outro perde o
// que ganhou), cada aparelho guarda só as variações que ele mesmo produziu.
//
//   total = base + soma das variações de todos os aparelhos
//
// Cada aparelho só escreve na própria entrada, então o merge nunca perde nada:
// basta ficar com a versão mais recente (maior seq) de cada entrada.

export type CounterTree = { [key: string]: number | CounterTree };

export interface DeviceEntry {
  seq: number;
  delta: CounterTree;
  at: number;
}

export interface Ledger {
  base: CounterTree;
  baseAt: number;
  devices: Record<string, DeviceEntry>;
  // Eventos com identidade própria (ex.: punição por uma tarefa que falhou).
  // Se dois aparelhos registrarem o mesmo evento, ele conta uma vez só.
  events?: Record<string, CounterTree>;
}

// Campos numéricos que viram contadores. Os demais (temas comprados, marcos,
// boosts) são conjuntos/máximos e têm merge próprio.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const extractCounters = (s: any): CounterTree => ({
  xp: s.xp || 0,
  gold: s.gold || 0,
  vouchers: s.vouchers || 0,
  voucherProgress: s.voucherProgress || 0,
  inventory: { ...(s.inventory || {}) },
  dailyHistory: JSON.parse(JSON.stringify(s.dailyHistory || {})),
});

const isTree = (v: unknown): v is CounterTree => !!v && typeof v === 'object';

export const diffTree = (prev: CounterTree, next: CounterTree): CounterTree => {
  const out: CounterTree = {};
  for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    const a = prev[key], b = next[key];
    if (isTree(a) || isTree(b)) {
      const sub = diffTree(isTree(a) ? a : {}, isTree(b) ? b : {});
      if (Object.keys(sub).length) out[key] = sub;
    } else {
      const d = (Number(b) || 0) - (Number(a) || 0);
      if (d !== 0) out[key] = d;
    }
  }
  return out;
};

export const addTree = (a: CounterTree, b: CounterTree): CounterTree => {
  const out: CounterTree = JSON.parse(JSON.stringify(a));
  for (const key of Object.keys(b)) {
    const v = b[key];
    if (isTree(v)) out[key] = addTree(isTree(out[key]) ? (out[key] as CounterTree) : {}, v);
    else out[key] = ((typeof out[key] === 'number' ? (out[key] as number) : 0) + v);
  }
  return out;
};

export const isEmptyTree = (t: CounterTree) => Object.keys(t).length === 0;

export const computeTotals = (ledger: Ledger) => {
  let total = ledger.base;
  for (const id of Object.keys(ledger.devices).sort()) total = addTree(total, ledger.devices[id].delta);
  for (const id of Object.keys(ledger.events || {}).sort()) total = addTree(total, ledger.events![id]);
  const t = total as any;
  // Progresso de voucher é "vai um" a cada 3: normaliza somas concorrentes.
  let progress = t.voucherProgress || 0;
  let vouchers = t.vouchers || 0;
  if (progress < 0 || progress >= 3) {
    const carry = Math.floor(progress / 3);
    vouchers += carry;
    progress -= carry * 3;
  }
  return {
    xp: t.xp || 0,
    gold: t.gold || 0,
    vouchers,
    voucherProgress: progress,
    inventory: { ...(t.inventory || {}) },
    dailyHistory: t.dailyHistory || {},
  };
};

export const newLedger = (counters: CounterTree): Ledger => ({ base: counters, baseAt: Date.now(), devices: {}, events: {} });

export const recordEvent = (ledger: Ledger, eventId: string, delta: CounterTree): Ledger => {
  const cur = ledger.events?.[eventId];
  return { ...ledger, events: { ...(ledger.events || {}), [eventId]: cur ? addTree(cur, delta) : delta } };
};

// Escolha simétrica entre duas versões diferentes do mesmo evento.
const stable = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => (a < b ? -1 : 1))) : val));
const pickEvent = (a: CounterTree, b: CounterTree) => (stable(a) <= stable(b) ? a : b);

export const recordDelta = (ledger: Ledger, deviceId: string, delta: CounterTree): Ledger => {
  const cur = ledger.devices[deviceId] || { seq: 0, delta: {}, at: 0 };
  return { ...ledger, devices: { ...ledger.devices, [deviceId]: { seq: cur.seq + 1, delta: addTree(cur.delta, delta), at: Date.now() } } };
};

// Merge simétrico. Base: vence a nuvem (só é definida uma vez, na migração).
// Entradas: maior seq vence; empate fica com a nuvem.
export const mergeLedgers = (local: Ledger | undefined, cloud: Ledger | undefined): Ledger | undefined => {
  if (!cloud) return local;
  if (!local) return cloud;
  const devices: Record<string, DeviceEntry> = { ...local.devices };
  for (const [id, entry] of Object.entries(cloud.devices || {})) {
    const l = devices[id];
    if (!l || entry.seq >= l.seq) devices[id] = entry;
  }
  const events: Record<string, CounterTree> = { ...(local.events || {}) };
  for (const [id, ev] of Object.entries(cloud.events || {})) events[id] = events[id] ? pickEvent(events[id], ev) : ev;
  return { base: cloud.base, baseAt: cloud.baseAt, devices, events };
};

const DEVICE_KEY = 'lida-device-id';
let cachedDeviceId: string | null = null;

const persistentDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

// Duas abas abertas no mesmo aparelho não podem escrever na mesma entrada do
// registro (uma apagaria a outra). A primeira aba fica com o id do aparelho
// (trava via Web Locks); as demais usam um id próprio.
export const initDeviceId = async (): Promise<void> => {
  const base = persistentDeviceId();
  const locks = (typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined);
  if (!locks?.request) { cachedDeviceId = base; return; }
  const acquired = await new Promise<boolean>((resolve) => {
    locks.request(`lida-device-${base}`, { ifAvailable: true }, (lock) => {
      if (!lock) { resolve(false); return; }
      resolve(true);
      return new Promise<void>(() => { /* mantém a trava enquanto a aba existir */ });
    }).catch(() => resolve(false));
  });
  cachedDeviceId = acquired ? base : `${base}~${crypto.randomUUID().slice(0, 8)}`;
};

export const getDeviceId = (): string => {
  if (!cachedDeviceId) cachedDeviceId = persistentDeviceId();
  return cachedDeviceId;
};
