// Estado de sessão compartilhado entre as telas.
import { createStore } from './core/store.js';
import { buildPersonal, buildShared, SHARED_WATCH } from './core/model.js';

export const personal = createStore({ name: 'pessoal' });
export const shared = createStore({ name: 'compartilhado', watch: SHARED_WATCH });

export const app = {
  version: '3.0.0-alfa.3',
  demo: false, // modo demo: banco separado, sem nuvem, relógio ajustável
  mode: 'local', // 'local' | 'cloud'
  me: 'local',
  user: null, // conta Google (nome, e-mail, foto)
  idb: null,
  sid: null, // espaço pessoal
  wrap: null,
  key: null,
  sync: null, // motor de sincronização do espaço pessoal (só no modo nuvem)
  nav: () => {},
  refresh: () => {},
  actions: {},
};

// Fotografias prontas para as telas (refeitas só quando algo muda).
export const P = () => personal.snapshot(buildPersonal);
export const SH = () => (shared.ready() ? shared.snapshot(buildShared) : null);

// Preferências deste aparelho (não sincronizadas).
const PK = 'lida.prefs';
const DEF = { showDone: true, sortToday: 'prioridade', confirmDelete: true };
export function prefs() {
  try {
    return { ...DEF, ...JSON.parse(localStorage.getItem(PK) || '{}') };
  } catch {
    return { ...DEF };
  }
}
export function setPref(k, v) {
  const p = prefs();
  p[k] = v;
  try {
    localStorage.setItem(PK, JSON.stringify(p));
  } catch {
    /* sem armazenamento */
  }
}

// Nome para exibir: o que a pessoa escolheu, senão o primeiro nome da conta Google.
export function displayName() {
  const S = P();
  return (S.prefs.name || app.user?.displayName?.split(' ')[0] || '').trim();
}
