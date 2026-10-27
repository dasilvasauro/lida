import { create } from 'zustand';

// Estado efêmero (não persistido) do motor de sincronização.
interface SyncStatusState {
  initialSyncDone: boolean;
  lastError: string | null;
  lastWarning: string | null;
  lastPayloadBytes: number;
}

export const useSyncStatus = create<SyncStatusState>()(() => ({
  initialSyncDone: false,
  lastError: null,
  lastWarning: null,
  lastPayloadBytes: 0,
}));

export const FIRESTORE_DOC_LIMIT = 1_048_576;
export const PAYLOAD_WARNING_BYTES = 900_000;
