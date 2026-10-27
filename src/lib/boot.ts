import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useEconomyStore, applyRemoteEconomy } from '../store/useEconomyStore';
import { useVisionStore } from '../store/useVisionStore';
import { useConfigStore } from '../store/useConfigStore';
import { useReflectionStore } from '../store/useReflectionStore';
import { useNoteStore } from '../store/useNoteStore';
import { useFeedStore } from '../store/useFeedStore';
import { useScoreStore } from '../store/useScoreStore';
import { extractCounters, newLedger, initDeviceId } from './economyLedger';
import { isApplyingCloud } from './cloudSync';
import { DOMAIN_FIELDS } from './snapshot';

// Campos de preferência sincronizados cuja alteração local carimba configUpdatedAt.
const STAMPED_CONFIG_FIELDS = DOMAIN_FIELDS.config.filter(f => !['tombstones', 'lastLoginDate', 'configUpdatedAt'].includes(f));
const watchConfigChanges = () => {
  useConfigStore.subscribe((next, prev) => {
    if (isApplyingCloud()) return;
    const n = next as unknown as Record<string, unknown>, p = prev as unknown as Record<string, unknown>;
    if (STAMPED_CONFIG_FIELDS.some(f => JSON.stringify(n[f]) !== JSON.stringify(p[f]))) {
      useConfigStore.setState({ configUpdatedAt: Date.now() });
    }
  });
};

// Com IndexedDB a leitura do estado salvo é assíncrona: nada pode renderizar
// (nem processar a virada do dia, nem sincronizar) antes de todas as stores
// terminarem de carregar, senão o app trabalharia com o estado vazio.
const PERSISTED_STORES = [
  useTaskStore, useHabitStore, useEconomyStore, useVisionStore, useConfigStore,
  useReflectionStore, useNoteStore, useFeedStore, useScoreStore,
];

const waitHydration = (store: { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } }) =>
  new Promise<void>((resolve) => {
    if (store.persist.hasHydrated()) return resolve();
    const unsub = store.persist.onFinishHydration(() => { unsub(); resolve(); });
  });

export const bootApp = async () => {
  await initDeviceId();
  // Sem teto de tempo de propósito: abrir o app antes de carregar faria ele
  // trabalhar (e gravar) sobre um estado vazio. main.tsx mostra um aviso se demorar.
  await Promise.all(PERSISTED_STORES.map(s => waitHydration(s as never)));

  // Economia: garante que exista o registro (base = saldo atual deste aparelho).
  const econ = useEconomyStore.getState();
  if (!econ.ledger) applyRemoteEconomy(() => useEconomyStore.setState({ ledger: newLedger(extractCounters(econ)) }));

  // Limpeza de lápides antigas (> 180 dias).
  useConfigStore.getState().purgeOldTombstones();

  watchConfigChanges();
};
