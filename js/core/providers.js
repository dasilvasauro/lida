// As nuvens da própria pessoa, todas com a mesma cara para o motor de sincronização (filesync.js):
//   list(dir) → [{ name }]   get(path) → texto ou null   put(path, texto)   del(path)   account()
// Caminhos relativos à pasta do Lida: "space.json", "log/abc.00000001.00000001.json".
//
// - Dropbox: pasta do app (Aplicativos/Lida). Login no navegador; o Dropbox mostra um código que a
//   pessoa cola no Lida (funciona igual no Android, no Linux e na web, sem endereço de retorno).
// - OneDrive: pasta do app (Aplicativos/Lida), pela Microsoft Graph. Login por código de aparelho
//   (microsoft.com/devicelogin). Só no app Android e no Linux: a Microsoft não deixa uma página web
//   renovar o acesso de um app instalado.
// - WebDAV (Nextcloud, ownCloud, Synology, Koofr…): endereço da pasta, usuário e senha de app.
//
// Erros: code 'auth' (acesso expirou ou foi removido: conectar de novo), 'offline', 'error'.
import { http, form, NetError } from './net.js';
import { syncConfig } from '../sync-config.js';

const SCOPE_MS = 'Files.ReadWrite.AppFolder offline_access User.Read';
const MS_AUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const GRAPH = 'https://graph.microsoft.com/v1.0';
const DBX_API = 'https://api.dropboxapi.com';
const DBX_CONTENT = 'https://content.dropboxapi.com';

export const PROVIDERS = {
  dropbox: { name: 'Dropbox', icon: 'cloud', configured: () => !!syncConfig.dropboxAppKey },
  onedrive: { name: 'OneDrive', icon: 'cloud', configured: () => !!syncConfig.microsoftClientId },
  webdav: { name: 'Nextcloud / WebDAV', short: 'WebDAV', icon: 'cloud', configured: () => true },
};

const fail = (msg, code = 'error') => new NetError(msg, code);
const json = (t) => {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
};

/* ---------- PKCE ---------- */
const b64url = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  return { verifier, challenge };
}

// Token de acesso com renovação. creds: { access, exp, refresh }. save(creds) grava o que mudou.
function tokenKeeper(creds, save, refreshFn) {
  let job = null;
  return {
    async get(force = false) {
      if (!force && creds.access && Date.now() < (creds.exp || 0) - 120000) return creds.access;
      job ||= (async () => {
        const t = await refreshFn(creds.refresh);
        Object.assign(creds, { access: t.access_token, exp: Date.now() + (t.expires_in || 3600) * 1000, ...(t.refresh_token ? { refresh: t.refresh_token } : {}) });
        await save?.(creds);
        return creds.access;
      })().finally(() => (job = null));
      return job;
    },
  };
}
const authFail = (r) => {
  const x = json(r.text) || {};
  if (r.status === 400 || r.status === 401) {
    if (/invalid_grant|expired|revoked|invalid_client|unauthorized/i.test(`${x.error || ''} ${x.error_description || ''}`)) return fail('O acesso expirou ou foi removido. Conecte de novo em Ajustes.', 'auth');
  }
  return fail(`Falha no login (${r.status}).`, r.status >= 500 ? 'offline' : 'error');
};

/* ================= Dropbox ================= */
export async function dropboxStart() {
  const p = await pkce();
  const url = `https://www.dropbox.com/oauth2/authorize?${form({ client_id: syncConfig.dropboxAppKey, response_type: 'code', code_challenge: p.challenge, code_challenge_method: 'S256', token_access_type: 'offline' })}`;
  return { url, verifier: p.verifier };
}
export async function dropboxFinish(code, verifier) {
  const r = await http({ method: 'POST', url: `${DBX_API}/oauth2/token`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ code: code.trim(), grant_type: 'authorization_code', code_verifier: verifier, client_id: syncConfig.dropboxAppKey }) });
  const t = json(r.text);
  if (r.status !== 200 || !t?.refresh_token) throw fail(r.status === 400 ? 'Código inválido ou vencido. Gere outro no navegador.' : `O Dropbox recusou (${r.status}).`, 'error');
  return { kind: 'dropbox', access: t.access_token, exp: Date.now() + (t.expires_in || 14400) * 1000, refresh: t.refresh_token, account: '' };
}

