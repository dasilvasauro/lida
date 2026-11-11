// Sincronizar pela nuvem da própria pessoa: escolher (Dropbox, OneDrive, Nextcloud/WebDAV), entrar,
// conferir a pasta e ligar o motor de arquivos (core/filesync.js).
//
// Ao conectar:
// - pasta vazia: este aparelho cria o space.json (a chave do espaço, embrulhada pela senha) e envia tudo;
// - pasta deste mesmo espaço (outro aparelho já moveu, ou reconectando): só liga e envia o que faltar;
// - pasta de OUTRO espaço (outro aparelho começou separado): pede a senha daquele espaço e junta os
//   dados deste aparelho aos de lá (re-cifrados com a chave de lá). Nada se perde.
// "Mover sincronização" (conta Google → nuvem própria) é o mesmo caminho: o espaço continua o mesmo.
import { app, personal } from '../state.js';
import { PROVIDERS, makeProvider, dropboxStart, dropboxFinish, onedriveStart, providerName } from '../core/providers.js';
import { createFileSync, readSpace, spaceDoc } from '../core/filesync.js';
import { openExternal, nativeHttp } from '../core/net.js';
import { seal, unseal, unlockKey } from '../lib/crypto.js';
import { icon, sheet, toast } from '../ui/ui.js';
import { esc } from '../lib/util.js';

/* ---------- Credenciais (cifradas com a chave do espaço, só neste aparelho) ---------- */
const AAD = 'lida-files-creds';
export async function saveCreds(idb, key, creds) {
  const { iv, ct } = await seal(key, creds, AAD);
  await idb.put('meta', { iv, ct }, 'filesCreds');
}
export async function loadCreds(idb, key) {
  const x = await idb.get('meta', 'filesCreds');
  if (!x) return null;
  try {
    return await unseal(key, x.iv, x.ct, AAD);
  } catch {
    return null;
  }
}

// Dá para usar esta nuvem aqui? { ok, why }
export function availability(kind) {
  const p = PROVIDERS[kind];
  if (!p.configured()) return { ok: false, why: 'Não configurado nesta versão do Lida.' };
  if (kind === 'onedrive' && !nativeHttp()) return { ok: false, why: 'Conecte pelo app Android ou pelo app do Linux.' };
  return { ok: true, why: '' };
}
export const anyFilesProvider = () => Object.keys(PROVIDERS).some((k) => availability(k).ok);

const DESC = {
  dropbox: 'Pasta Aplicativos/Lida no seu Dropbox.',
  onedrive: 'Pasta Aplicativos/Lida no seu OneDrive.',
  webdav: 'Nextcloud, ownCloud, Synology, Koofr ou outro servidor WebDAV.',
};
const top = (el) => el.closest('.sheet-wrap')?.classList.add('top'); // acima da tela de entrada

/* ---------- Escolher a nuvem ---------- */
export function pickProvider({ title = 'Sincronizar com a sua nuvem', lead = '' } = {}) {
  return new Promise((resolve) => {
    let out = null;
    sheet({
      title,
      body: `${lead ? `<p class="sheet-text">${lead}</p>` : ''}<div class="set-list cf-pick">${Object.keys(PROVIDERS)
        .map((k) => {
          const a = availability(k);
          return `<button type="button" class="set-row" data-kind="${k}"${a.ok ? '' : ' disabled'}>${icon('cloud')}<span class="grow">${esc(PROVIDERS[k].name)}<small>${esc(a.ok ? DESC[k] : a.why)}</small></span>${icon('right', 'sm')}</button>`;
        })
        .join('')}</div>
        <p class="hint">Tudo vai cifrado com a sua senha do Lida: quem guarda os arquivos não consegue ler nada.</p>`,
      onMount(el, close) {
        top(el);
        el.querySelectorAll('[data-kind]').forEach((b) => (b.onclick = () => ((out = b.dataset.kind), close())));
      },
      onClose: () => resolve(out),
    });
  });
}

/* ---------- Entrar ---------- */
export function authFlow(kind) {
  if (kind === 'dropbox') return dropboxFlow();
  if (kind === 'onedrive') return onedriveFlow();
  return webdavFlow();
}

