// Requisições HTTP para as nuvens da pessoa (Dropbox, OneDrive, WebDAV/Nextcloud).
// - No app Android: pelo próprio Android (LidaApp.http). Sem CORS, aceita PROPFIND/MKCOL do WebDAV e
//   o login do OneDrive (o servidor da Microsoft não responde a páginas web para apps instalados).
// - No app Linux: pelo próprio app (/__desktop/http), pelo mesmo motivo.
// - Na web: fetch comum. Funciona com o Dropbox; WebDAV só se o servidor liberar CORS.
// Só texto (os arquivos de sincronização são JSON).
import { hasPlugin, plugin, isNative } from '../native.js';
// Sem importar desktop.js (que puxa as telas): basta saber se a ponte do app Linux existe.
const isDesktop = () => typeof window !== 'undefined' && !!window.__LIDA_DESKTOP__;

export const nativeHttp = () => hasPlugin('LidaApp') || isDesktop();

export class NetError extends Error {
  constructor(msg, code = 'offline') {
    super(msg);
    this.code = code;
  }
}

// { method, url, headers, body } → { status, text, headers }
export async function http({ method = 'GET', url, headers = {}, body = null, timeout = 45000 }) {
  if (!/^https:\/\//.test(url)) throw new NetError('Use um endereço https://', 'config');
  if (hasPlugin('LidaApp')) {
    try {
      const r = await plugin('LidaApp').http({ method, url, headers, body: body ?? undefined, timeout });
      return { status: r.status, text: r.text || '', headers: lower(r.headers) };
    } catch (e) {
      throw new NetError(String(e?.message || e), 'offline');
    }
  }
  if (isDesktop()) {
    let r;
    try {
      r = await fetch('/__desktop/http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Lida-Token': window.__LIDA_DESKTOP__.token },
        body: JSON.stringify({ method, url, headers, body, timeout: Math.round(timeout / 1000) }),
      });
    } catch (e) {
      throw new NetError(String(e?.message || e), 'offline');
    }
    const x = await r.json().catch(() => ({}));
    if (x.error) throw new NetError(x.error, 'offline');
    return { status: x.status, text: x.text || '', headers: lower(x.headers) };
  }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { method, headers, body: body ?? undefined, signal: ctl.signal, cache: 'no-store' });
    const h = {};
    r.headers.forEach((v, k) => (h[k] = v));
    return { status: r.status, text: await r.text(), headers: h };
  } catch (e) {
    throw new NetError(navigator.onLine ? 'O servidor não respondeu (ou não aceita conexões desta página).' : 'Sem conexão.', navigator.onLine ? 'cors' : 'offline');
  } finally {
    clearTimeout(t);
  }
}
const lower = (h) => Object.fromEntries(Object.entries(h || {}).map(([k, v]) => [k.toLowerCase(), String(v)]));

export const form = (o) =>
  Object.entries(o)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

// Abre um endereço no navegador do sistema (login do Dropbox e da Microsoft).
export function openExternal(url) {
  if (hasPlugin('LidaApp')) return plugin('LidaApp').openUrl({ url });
  // No app Linux, abrir janela nova vai para o navegador do sistema.
  window.open(url, '_blank', 'noopener');
  return Promise.resolve();
}
export const onDevice = () => isNative() || isDesktop();