function dropbox(creds, save) {
  const tok = tokenKeeper(creds, save, async (refresh) => {
    const r = await http({ method: 'POST', url: `${DBX_API}/oauth2/token`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ grant_type: 'refresh_token', refresh_token: refresh, client_id: syncConfig.dropboxAppKey }) });
    if (r.status !== 200) throw authFail(r);
    return json(r.text);
  });
  const p = (path) => `/${path}`.replace(/\/+/g, '/');
  // Dropbox-API-Arg só aceita ASCII: o resto vai como \uXXXX.
  const arg = (o) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  async function call(url, headers, body, retry = true) {
    const r = await http({ method: 'POST', url, headers: { Authorization: `Bearer ${await tok.get()}`, ...headers }, body });
    if (r.status === 401 && retry) {
      await tok.get(true);
      return call(url, headers, body, false);
    }
    if (r.status === 401) throw fail('O acesso ao Dropbox foi removido. Conecte de novo em Ajustes.', 'auth');
    if (r.status === 429 || r.status >= 500) throw fail(`Dropbox ocupado (${r.status}).`, 'offline');
    return r;
  }
  const notFound = (r) => r.status === 409 && /not_found/.test(r.text);
  return {
    kind: 'dropbox',
    async list(dir) {
      let r = await call(`${DBX_API}/2/files/list_folder`, { 'Content-Type': 'application/json' }, JSON.stringify({ path: p(dir), limit: 2000 }));
      if (notFound(r)) return [];
      const out = [];
      for (;;) {
        const x = json(r.text);
        if (r.status !== 200 || !x) throw fail(`Dropbox: não consegui listar (${r.status}).`);
        for (const e of x.entries || []) if (e['.tag'] === 'file') out.push({ name: e.name, size: e.size });
        if (!x.has_more) return out;
        r = await call(`${DBX_API}/2/files/list_folder/continue`, { 'Content-Type': 'application/json' }, JSON.stringify({ cursor: x.cursor }));
      }
    },
    async get(path) {
      const r = await call(`${DBX_CONTENT}/2/files/download`, { 'Dropbox-API-Arg': arg({ path: p(path) }) }, null);
      if (notFound(r)) return null;
      if (r.status !== 200) throw fail(`Dropbox: não consegui baixar (${r.status}).`);
      return r.text;
    },
    async put(path, text) {
      const r = await call(`${DBX_CONTENT}/2/files/upload`, { 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': arg({ path: p(path), mode: 'overwrite', mute: true }) }, text);
      if (r.status !== 200) throw fail(`Dropbox: não consegui enviar (${r.status}).`);
    },
    async del(path) {
      const r = await call(`${DBX_API}/2/files/delete_v2`, { 'Content-Type': 'application/json' }, JSON.stringify({ path: p(path) }));
      if (r.status !== 200 && !notFound(r)) throw fail(`Dropbox: não consegui apagar (${r.status}).`);
    },
    async account() {
      try {
        const r = await call(`${DBX_API}/2/users/get_current_account`, {}, null);
        const x = json(r.text);
        return x?.email || x?.name?.display_name || '';
      } catch {
        return '';
      }
    },
  };
}

/* ================= OneDrive (Microsoft Graph) ================= */
// Código de aparelho: devolve { userCode, url, poll() } — poll resolve com as credenciais.
export async function onedriveStart() {
  const r = await http({ method: 'POST', url: `${MS_AUTH}/devicecode`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ client_id: syncConfig.microsoftClientId, scope: SCOPE_MS }) });
  const x = json(r.text);
  if (r.status !== 200 || !x?.device_code) throw fail(x?.error_description?.split('\r\n')[0] || `A Microsoft recusou (${r.status}).`);
  let stop = false;
  const poll = async () => {
    let wait = (x.interval || 5) * 1000;
    const until = Date.now() + (x.expires_in || 900) * 1000;
    while (!stop && Date.now() < until) {
      await new Promise((ok) => setTimeout(ok, wait));
      if (stop) break;
      let t;
      try {
        t = await http({ method: 'POST', url: `${MS_AUTH}/token`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: syncConfig.microsoftClientId, device_code: x.device_code }) });
      } catch {
        continue; // rede oscilou: tenta de novo no próximo intervalo
      }
      const y = json(t.text) || {};
      if (t.status === 200 && y.access_token) return { kind: 'onedrive', access: y.access_token, exp: Date.now() + (y.expires_in || 3600) * 1000, refresh: y.refresh_token, account: '' };
      if (y.error === 'authorization_pending') continue;
      if (y.error === 'slow_down') {
        wait += 5000;
        continue;
      }
      if (y.error === 'authorization_declined') throw fail('Acesso recusado na Microsoft.');
      if (y.error === 'expired_token') break;
      throw fail(y.error_description?.split('\r\n')[0] || 'A Microsoft recusou o login.');
    }
    throw fail(stop ? 'Cancelado.' : 'O código venceu. Tente de novo.', 'cancel');
  };
  return { userCode: x.user_code, url: x.verification_uri || 'https://microsoft.com/devicelogin', poll, cancel: () => (stop = true) };
}

