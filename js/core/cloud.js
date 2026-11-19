// Firebase: login, perfil, espaços e acesso ao cofre antigo (para importar).
//
// Modelo no Firestore:
//   profiles/{uid}                    { personal, shared }  quais espaços abrir ao entrar
//   spaces/{sid}                      dono, tipo (pessoal/compartilhado), nome, código de convite,
//                                     chave do espaço embrulhada pela senha
//   spaces/{sid}/members/{uid}        quem participa + último momento em que sincronizou
//   spaces/{sid}/records/{id}         { u, by, del, b, iv, ct, ts }  (conteúdo sempre cifrado)
//   users/{uid}/vault/*               cofre da versão anterior do Lida (só leitura, para importar)
//
// O SDK do Firebase é carregado sob demanda: sem conta conectada, o app nunca baixa nada da rede.
//
// No app Android, o Google não permite login dentro de WebView. O login é feito pelo seletor de
// contas nativo do Android (plugin @capacitor-firebase/authentication, só a parte do Google) e a
// credencial devolvida entra no mesmo SDK web do Firebase, que cuida do resto (Firestore, sessão).
import { isNative, plugin, hasPlugin } from '../native.js';
import { isDesktop, googleIdToken, googleCalToken, googleCalForget } from '../desktop.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';

let fb = null;
let cloudConfig = null;
let configError = '';

export async function loadConfig() {
  try {
    const m = await import('../firebase-config.js');
    cloudConfig = m.cloudConfig || m.default || null;
    if (!cloudConfig) configError = 'O arquivo js/firebase-config.js precisa exportar "cloudConfig".';
  } catch (e) {
    configError = `O arquivo js/firebase-config.js tem um erro: ${e?.message || e}`;
  }
}
export const getConfigError = () => configError;
export const cloudConfigured = () => !!(cloudConfig && cloudConfig.apiKey && !/^COLE/.test(cloudConfig.apiKey));