function dropboxFlow() {
  return new Promise((resolve) => {
    let out = null;
    let start = null;
    sheet({
      title: 'Conectar o Dropbox',
      body: `<ol class="cf-steps">
          <li><b>Abra o Dropbox</b> e permita o acesso do Lida (ele só enxerga a pasta Aplicativos/Lida).
            <button type="button" class="btn wide" data-open>${icon('open')}Abrir o Dropbox</button></li>
          <li><b>Copie o código</b> que o Dropbox mostrar e cole aqui.
            <form class="form" data-f><label class="field"><span>Código do Dropbox</span><input name="code" autocomplete="off" autocapitalize="off" spellcheck="false" required></label>
            <p class="cf-err" hidden></p><button class="btn primary wide">Conectar</button></form></li>
        </ol>`,
      async onMount(el, close) {
        top(el);
        const errEl = el.querySelector('.cf-err');
        const say = (t) => ((errEl.hidden = !t), (errEl.textContent = t || ''));
        start = await dropboxStart();
        el.querySelector('[data-open]').onclick = () => openExternal(start.url);
        el.querySelector('[data-f]').onsubmit = async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('button');
          btn.disabled = true;
          say('');
          try {
            out = await dropboxFinish(e.target.code.value, start.verifier);
            close();
          } catch (ex) {
            say(ex.message);
            btn.disabled = false;
          }
        };
      },
      onClose: () => resolve(out),
    });
  });
}

function onedriveFlow() {
  return new Promise((resolve) => {
    let out = null;
    let flow = null;
    sheet({
      title: 'Conectar o OneDrive',
      body: `<div class="cf-device" data-body><p class="sheet-text">Pedindo um código à Microsoft…</p></div>`,
      async onMount(el, close) {
        top(el);
        const body = el.querySelector('[data-body]');
        try {
          flow = await onedriveStart();
        } catch (e) {
          body.innerHTML = `<p class="cf-err">${esc(e.message)}</p>`;
          return;
        }
        body.innerHTML = `<p class="sheet-text">Abra a página da Microsoft, entre na sua conta e digite este código:</p>
          <div class="cf-code" data-code>${esc(flow.userCode)}</div>
          <button type="button" class="btn primary wide" data-open>${icon('open')}Copiar o código e abrir</button>
          <p class="hint" data-wait>${icon('refresh', 'sm')} Esperando você entrar… O Lida só enxerga a pasta Aplicativos/Lida.</p>`;
        el.querySelector('[data-open]').onclick = async () => {
          try {
            await navigator.clipboard.writeText(flow.userCode);
            toast('Código copiado.');
          } catch {
            /* sem área de transferência: a pessoa digita */
          }
          openExternal(flow.url);
        };
        try {
          out = await flow.poll();
          close();
        } catch (e) {
          if (e.code !== 'cancel' && body.isConnected) body.insertAdjacentHTML('beforeend', `<p class="cf-err">${esc(e.message)}</p>`);
        }
      },
      onClose: () => (flow?.cancel(), resolve(out)),
    });
  });
}

function webdavFlow(prev = {}) {
  return new Promise((resolve) => {
    let out = null;
    sheet({
      title: 'Conectar Nextcloud / WebDAV',
      body: `<form class="form" data-f>
          <label class="field"><span>Endereço da pasta</span><input name="url" type="url" inputmode="url" placeholder="https://nuvem.exemplo.com/remote.php/dav/files/usuario/Lida" value="${esc(prev.url || '')}" required autocapitalize="off" spellcheck="false"></label>
          <p class="hint">No Nextcloud: Arquivos > Configurações (canto de baixo) > WebDAV mostra o começo do endereço. Acrescente <code>/Lida</code> no fim (a pasta é criada se não existir).</p>
          <label class="field"><span>Usuário</span><input name="user" autocomplete="username" autocapitalize="off" value="${esc(prev.user || '')}" required></label>
          <label class="field"><span>Senha de app</span><input name="pass" type="password" autocomplete="current-password" required></label>
          <p class="hint">Use uma senha de app (Nextcloud: Configurações pessoais > Segurança > Criar nova senha de app), não a senha principal.${nativeHttp() ? '' : ' Na web, o servidor precisa liberar CORS para esta página; no app Android ou Linux não precisa.'}</p>
          <p class="cf-err" hidden></p>
          <div class="sheet-actions"><span></span><button class="btn primary">Conectar</button></div></form>`,
      onMount(el, close) {
        top(el);
        const errEl = el.querySelector('.cf-err');
        el.querySelector('[data-f]').onsubmit = async (e) => {
          e.preventDefault();
          const f = e.target;
          const btn = f.querySelector('.btn.primary');
          btn.disabled = true;
          errEl.hidden = true;
          try {
            const creds = { kind: 'webdav', url: f.url.value.trim(), user: f.user.value.trim(), pass: f.pass.value, account: '' };
            await makeProvider(creds).ensure();
            out = creds;
            close();
          } catch (ex) {
            errEl.hidden = false;
            errEl.textContent = ex.code === 'cors' ? 'O servidor não aceitou a conexão desta página (CORS). Use o app Android ou o do Linux, ou libere CORS no servidor.' : ex.message;
            btn.disabled = false;
          }
        };
      },
      onClose: () => resolve(out),
    });
  });
}

