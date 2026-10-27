import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useEconomyStore } from '../store/useEconomyStore';
import { useVisionStore } from '../store/useVisionStore';
import { useConfigStore } from '../store/useConfigStore';
import { useReflectionStore } from '../store/useReflectionStore';
import { useNoteStore } from '../store/useNoteStore';
import { useFeedStore } from '../store/useFeedStore';
import { useScoreStore } from '../store/useScoreStore';
import { buildSnapshot, pickDomain, DOMAINS, type Domain, type Snapshot } from './snapshot';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const BACKUP_VERSION = 2;

export const createBackupBlob = (): Blob => {
  const backup = { app: 'lida', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: buildSnapshot() };
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
};

// Formato antigo (v1): cada store era a string crua do localStorage, que podia
// estar em JSON puro ou ofuscada (Base64 de encodeURIComponent).
const parseLegacyEntry = (raw: unknown): any => {
  if (!raw || typeof raw !== 'string') return null;
  let text = raw;
  try { JSON.parse(text); } catch { text = decodeURIComponent(atob(raw)); }
  const parsed = JSON.parse(text);
  return parsed?.state ?? parsed;
};

const LEGACY_KEYS: Record<Domain, string> = {
  tasks: 'tasks', habits: 'habits', economy: 'economy', vision: 'vision', reflections: 'reflections',
  notes: 'notes', feeds: 'feeds', scores: 'scores', config: 'config',
};

export const parseBackup = (text: string): Partial<Snapshot> => {
  const json = JSON.parse(text);
  const out: Partial<Snapshot> = {};
  if (json?.app === 'lida' && json?.data) {
    for (const d of DOMAINS) if (json.data[d]) out[d] = pickDomain(d, json.data[d]);
  } else {
    for (const d of DOMAINS) {
      const state = parseLegacyEntry(json[LEGACY_KEYS[d]]);
      if (state) out[d] = pickDomain(d, state);
    }
  }
  if (Object.keys(out).length === 0) throw new Error('Backup vazio ou em formato desconhecido');
  return out;
};

// Restaura o backup substituindo os dados locais deste aparelho.
// Itens restaurados que tinham sido apagados ganham updatedAt novo: assim a
// lápide (mais antiga) deixa de valer em todos os aparelhos.
const reviveDeleted = (value: any, tombstones: Record<string, number>, now: number): any => {
  if (Array.isArray(value)) return value.map(v => reviveDeleted(v, tombstones, now));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveDeleted(v, tombstones, now);
    if (typeof out.id === 'string' && tombstones[out.id]) out.updatedAt = Math.max(now, tombstones[out.id] + 1);
    return out;
  }
  return value;
};

export const restoreBackup = (input: Partial<Snapshot>) => {
  const now = Date.now();
  const tombstones = { ...(useConfigStore.getState().tombstones || {}), ...(input.config?.tombstones || {}) };
  const snap: Partial<Snapshot> = {};
  for (const d of DOMAINS) if (input[d]) snap[d] = d === 'config' ? input[d] : reviveDeleted(input[d], tombstones, now);
  if (snap.tasks) useTaskStore.setState(snap.tasks);
  if (snap.habits) useHabitStore.setState(snap.habits);
  if (snap.economy) useEconomyStore.setState({ ...snap.economy, updatedAt: now });
  if (snap.vision) useVisionStore.setState({ vision: snap.vision.vision ?? null, updatedAt: now });
  if (snap.reflections) useReflectionStore.setState(snap.reflections);
  if (snap.notes) useNoteStore.setState(snap.notes);
  if (snap.feeds) useFeedStore.setState(snap.feeds);
  if (snap.scores) useScoreStore.setState(snap.scores);

  // uid, chave do cofre e modo local não fazem parte do snapshot: ficam os atuais.
  // As lápides continuam (são mescladas entre aparelhos); os itens restaurados
  // vencem por terem updatedAt mais novo.
  const importedConfig = { ...(snap.config || {}) };
  delete importedConfig.tombstones;
  useConfigStore.setState({ ...importedConfig, tombstones });
};