function onedrive(creds, save) {
  const tok = tokenKeeper(creds, save, async (refresh) => {
    const r = await http({ method: 'POST', url: `${MS_AUTH}/token`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form({ grant_type: 'refresh_token', refresh_token: refresh, client_id: syncConfig.microsoftClientId, scope: SCOPE_MS }) });
    if (r.status !== 200) throw authFail(r);
    return json(r.text);
  });
  const enc = (path) => path.split('/').map(encodeURIComponent).join('/');
  const item = (path) => `${GRAPH}/me/drive/special/approot:/${enc(path)}`;
  async function call(method, url, { headers = {}, body = null } = {}, retry = true) {
    const r = await http({ method, url, headers: { Authorization: `Bearer ${await tok.get()}`, ...headers }, body });
    if (r.status === 401 && retry) {
      await tok.get(true);
      return call(method, url, { headers, body }, false);
    }
    if (r.status === 401 || r.status === 403) throw fail('O acesso ao OneDrive foi removido. Conecte de novo em Ajustes.', 'auth');
    if (r.status === 429 || r.status >= 500) throw fail(`OneDrive ocupado (${r.status}).`, 'offline');
    return r;
  }
  return {
    kind: 'onedrive',
    async list(dir) {
      let url = `${item(dir)}:/children?$top=999&$select=name,size,file`;
      const out = [];
      while (url) {
        const r = await call('GET', url);
        if (r.status === 404) return out;
        const x = json(r.text);
        if (r.status !== 200 || !x) throw fail(`OneDrive: não consegui listar (${r.status}).`);
        for (const e of x.value || []) if (e.file) out.push({ name: e.name, size: e.size });
        url = x['@odata.nextLink'] || null;
      }
      return out;
    },
    async get(path) {
      const r = await call('GET', `${item(path)}:/content`);
      if (r.status === 404) return null;
      if (r.status !== 200) throw fail(`OneDrive: não consegui baixar (${r.status}).`);
      return r.text;
    },
    async put(path, text) {
      const r = await call('PUT', `${item(path)}:/content`, { headers: { 'Content-Type': 'application/json' }, body: text });
      if (r.status !== 200 && r.status !== 201) throw fail(`OneDrive: não consegui enviar (${r.status}).`);
    },
    async del(path) {
      const r = await call('DELETE', item(path));
      if (r.status !== 204 && r.status !== 404) throw fail(`OneDrive: não consegui apagar (${r.status}).`);
    },
    async account() {
      try {
        const r = await call('GET', `${GRAPH}/me?$select=mail,userPrincipalName,displayName`);
        const x = json(r.text);
        return x?.mail || x?.userPrincipalName || x?.displayName || '';
      } catch {
        return '';
      }
    },
  };
}

