// Sincronização: o indicador no topo (status e horário da última sincronização), a folha com os
// detalhes ("Sincronizar agora", alterações esperando para subir) e os conflitos entre aparelhos
// (o mesmo campo mudado em dois aparelhos sem um ter visto o outro: vence o mais novo e você decide).
import { app, personal } from '../state.js';
import { esc, fmtDateHuman } from '../lib/util.js';
import { icon, sheet, toast } from '../ui/ui.js';
import { haptic } from '../ui/haptics.js';

const LABEL = {
  synced: 'Sincronizado',
  syncing: 'Sincronizando…',
  offline: 'Sem conexão',
  error: 'Erro ao sincronizar',
  denied: 'Sem acesso à nuvem',
  local: 'Somente neste aparelho',
};
const HINT = {
  synced: 'Tudo o que você fez está na nuvem e nos seus outros aparelhos.',
  syncing: 'Enviando e recebendo as alterações.',
  offline: 'As alterações ficam guardadas neste aparelho e sobem quando a internet voltar.',
  error: 'O Lida vai tentar de novo sozinho. Se continuar, toque em Sincronizar agora.',
  denied: 'A conta não tem acesso a estes dados na nuvem. Entre de novo na conta Google.',
  local: 'Os dados ficam só aqui. Conecte uma conta em Ajustes para sincronizar.',
};

const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
// "hoje às 14:32", "ontem às 09:10", "12/11 às 08:00".
export function whenText(ms) {
  if (!ms) return 'nunca';
  const d = new Date(ms);
  const now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const date = diff === 0 ? 'hoje' : diff === 1 ? 'ontem' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${date} às ${hm(d)}`;
}
export function agoText(ms) {
  if (!ms) return '';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return 'agora há pouco';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} dia${h >= 36 ? 's' : ''}`;
}

const status = () => (app.sync ? app.sync.getStatus() : 'local');

/* ---------- Indicador no topo ---------- */
export function initSyncPill() {
  const pill = document.querySelector('[data-dot]');
  if (!pill) return;
  pill.onclick = () => openSync();
  if (!app.sync) return;
  pill.hidden = false;
  const paint = () => {
    const s = status();
    const n = personal.conflicts().length;
    const last = app.sync.lastSync();
    pill.dataset.s = n ? 'conflict' : s;
    const short = n ? `${n} conflito${n > 1 ? 's' : ''}` : s === 'synced' && last ? `Sincronizado · ${hm(new Date(last))}` : LABEL[s] || '';
    pill.querySelector('[data-synctext]').textContent = short;
    const full = `${n ? `${short}. ` : ''}${LABEL[s] || ''}${last ? ` · última sincronização ${whenText(last)}` : ''}`;
    pill.title = full;
    pill.setAttribute('aria-label', `${full}. Abrir detalhes da sincronização`);
  };
  app.sync.onStatus(paint);
  personal.onConflicts(paint);
  setInterval(paint, 60000);
  paint();
}

/* ---------- Folha de detalhes ---------- */
const show = (v) => {
  if (v == null || v === '') return '<em>vazio</em>';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return esc(fmtDateHuman(v));
  if (typeof v === 'string') return esc(v.length > 140 ? `${v.slice(0, 140)}…` : v);
  return esc(String(v));
};

export function openSync() {
  let stop = () => {};
  sheet({
    title: 'Sincronização',
    body: '<div class="sync-sheet" data-syncbody></div>',
    onMount(el, close) {
      const body = el.querySelector('[data-syncbody]');
      const draw = async () => {
        if (!body.isConnected) return;
        const s = status();
        const last = app.sync?.lastSync() || 0;
        const pend = app.sync ? await app.sync.pending() : 0;
        const conflicts = personal.conflicts();
        body.innerHTML = `
          <div class="sy-head" data-s="${s}"><span class="sy-ic">${icon(s === 'synced' ? 'check' : s === 'syncing' ? 'refresh' : s === 'local' ? 'phone' : 'cloud')}</span>
            <div><b>${LABEL[s] || s}</b><p>${HINT[s] || ''}</p></div></div>
          ${
            app.sync
              ? `<dl class="sy-rows">
            <div><dt>Última sincronização</dt><dd>${last ? `${whenText(last)} <small>${agoText(last)}</small>` : 'ainda não terminou nenhuma'}</dd></div>
            <div><dt>Esperando para subir</dt><dd>${pend ? `${pend} alteraç${pend === 1 ? 'ão' : 'ões'}` : 'nada'}</dd></div>
            <div><dt>Este aparelho</dt><dd><code>${esc(app.device || '')}</code></dd></div>
          </dl>
          <button type="button" class="btn primary wide" data-syncnow${s === 'syncing' ? ' disabled' : ''}>${icon('refresh')}Sincronizar agora</button>`
              : `<button type="button" class="btn wide" data-goset>${icon('settings')}Abrir Ajustes</button>`
          }
          ${
            conflicts.length
              ? `<section class="sy-conf"><h3>${icon('info', 'sm')}Mudanças ao mesmo tempo</h3>
            <p class="hint">O mesmo campo foi mudado em dois aparelhos antes de um ver o outro. Ficou a versão mais nova; escolha se prefere a sua.</p>
            <ul>${conflicts
              .map(
                (c) => `<li data-cid="${esc(c.cid)}"><div class="sy-ct"><b>${esc(c.title || 'Sem título')}</b><small>${esc(c.label)}</small></div>
                <div class="sy-cv"><div><small>Neste aparelho</small><span>${show(c.mine)}</span></div><div><small>No outro (ficou)</small><span>${show(c.theirs)}</span></div></div>
                <div class="sy-ca"><button type="button" class="btn small" data-keep="mine">Manter o deste aparelho</button><button type="button" class="btn small ghost" data-keep="theirs">Ficar com o outro</button></div></li>`,
              )
              .join('')}</ul></section>`
              : ''
          }`;
        body.querySelector('[data-syncnow]')?.addEventListener('click', async (e) => {
          e.currentTarget.disabled = true;
          haptic('tick');
          app.sync.syncNow();
          const ok = await app.sync.pullNow();
          toast(ok ? 'Sincronizado.' : 'Não consegui falar com o servidor agora. Tento de novo sozinho.');
          app.refresh?.();
          draw();
        });
        body.querySelector('[data-goset]')?.addEventListener('click', () => (close(), app.nav('ajustes')));
        body.querySelectorAll('[data-cid]').forEach((li) =>
          li.querySelectorAll('[data-keep]').forEach(
            (b) =>
              (b.onclick = async () => {
                await personal.resolveConflict(li.dataset.cid, b.dataset.keep === 'mine');
                haptic('tick');
                draw();
              }),
          ),
        );
      };
      const offS = app.sync?.onStatus(() => draw());
      const offC = personal.onConflicts(() => draw());
      const timer = setInterval(draw, 30000);
      stop = () => (offS?.(), offC(), clearInterval(timer));
      draw();
    },
    onClose: () => stop(),
  });
}

// Linha em Ajustes (Conta): status e a última sincronização.
export const syncRowText = () => {
  if (!app.sync) return null;
  const last = app.sync.lastSync();
  return `${LABEL[status()] || ''}${last ? ` · última ${whenText(last)}` : ''}`;
};

export const hasConflicts = () => personal.conflicts().length > 0;