/* ---------- Senha de um espaço que já está na pasta ---------- */
async function unlockSpace(kind, wrap, lead) {
  return new Promise((resolve) => {
    let out = null;
    sheet({
      title: `Lida no ${providerName(kind)}`,
      body: `<form class="form" data-f><p class="sheet-text">${lead}</p>
        <label class="field"><span>Senha do Lida usada lá</span><input name="p" type="password" autocomplete="current-password" required></label>
        <p class="cf-err" hidden></p>
        <div class="sheet-actions"><button type="button" class="btn ghost" data-no>Cancelar</button><button class="btn primary">Continuar</button></div></form>`,
      onMount(el, close) {
        top(el);
        el.querySelector('[data-no]').onclick = close;
        el.querySelector('[data-f]').onsubmit = async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('.btn.primary');
          btn.disabled = true;
          try {
            out = await unlockKey(e.target.p.value, wrap);
            close();
          } catch {
            const x = el.querySelector('.cf-err');
            x.hidden = false;
            x.textContent = 'Senha incorreta.';
            btn.disabled = false;
          }
        };
      },
      onClose: () => resolve(out),
    });
  });
}

/* ---------- Ligar o motor ---------- */
export async function startFileSync(idb, creds) {
  const provider = makeProvider(creds, (c) => saveCreds(idb, app.key, c));
  app.sync?.stop?.();
  app.sync = createFileSync(personal, { idb, provider, device: app.device, sid: app.sid, wrap: app.wrap });
  app.syncKind = creds.kind;
  app.syncAccount = creds.account || '';
  await app.sync.start();
  return app.sync;
}

// Junta os dados deste aparelho a outro espaço (o que já está na pasta): re-cifra tudo com a chave de lá.
async function rekey(sid, wrap, key) {
  const plain = personal.allRecords().map((r) => ({ id: r.id, type: r.type, u: r.u, by: r.by, del: !!r.del, ...(r.del ? {} : { data: r.data, fv: r.fv, fb: r.fb, fp: r.fp, fd: r.fd, cb: r.cb, ca: r.ca }) }));
  const idb = app.idb;
  await idb.clear('records');
  await idb.clear('outbox');
  for (const k of ['cursor', 'lastPull', 'fcur']) await idb.del('meta', k);
  await idb.put('meta', sid, 'sid');
  await idb.put('meta', wrap, 'wrap');
  if (localStorage.getItem('lida.requirePass') !== '1') await idb.put('meta', key, 'key');
  Object.assign(app, { sid, wrap, key });
  await personal.init(idb, key);
  await personal.importPlain(plain);
}