export async function loadFirebase() {
  if (fb) return fb;
  const [appM, A, F] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`)]);
  const app = appM.initializeApp(cloudConfig);
  // No APK, sem o iframe de popup/redirect (não funciona em WebView); a sessão fica no IndexedDB.
  const auth = isNative() ? A.initializeAuth(app, { persistence: A.indexedDBLocalPersistence }) : A.getAuth(app);
  const db = F.getFirestore(app);
  fb = { app, auth, db, A, F };
  return fb;
}
export const firebase = () => fb;

export const B = (u8) => fb.F.Bytes.fromUint8Array(u8);
export const U = (b) => b.toUint8Array();
const wrapOut = (w) => ({ v: w.v, iter: w.iter, salt: B(w.salt), iv: B(w.iv), ct: B(w.ct) });
const wrapIn = (w) => ({ v: w.v, iter: w.iter, salt: U(w.salt), iv: U(w.iv), ct: U(w.ct) });
const code = () => [...crypto.getRandomValues(new Uint8Array(9))].map((x) => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');

/* ---------- Autenticação ---------- */
// O APK tem o login nativo do Google? (o plugin só entra no APK quando o Firebase está configurado)
export const nativeGoogle = () => hasPlugin('FirebaseAuthentication');
// Dá para entrar com Google neste aparelho?
export const googleAvailable = () => cloudConfigured() && (!isNative() || nativeGoogle());
// No app Linux, o login abre o navegador do sistema (ver desktop/lida_desktop/oauth.py).

export async function currentUser() {
  const { auth, A } = await loadFirebase();
  if (!isNative() && !isDesktop()) {
    try {
      await A.getRedirectResult(auth);
    } catch {
      /* sem redirect pendente */
    }
  }
  await auth.authStateReady();
  return auth.currentUser;
}

export async function signIn() {
  const { auth, A } = await loadFirebase();
  if (isNative()) {
    if (!nativeGoogle()) throw Object.assign(new Error('O login com Google não está disponível nesta versão do app.'), { code: 'auth/native-missing' });
    let r;
    try {
      r = await plugin('FirebaseAuthentication').signInWithGoogle({ useCredentialManager: true });
    } catch (e) {
      const msg = String(e?.message || e);
      if (/cancel/i.test(msg)) throw Object.assign(new Error(''), { code: 'auth/popup-closed-by-user' });
      throw Object.assign(new Error(`O Google recusou o login: ${msg}`), { code: 'auth/native-failed' });
    }
    const idToken = r?.credential?.idToken;
    if (!idToken) throw Object.assign(new Error('O Google não devolveu a credencial.'), { code: 'auth/no-token' });
    return (await A.signInWithCredential(auth, A.GoogleAuthProvider.credential(idToken))).user;
  }
  if (isDesktop()) {
    let idToken;
    try {
      idToken = await googleIdToken();
    } catch (e) {
      const msg = String(e?.message || e);
      if (/cancel/i.test(msg)) throw Object.assign(new Error(''), { code: 'auth/popup-closed-by-user' });
      throw Object.assign(new Error(msg), { code: 'auth/desktop-failed' });
    }
    return (await A.signInWithCredential(auth, A.GoogleAuthProvider.credential(idToken))).user;
  }
  const provider = new A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    return (await A.signInWithPopup(auth, provider)).user;
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await A.signInWithRedirect(auth, provider);
      return null;
    }
    throw e;
  }
}

/* ---------- Google Agenda (só leitura) ---------- */
// Token de acesso para a API da Google Agenda. Fica na memória (e, na web, na sessão da aba); vale
// cerca de uma hora. interactive: pode abrir o seletor de conta / a tela de permissão do Google.
// Precisa da Calendar API ligada no projeto do Firebase (veja o README, "Sua parte").
export const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
let calTok = null;
const CK = 'lida.gcal';
function keepCal(token, secs = 3300) {
  calTok = { token, exp: Date.now() + secs * 1000 };
  try {
    sessionStorage.setItem(CK, JSON.stringify(calTok));
  } catch {
    /* sem armazenamento */
  }
  return token;
}
export function dropCalendarToken({ forget = false } = {}) {
  calTok = null;
  try {
    sessionStorage.removeItem(CK);
  } catch {
    /* sem armazenamento */
  }
  if (forget && isDesktop()) googleCalForget();
}
export async function googleCalendarToken({ interactive = false } = {}) {
  if (calTok && calTok.exp > Date.now() + 60000) return calTok.token;
  try {
    const s = JSON.parse(sessionStorage.getItem(CK) || 'null');
    if (s && s.exp > Date.now() + 60000) return (calTok = s).token;
  } catch {
    /* sem armazenamento */
  }
  if (isDesktop()) {
    const r = await googleCalToken(interactive);
    return r ? keepCal(r.token, r.expiresIn - 60) : null;
  }
  if (!interactive) return null;
  if (isNative()) {
    if (!nativeGoogle()) throw new Error('O login com Google não está disponível nesta versão do app.');
    let r;
    try {
      r = await plugin('FirebaseAuthentication').signInWithGoogle({ scopes: [CAL_SCOPE], useCredentialManager: false });
    } catch (e) {
      if (/cancel/i.test(String(e?.message || e))) return null;
      throw new Error(`O Google recusou: ${e?.message || e}`);
    }
    const at = r?.credential?.accessToken;
    if (!at) throw new Error('O Google não devolveu a permissão da agenda.');
    return keepCal(at);
  }
  if (!cloudConfigured()) throw new Error('O login com Google não está configurado nesta versão do Lida.');
  const { auth, A } = await loadFirebase();
  const provider = new A.GoogleAuthProvider();
  provider.addScope(CAL_SCOPE);
  const u = auth.currentUser;
  provider.setCustomParameters(u?.email ? { login_hint: u.email } : { prompt: 'select_account' });
  let res;
  try {
    if (u) res = await A.reauthenticateWithPopup(u, provider);
    else {
      // sem conta Google no Lida (só no aparelho / nuvem própria): só queremos a permissão da agenda
      res = await A.signInWithPopup(auth, provider);
      await A.signOut(auth).catch(() => {});
    }
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return null;
    if (e.code === 'auth/user-mismatch') throw new Error('Escolha a mesma conta Google que você usa no Lida.');
    throw e;
  }
  const at = A.GoogleAuthProvider.credentialFromResult(res)?.accessToken;
  if (!at) throw new Error('O Google não devolveu a permissão da agenda.');
  return keepCal(at);
}

export async function signOut() {
  if (nativeGoogle()) await plugin('FirebaseAuthentication').signOut().catch(() => {});
  if (!fb) return;
  await fb.A.signOut(fb.auth);
}

/* ---------- Perfil: quais espaços abrir ---------- */
export async function getProfile(uid) {
  const { db, F } = await loadFirebase();
  const s = await F.getDoc(F.doc(db, 'profiles', uid));
  return s.exists() ? { personal: s.data().personal || null, shared: s.data().shared || null } : null;
}
export async function setProfile(uid, fields) {
  const { db, F } = await loadFirebase();
  await F.setDoc(F.doc(db, 'profiles', uid), fields, { merge: true });
}

/* ---------- Espaços ---------- */
export async function getSpace(sid) {
  const { db, F } = await loadFirebase();
  const s = await F.getDoc(F.doc(db, 'spaces', sid));
  if (!s.exists()) return null;
  const d = s.data();
  return { sid, owner: d.owner, kind: d.kind, name: d.name || '', joinCode: d.joinCode || null, wrap: wrapIn(d.wrap), rwrap: d.rwrap ? wrapIn(d.rwrap) : null };
}

// Espaço pessoal: só o dono participa, não tem código de convite.
export async function createSpace(sid, wrap, uid, { kind = 'personal', name = '', rwrap = null } = {}) {
  const { db, F } = await loadFirebase();
  const joinCode = code();
  await F.setDoc(F.doc(db, 'spaces', sid), { owner: uid, kind, name, joinCode: kind === 'shared' ? joinCode : null, wrap: wrapOut(wrap), ...(rwrap ? { rwrap: wrapOut(rwrap) } : {}), createdAt: F.serverTimestamp() });
  await F.setDoc(F.doc(db, 'spaces', sid, 'members', uid), { code: kind === 'shared' ? joinCode : 'owner', joinedAt: F.serverTimestamp(), lastSync: F.serverTimestamp() });
  await setProfile(uid, { [kind]: sid });
  return { sid, joinCode: kind === 'shared' ? joinCode : null };
}

// Convite no formato "<sid>.<codigo>". A senha do espaço é combinada à parte, nunca vai no convite.
export async function joinSpace(invite, uid) {
  const { db, F } = await loadFirebase();
  const [sid, joinCode] = invite.trim().split('.');
  if (!sid || !joinCode) throw Object.assign(new Error('Convite inválido.'), { code: 'bad-invite' });
  try {
    await F.setDoc(F.doc(db, 'spaces', sid, 'members', uid), { code: joinCode, joinedAt: F.serverTimestamp(), lastSync: F.serverTimestamp() });
  } catch {
    throw Object.assign(new Error('Convite inválido ou expirado.'), { code: 'bad-invite' });
  }
  await setProfile(uid, { shared: sid });
  return getSpace(sid);
}

export async function rotateInvite(sid) {
  const { db, F } = await loadFirebase();
  const joinCode = code();
  await F.updateDoc(F.doc(db, 'spaces', sid), { joinCode });
  return joinCode;
}

export async function updateWrap(sid, wrap) {
  const { db, F } = await loadFirebase();
  await F.updateDoc(F.doc(db, 'spaces', sid), { wrap: wrapOut(wrap) });
}
// Chave de recuperação (a chave do espaço embrulhada pelo código de recuperação).
export async function updateRecovery(sid, rwrap) {
  const { db, F } = await loadFirebase();
  await F.updateDoc(F.doc(db, 'spaces', sid), { rwrap: wrapOut(rwrap) });
}

export async function renameSpace(sid, name) {
  const { db, F } = await loadFirebase();
  await F.updateDoc(F.doc(db, 'spaces', sid), { name });
}

export async function listMembers(sid) {
  const { db, F } = await loadFirebase();
  const s = await F.getDocs(F.collection(db, 'spaces', sid, 'members'));
  return s.docs.map((d) => ({ uid: d.id, joinedAt: d.data().joinedAt?.toMillis?.() || 0, lastSync: d.data().lastSync?.toMillis?.() || 0 }));
}

export async function removeMember(sid, uid) {
  const { db, F } = await loadFirebase();
  await F.deleteDoc(F.doc(db, 'spaces', sid, 'members', uid));
}

export async function leaveShared(sid, uid) {
  const { db, F } = await loadFirebase();
  await F.deleteDoc(F.doc(db, 'spaces', sid, 'members', uid));
  await setProfile(uid, { shared: null });
}

/* ---------- Cofre da versão anterior (somente leitura) ---------- */
export async function legacyVault(uid) {
  const { db, F } = await loadFirebase();
  const meta = await F.getDoc(F.doc(db, 'users', uid, 'vault', '_meta'));
  if (!meta.exists()) return null;
  const all = await F.getDocs(F.collection(db, 'users', uid, 'vault'));
  const shards = {};
  all.forEach((d) => {
    if (d.id !== '_meta') shards[d.id] = d.data();
  });
  return { meta: meta.data(), shards };
}