/* ================= WebDAV (Nextcloud e afins) ================= */
// creds: { kind: 'webdav', url: 'https://…/Lida/', user, pass }
export const webdavUrl = (u) => {
  let s = String(u || '').trim();
  if (!/^https:\/\//i.test(s)) throw fail('Use o endereço com https://', 'config');
  if (!s.endsWith('/')) s += '/';
  return s;
};
function webdav(creds) {
  const base = webdavUrl(creds.url);
  const auth = `Basic ${btoa(unescape(encodeURIComponent(`${creds.user}:${creds.pass}`)))}`;
  const url = (path) => base + path.split('/').map(encodeURIComponent).join('/');
  async function call(method, u, { headers = {}, body = null } = {}) {
    const r = await http({ method, url: u, headers: { Authorization: auth, ...headers }, body });
    if (r.status === 401 || r.status === 403) throw fail('O servidor recusou o usuário ou a senha. Confira em Ajustes.', 'auth');
    if (r.status === 429 || r.status >= 500) throw fail(`Servidor ocupado (${r.status}).`, 'offline');
    return r;
  }
  const mkcol = async (u) => {
    const r = await call('MKCOL', u);
    if (![201, 405, 301].includes(r.status) && r.status !== 200) throw fail(`Não consegui criar a pasta (${r.status}).`);
  };
  const BODY = '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/></d:prop></d:propfind>';
  return {
    kind: 'webdav',
    async ensure() {
      const r = await call('PROPFIND', base, { headers: { Depth: '0', 'Content-Type': 'application/xml' }, body: BODY });
      if (r.status === 404) await mkcol(base);
      else if (r.status !== 207) throw fail(`O endereço não parece uma pasta WebDAV (${r.status}).`);
    },
    async list(dir) {
      const u = url(dir) + '/';
      const r = await call('PROPFIND', u, { headers: { Depth: '1', 'Content-Type': 'application/xml' }, body: BODY });
      if (r.status === 404) return [];
      if (r.status !== 207) throw fail(`Não consegui listar (${r.status}).`);
      return parsePropfind(r.text, u);
    },
    async get(path) {
      const r = await call('GET', url(path));
      if (r.status === 404) return null;
      if (r.status !== 200) throw fail(`Não consegui baixar (${r.status}).`);
      return r.text;
    },
    async put(path, text) {
      let r = await call('PUT', url(path), { headers: { 'Content-Type': 'application/json' }, body: text });
      if (r.status === 409 || r.status === 404) {
        // Pasta ainda não existe: cria e tenta de novo.
        const dir = path.split('/').slice(0, -1).join('/');
        if (dir) await mkcol(url(dir) + '/');
        r = await call('PUT', url(path), { headers: { 'Content-Type': 'application/json' }, body: text });
      }
      if (![200, 201, 204].includes(r.status)) throw fail(`Não consegui enviar (${r.status}).`);
    },
    async del(path) {
      const r = await call('DELETE', url(path));
      if (![200, 204, 404].includes(r.status)) throw fail(`Não consegui apagar (${r.status}).`);
    },
    account: async () => `${creds.user} · ${new URL(base).host}`,
  };
}

// Lê a resposta de um PROPFIND (só os arquivos, sem a própria pasta).
export function parsePropfind(xml, dirUrl) {
  const out = [];
  const dirPath = decodeURIComponent(new URL(dirUrl).pathname).replace(/\/+$/, '');
  const blocks = xml.split(/<(?:[a-zA-Z0-9]+:)?response[\s>]/).slice(1);
  for (const b of blocks) {
    const href = (b.match(/<(?:[a-zA-Z0-9]+:)?href[^>]*>([^<]*)</) || [])[1];
    if (!href) continue;
    const isDir = /<(?:[a-zA-Z0-9]+:)?collection\s*\/?>/.test(b);
    let path;
    try {
      path = decodeURIComponent(new URL(href.trim(), dirUrl).pathname).replace(/\/+$/, '');
    } catch {
      continue;
    }
    if (isDir || path === dirPath) continue;
    const size = Number((b.match(/getcontentlength[^>]*>(\d+)</) || [])[1] || 0);
    out.push({ name: path.split('/').pop(), size });
  }
  return out;
}

/* ---------- Fábrica ---------- */
export function makeProvider(creds, save) {
  if (creds.kind === 'dropbox') return dropbox(creds, save);
  if (creds.kind === 'onedrive') return onedrive(creds, save);
  if (creds.kind === 'webdav') return webdav(creds);
  throw fail('Nuvem desconhecida.', 'config');
}
export const providerName = (kind) => PROVIDERS[kind]?.short || PROVIDERS[kind]?.name || 'nuvem';
