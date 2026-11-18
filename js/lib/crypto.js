// Criptografia do espaço.
// - Uma chave de dados AES-256-GCM aleatória cifra todos os registros.
// - Essa chave é "embrulhada" por outra, derivada da senha do espaço (PBKDF2-SHA256).
// - No dispositivo, a chave é importada como NÃO-EXTRAÍVEL: o código não consegue ler os bytes dela,
//   nem pelo console. O CryptoKey fica guardado no IndexedDB apenas como referência opaca.
// - Cada registro usa o próprio id, versão e marca de exclusão como dados autenticados (AAD):
//   qualquer alteração manual no IndexedDB faz a decifragem falhar e o registro é rejeitado.

const te = new TextEncoder();
const td = new TextDecoder();
const ITER = 600000;

export const rand = (n) => crypto.getRandomValues(new Uint8Array(n));

async function deriveKEK(pass, salt, iter = ITER) {
  const base = await crypto.subtle.importKey('raw', te.encode(pass.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

const importDataKey = (raw) => crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

async function wrapRaw(pass, raw) {
  const salt = rand(16);
  const iv = rand(12);
  const kek = await deriveKEK(pass, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, raw));
  return { v: 1, iter: ITER, salt, iv, ct };
}

async function unwrapRaw(pass, wrap) {
  const kek = await deriveKEK(pass, wrap.salt, wrap.iter || ITER);
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: wrap.iv }, kek, wrap.ct));
  } catch {
    const e = new Error('Senha incorreta.');
    e.code = 'bad-pass';
    throw e;
  }
}

export async function createKey(pass) {
  const raw = rand(32);
  const wrap = await wrapRaw(pass, raw);
  const key = await importDataKey(raw);
  raw.fill(0);
  return { key, wrap };
}

export async function unlockKey(pass, wrap) {
  const raw = await unwrapRaw(pass, wrap);
  const key = await importDataKey(raw);
  raw.fill(0);
  return key;
}

export async function changePass(oldPass, newPass, wrap) {
  const raw = await unwrapRaw(oldPass, wrap);
  const next = await wrapRaw(newPass, raw);
  raw.fill(0);
  return next;
}

/* ---------- Chave de recuperação ---------- */
// Um código aleatório (120 bits, 24 letras e números em blocos de 4) que embrulha a mesma chave de dados,
// como uma segunda senha. Serve para criar uma senha nova quando a pessoa esquece a dela.
// Alfabeto sem letras parecidas (Crockford): na hora de digitar, O vira 0 e I/L viram 1.
const RC_ABC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function newRecoveryCode() {
  const b = rand(24);
  const s = Array.from(b, (x) => RC_ABC[x & 31]).join('');
  return s.match(/.{4}/g).join('-');
}
export const normCode = (c) =>
  String(c || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
export const validCode = (c) => /^[0-9A-HJKMNP-TV-Z]{24}$/.test(normCode(c));

// Conta nova: senha + código de recuperação embrulhando a mesma chave.
export async function createKeyWithRecovery(pass) {
  const raw = rand(32);
  const code = newRecoveryCode();
  const wrap = await wrapRaw(pass, raw);
  const rwrap = await wrapRaw(normCode(code), raw);
  const key = await importDataKey(raw);
  raw.fill(0);
  return { key, wrap, rwrap, code };
}
// Conta que já existe: com a senha atual, cria (ou troca) o código de recuperação.
export async function addRecovery(pass, wrap) {
  const raw = await unwrapRaw(pass, wrap);
  const code = newRecoveryCode();
  const rwrap = await wrapRaw(normCode(code), raw);
  raw.fill(0);
  return { rwrap, code };
}
// Esqueceu a senha: o código abre a chave e uma senha nova passa a embrulhá-la. O código continua valendo.
export async function recoverWithCode(code, rwrap, newPass) {
  let raw;
  try {
    raw = await unwrapRaw(normCode(code), rwrap);
  } catch {
    const e = new Error('Código de recuperação incorreto.');
    e.code = 'bad-code';
    throw e;
  }
  const wrap = await wrapRaw(newPass, raw);
  const key = await importDataKey(raw);
  raw.fill(0);
  return { key, wrap };
}

async function pipe(bytes, stream) {
  const s = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(s).arrayBuffer());
}

export async function seal(key, obj, aad, compress = false) {
  let body = te.encode(JSON.stringify(obj));
  let flag = 0;
  if (compress && typeof CompressionStream !== 'undefined') {
    body = await pipe(body, new CompressionStream('gzip'));
    flag = 1;
  }
  const plain = new Uint8Array(body.length + 1);
  plain[0] = flag;
  plain.set(body, 1);
  const iv = rand(12);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: te.encode(aad) }, key, plain),
  );
  return { iv, ct };
}

export async function unseal(key, iv, ct, aad) {
  const plain = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: te.encode(aad) }, key, ct),
  );
  let body = plain.subarray(1);
  if (plain[0] === 1) body = await pipe(body, new DecompressionStream('gzip'));
  return JSON.parse(td.decode(body));
}

// Serialização da "embalagem" da chave para JSON/Firestore.
export const b64 = (u8) => btoa(String.fromCharCode(...u8));
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// base64 em blocos (arquivos grandes estouram o limite de argumentos do String.fromCharCode).
export const b64big = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};

// Arquivo cifrado com uma senha (backup .lida): chave aleatória embrulhada pela senha, conteúdo
// comprimido e cifrado com AES-GCM. Sem a senha, o arquivo é ilegível.
export async function sealWithPassword(pass, obj) {
  const raw = rand(32);
  const wrap = await wrapRaw(pass, raw);
  const key = await importDataKey(raw);
  raw.fill(0);
  const { iv, ct } = await seal(key, obj, 'lida-backup', true);
  return { wrap: { v: wrap.v, iter: wrap.iter, salt: b64(wrap.salt), iv: b64(wrap.iv), ct: b64(wrap.ct) }, iv: b64(iv), ct: b64big(ct) };
}
export async function openWithPassword(pass, pkg) {
  const w = pkg.wrap;
  const raw = await unwrapRaw(pass, { v: w.v, iter: w.iter, salt: unb64(w.salt), iv: unb64(w.iv), ct: unb64(w.ct) });
  const key = await importDataKey(raw);
  raw.fill(0);
  return unseal(key, unb64(pkg.iv), unb64(pkg.ct), 'lida-backup');
}
