import { idbGet, idbSet, idbDel, isIdbAvailable } from './idb';

// === CRIPTOGRAFIA DO COFRE (v2) ===
// Chave Mestra -> PBKDF2-SHA256 (600 mil iterações, sal aleatório por usuário)
// -> chave AES-GCM 256 bits. Cada gravação usa um IV aleatório e é autenticada:
// um dado adulterado ou uma chave errada falham na descriptografia.
//
// A Chave Mestra em si nunca é guardada. Neste aparelho fica apenas a chave
// derivada, como CryptoKey não-exportável no IndexedDB: o código da página
// consegue usá-la, mas não consegue lê-la.

export const KDF_ITERATIONS = 600_000;
const KEY_CHECK_PLAINTEXT = 'lida-vault-v2';

export interface KdfParams {
  name: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  salt: string; // base64
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

export const base64ToBytes = (b64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const newKdfParams = (): KdfParams => ({
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: KDF_ITERATIONS,
  salt: bytesToBase64(crypto.getRandomValues(new Uint8Array(16))),
});

export const MIN_KDF_ITERATIONS = 100_000;
export const isValidKdf = (p: unknown): p is KdfParams => {
  const k = p as KdfParams;
  return !!k && k.name === 'PBKDF2' && k.hash === 'SHA-256' && typeof k.salt === 'string' && k.salt.length >= 16 && Number(k.iterations) >= MIN_KDF_ITERATIONS;
};

export const deriveVaultKey = async (pin: string, params: KdfParams): Promise<CryptoKey> => {
  if (!isValidKdf(params)) throw new Error('Parâmetros de chave do cofre inválidos.');
  const material = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: params.hash, iterations: params.iterations, salt: base64ToBytes(params.salt) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// "context" (dados associados) amarra o texto cifrado ao lugar onde ele foi gravado
// (cofre + nome do pedaço): um pedaço copiado para outro lugar não abre.
export const encryptText = async (key: CryptoKey, text: string, context = ''): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(context) }, key, enc.encode(text)));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv, 0);
  out.set(cipher, iv.length);
  return bytesToBase64(out);
};

export const decryptText = async (key: CryptoKey, b64: string, context = ''): Promise<string> => {
  const data = base64ToBytes(b64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(0, 12), additionalData: enc.encode(context) }, key, data.subarray(12));
  return dec.decode(plain);
};

export const createKeyCheck = (key: CryptoKey) => encryptText(key, KEY_CHECK_PLAINTEXT, 'key-check');

export const verifyKeyCheck = async (key: CryptoKey, keyCheck: string): Promise<boolean> => {
  try { return (await decryptText(key, keyCheck, 'key-check')) === KEY_CHECK_PLAINTEXT; } catch { return false; }
};

// === CHAVE EM MEMÓRIA + PERSISTÊNCIA LOCAL ===
// vaultId identifica o cofre (é o sal da chave). Se o cofre na nuvem for apagado e
// recriado, o id muda e este aparelho para de gravar com a chave antiga.
interface StoredKey { uid: string; key: CryptoKey; vaultId: string }
let memoryKey: StoredKey | null = null;

export const getVaultKey = (uid: string): CryptoKey | null => (memoryKey && memoryKey.uid === uid ? memoryKey.key : null);
export const getVaultId = (uid: string): string | null => (memoryKey && memoryKey.uid === uid ? memoryKey.vaultId : null);

export const storeVaultKey = async (uid: string, key: CryptoKey, vaultId: string) => {
  memoryKey = { uid, key, vaultId };
  if (isIdbAvailable()) {
    try { await idbSet('vault', memoryKey, 'keys'); } catch (e) { console.warn('Não foi possível guardar a chave do cofre neste aparelho.', e); }
  }
};

export const loadVaultKey = async (uid: string): Promise<CryptoKey | null> => {
  if (memoryKey?.uid === uid) return memoryKey.key;
  if (!isIdbAvailable()) return null;
  try {
    const saved = await idbGet<StoredKey>('vault', 'keys');
    if (saved && saved.uid === uid && saved.key && saved.vaultId) { memoryKey = saved; return saved.key; }
  } catch { /* ignore */ }
  return null;
};

export const forgetVaultKey = async () => {
  memoryKey = null;
  if (isIdbAvailable()) { try { await idbDel('vault', 'keys'); } catch { /* ignore */ } }
};