// Conectar a partir de Ajustes (modo "só neste aparelho" ou conta Google). Devolve true se ligou.
export async function connectFiles({ moving = false } = {}) {
  const kind = await pickProvider({
    title: moving ? 'Mover a sincronização' : 'Sincronizar com a sua nuvem',
    lead: moving ? 'Seus dados saem do servidor do Lida (conta Google) e passam a sincronizar pela sua nuvem. Faça o mesmo nos outros aparelhos.' : '',
  });
  if (!kind) return false;
  const creds = await authFlow(kind);
  if (!creds) return false;
  const provider = makeProvider(creds);
  try {
    creds.account = await provider.account();
    const sp = await readSpace(provider);
    if (sp && sp.sid !== app.sid) {
      const key = await unlockSpace(kind, sp.wrap, `Já existe um Lida nesta pasta (de outro aparelho). Digite a senha usada lá: os dados deste aparelho vão ser juntados aos de lá, sem perder nada.`);
      if (!key) return false;
      await rekey(sp.sid, sp.wrap, key);
    } else if (!sp) {
      await provider.put('space.json', spaceDoc(app.sid, app.wrap));
    }
  } catch (e) {
    toast(e.message || 'Não consegui falar com a nuvem.', { ms: 6000 });
    return false;
  }
  const wasCloud = app.mode === 'cloud';
  app.sync?.stop?.();
  app.sync = null;
  if (wasCloud) {
    try {
      const cloud = await import('../core/cloud.js');
      await cloud.signOut();
    } catch {
      /* segue */
    }
  }
  app.mode = 'files';
  app.user = null;
  await app.idb.put('meta', 'files', 'mode');
  await app.idb.put('meta', {}, 'fcur');
  await saveCreds(app.idb, app.key, creds);
  // Tudo o que este aparelho tem sobe para a pasta (quem já está lá ignora o repetido).
  await personal.queue(personal.allRecords().map((r) => r.id));
  await startFileSync(app.idb, creds);
  toast(`${providerName(kind)} conectado. Seus dados estão subindo, já cifrados.${wasCloud ? ' A conta Google foi desconectada deste aparelho.' : ''}`, { ms: 6000 });
  app.actions.syncChanged?.();
  return true;
}

// O acesso venceu ou foi removido: entra de novo na mesma nuvem.
export async function reconnectFiles() {
  const creds0 = await loadCreds(app.idb, app.key);
  const kind = creds0?.kind || app.syncKind;
  if (!kind) return connectFiles();
  const creds = kind === 'webdav' ? await webdavFlow(creds0 || {}) : await authFlow(kind);
  if (!creds) return false;
  try {
    const provider = makeProvider(creds);
    creds.account = await provider.account();
    const sp = await readSpace(provider);
    if (sp && sp.sid !== app.sid) throw new Error('Esta pasta tem outro Lida. Use a mesma conta de antes ou desconecte e conecte de novo.');
  } catch (e) {
    toast(e.message, { ms: 6000 });
    return false;
  }
  await saveCreds(app.idb, app.key, creds);
  await startFileSync(app.idb, creds);
  toast('Conectado de novo.');
  app.actions.syncChanged?.();
  return true;
}

// Para de sincronizar (os dados continuam aqui e na pasta).
export async function disconnectFiles() {
  app.sync?.stop?.();
  app.sync = null;
  app.mode = 'local';
  await app.idb.put('meta', 'local', 'mode');
  await app.idb.del('meta', 'filesCreds');
  toast('Desconectado. Os dados continuam neste aparelho (e os arquivos cifrados, na nuvem).', { ms: 5000 });
  app.actions.syncChanged?.();
}

/* ---------- Tela de entrada: "Já sincronizo pela minha nuvem" ---------- */
// Devolve { sid, key, wrap, mode: 'files', uid: 'local', files: creds } ou null.
export async function enterWithFiles() {
  const kind = await pickProvider({ title: 'Entrar pela sua nuvem', lead: 'Escolha onde o Lida já guarda os seus dados.' });
  if (!kind) return null;
  const creds = await authFlow(kind);
  if (!creds) return null;
  const provider = makeProvider(creds);
  let sp;
  try {
    creds.account = await provider.account();
    sp = await readSpace(provider);
  } catch (e) {
    toast(e.message, { ms: 6000 });
    return null;
  }
  if (!sp) {
    toast(`Ainda não há Lida nesta pasta do ${providerName(kind)}. Comece com "Usar só neste aparelho" e conecte a nuvem em Ajustes.`, { ms: 7000 });
    return null;
  }
  const key = await unlockSpace(kind, sp.wrap, 'Digite a senha do Lida (a mesma dos outros aparelhos).');
  if (!key) return null;
  return { sid: sp.sid, key, wrap: sp.wrap, mode: 'files', uid: 'local', user: null, files: creds };
}
