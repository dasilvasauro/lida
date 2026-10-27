import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import { idbGet, idbSet, idbDel, isIdbAvailable } from './idb';

// Lê valores antigos do localStorage: alguns em JSON puro, outros ofuscados
// (Base64 de encodeURIComponent), como as versões anteriores gravavam.
export const readLegacyLocalStorage = (name: string): string | null => {
  let raw: string | null = null;
  try { raw = localStorage.getItem(name); } catch { return null; }
  if (!raw) return null;
  try { JSON.parse(raw); return raw; } catch { /* ofuscado */ }
  try { return decodeURIComponent(atob(raw)); } catch { return null; }
};

const removeLegacy = (name: string) => { try { localStorage.removeItem(name); localStorage.removeItem(fallbackFlag(name)); } catch { /* ignore */ } };

// Marca que a última gravação foi para o localStorage (IndexedDB falhou): nesse
// caso a cópia do localStorage é a mais nova e deve ser lida primeiro.
const fallbackFlag = (name: string) => `${name}__fallback`;
const hasFallback = (name: string) => { try { return localStorage.getItem(fallbackFlag(name)) !== null; } catch { return false; } };

// Storage do zustand sobre IndexedDB. Na primeira leitura de cada store, se o
// IndexedDB ainda estiver vazio, migra o valor do localStorage; a cópia antiga só
// é apagada depois que a gravação no IndexedDB deu certo.
// Um valor salvo que não é JSON válido travaria o carregamento do app inteiro.
// Ele é guardado à parte (para recuperação manual) e ignorado.
const isValidJson = (v: string) => { try { JSON.parse(v); return true; } catch { return false; } };
const quarantine = async (name: string, raw: string) => {
  console.error(`Dados locais corrompidos em "${name}"; guardados como ${name}__corrupt.`);
  try { await idbSet(`${name}__corrupt`, raw); } catch { /* ignore */ }
};
const firstValid = async (name: string, candidates: (string | null | undefined)[]) => {
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    if (isValidJson(c)) return c;
    await quarantine(name, c);
  }
  return null;
};

const idbStateStorage: StateStorage = {
  getItem: async (name) => {
    let fromIdb: string | undefined;
    try { fromIdb = await idbGet<string>(name); }
    catch (e) { console.warn('IndexedDB indisponível, usando localStorage.', e); }
    const legacy = readLegacyLocalStorage(name);
    return hasFallback(name) ? firstValid(name, [legacy, fromIdb]) : firstValid(name, [fromIdb, legacy]);
  },
  setItem: async (name, value) => {
    try {
      await idbSet(name, value);
      removeLegacy(name);
    } catch (e) {
      console.warn('Falha ao gravar no IndexedDB, usando localStorage.', e);
      try { localStorage.setItem(name, value); localStorage.setItem(fallbackFlag(name), String(Date.now())); } catch { /* sem espaço */ }
    }
  },
  removeItem: async (name) => {
    try { await idbDel(name); } catch { /* ignore */ }
    removeLegacy(name);
  },
};

// Fallback (ex.: navegador sem IndexedDB): localStorage puro, sem ofuscação.
const localStateStorage: StateStorage = {
  getItem: (name) => { const v = readLegacyLocalStorage(name); return v !== null && isValidJson(v) ? v : null; },
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

export const appStorage = createJSONStorage(() => (isIdbAvailable() ? idbStateStorage : localStateStorage));
