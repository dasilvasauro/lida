import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useEconomyStore } from '../store/useEconomyStore';
import { useVisionStore } from '../store/useVisionStore';
import { useConfigStore } from '../store/useConfigStore';
import { useReflectionStore } from '../store/useReflectionStore';
import { useNoteStore } from '../store/useNoteStore';
import { useFeedStore } from '../store/useFeedStore';
import { useScoreStore } from '../store/useScoreStore';

// === SNAPSHOT DE DADOS (sem estado de UI, sem funções) ===
// Fonte única para: sincronização na nuvem, fingerprint de mudanças e backup.

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Domain = 'tasks' | 'habits' | 'economy' | 'vision' | 'reflections' | 'notes' | 'feeds' | 'scores' | 'config';
export type Snapshot = Record<Domain, Record<string, any>>;

export const DOMAIN_FIELDS: Record<Domain, string[]> = {
  tasks: ['tasks', 'folders', 'routines', 'brainDump', 'moodHistory'],
  habits: ['habits', 'logs', 'logTimes', 'modifiers', 'quitterItems'],
  economy: ['xp', 'level', 'gold', 'vouchers', 'voucherProgress', 'inventory', 'activeXpBoostUntil', 'activeGoldBoostUntil', 'dailyHistory', 'claimedMilestones', 'purchasedThemes', 'updatedAt'],
  vision: ['vision', 'updatedAt'],
  reflections: ['reflections'],
  notes: ['notebooks', 'notes', 'shortcutCategories'],
  feeds: ['channels', 'feeds', 'entries'],
  scores: ['dailyScores', 'monthlyArchives', 'isInitialSetupDone'],
  config: ['theme', 'font', 'userClass', 'userName', 'isOnboarded', 'lastLoginDate', 'defaultDaysOff', 'hasDismissedDayOffWarning', 'enablePunishments', 'enableEditWindow', 'configUpdatedAt', 'tombstones'],
};

export const DOMAINS = Object.keys(DOMAIN_FIELDS) as Domain[];

export const pickDomain = (domain: Domain, source: any): Record<string, any> => {
  const out: Record<string, any> = {};
  if (!source) return out;
  for (const key of DOMAIN_FIELDS[domain]) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
};

const STORE_GETTERS: Record<Domain, () => any> = {
  tasks: () => useTaskStore.getState(),
  habits: () => useHabitStore.getState(),
  economy: () => useEconomyStore.getState(),
  vision: () => useVisionStore.getState(),
  reflections: () => useReflectionStore.getState(),
  notes: () => useNoteStore.getState(),
  feeds: () => useFeedStore.getState(),
  scores: () => useScoreStore.getState(),
  config: () => useConfigStore.getState(),
};

export const buildSnapshot = (): Snapshot => {
  const snap = {} as Snapshot;
  for (const d of DOMAINS) snap[d] = pickDomain(d, STORE_GETTERS[d]());
  return snap;
};

// === FINGERPRINT ESTÁVEL ===
// Ordem de chaves e ordem de entidades (arrays de objetos com id) não importam:
// dois dispositivos com os mesmos dados geram o mesmo fingerprint.
const canonical = (value: any): any => {
  if (Array.isArray(value)) {
    const mapped = value.map(canonical);
    const isEntityList = mapped.length > 0 && mapped.every(v => v && typeof v === 'object' && !Array.isArray(v) && typeof v.id === 'string');
    return isEntityList ? [...mapped].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) : mapped;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) out[key] = canonical(value[key]);
    }
    return out;
  }
  return value;
};

export const fingerprint = (data: any): string => JSON.stringify(canonical(data));

export const snapshotFingerprint = (snap: Snapshot): string => DOMAINS.map(d => fingerprint(snap[d] || {})).join('|');

// Hash rápido (cyrb53, 53 bits) do fingerprint: guardado localmente para saber
// se um pedaço do cofre mudou sem guardar uma cópia inteira dele.
export const hashString = (str: string, seed = 0): string => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + ':' + str.length.toString(36);
};

export const contentHash = (data: unknown): string => hashString(fingerprint(data));
