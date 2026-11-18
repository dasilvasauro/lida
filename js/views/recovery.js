// Chave de recuperação: mostrar o código (na criação da conta e em Ajustes) e usar o código quando a
// pessoa esquece a senha (cria uma senha nova). O código nunca sai do aparelho: só o que ele embrulha
// (a chave dos dados, cifrada) vai para a nuvem, junto da senha embrulhada.
import { app } from '../state.js';
import * as cloud from '../core/cloud.js';
import { addRecovery, recoverWithCode, validCode, normCode } from '../lib/crypto.js';
import { esc } from '../lib/util.js';
import { icon, sheet, toast } from '../ui/ui.js';
import { t } from '../core/i18n.js';

// O conteúdo da tela do código (usado no portão e numa janela). onDone é chamado em "Continuar".
export function codeHtml(code) {
  return `<div class="rc">
    <p class="rc-lead">Se você esquecer a senha, este código abre os seus dados e deixa criar uma senha nova. Guarde fora do Lida: anote no papel, salve num gerenciador de senhas ou baixe o arquivo.</p>
    <div class="rc-code" translate="no" aria-label="Código de recuperação">${code
      .split('-')
      .map((b) => `<span>${esc(b)}</span>`)
      .join('')}</div>
    <div class="rc-actions"><button type="button" class="chip" data-rccopy>${icon('copy', 'sm')}Copiar</button><button type="button" class="chip" data-rcsave>${icon('download', 'sm')}Baixar arquivo</button></div>
    <p class="rc-warn">${icon('lock', 'sm')} Sem a senha e sem este código, ninguém recupera os dados, nem o Lida.</p>
    <label class="rc-ok"><input type="checkbox" data-rcok> Guardei a chave num lugar seguro</label>
  </div>`;
}
export function bindCode(root, code, done) {
  const go = root.querySelector('[data-rcgo]');
  root.querySelector('[data-rcok]').onchange = (e) => (go.disabled = !e.target.checked);
  go.disabled = true;
  root.querySelector('[data-rccopy]').onclick = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast(t('Código copiado.'));
    } catch {
      toast(t('Não consegui copiar.'));
    }
  };
  root.querySelector('[data-rcsave]').onclick = () => downloadCode(code);
  go.onclick = done;
}
export function downloadCode(code) {
  const text = `${t('Lida · chave de recuperação')}\n\n${code}\n\n${t('Use este código em "Esqueci a senha" para criar uma senha nova. Guarde num lugar seguro, fora do Lida.')}\n`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = 'lida-chave-de-recuperacao.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 1000);
}

// Janela (Ajustes): mostra o código novo.
export function showCode(code) {
  return new Promise((resolve) => {
    sheet({
      title: 'Chave de recuperação',
      body: `${codeHtml(code)}<div class="sheet-actions"><span></span><button type="button" class="btn primary" data-rcgo>Pronto</button></div>`,
      onMount(el, close) {
        bindCode(el, code, close);
      },
      onClose: resolve,
    });
  });
}

// Formulário "Esqueci a senha" (campos): código + senha nova duas vezes.
export const recoverFields = () => `
  <label class="field"><span>Código de recuperação</span><input name="rc" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" required translate="no"></label>
  <label class="field"><span>Nova senha</span><input name="p1" type="password" autocomplete="new-password" minlength="8" required></label>
  <label class="field"><span>Repita a nova senha</span><input name="p2" type="password" autocomplete="new-password" required></label>`;

// Usa o código: devolve { key, wrap } (a senha nova já embrulha a chave). Lança erro com mensagem pronta.
export async function useCode(f, rwrap) {
  if (!rwrap) throw new Error(t('Esta conta ainda não tem chave de recuperação.'));
  if (!validCode(f.rc.value)) throw new Error(t('O código tem 24 letras e números (os traços são opcionais).'));
  if (f.p1.value !== f.p2.value) throw new Error(t('As senhas não conferem.'));
  try {
    return await recoverWithCode(normCode(f.rc.value), rwrap, f.p1.value);
  } catch (e) {
    if (e.code === 'bad-code') throw new Error(t('Código de recuperação incorreto.'));
    throw e;
  }
}

/* ---------- Ajustes ---------- */
// Cria (ou troca) a chave de recuperação da conta: pede a senha atual, grava em todo lugar onde a
// senha embrulhada fica (aparelho, conta Google ou pasta da nuvem) e mostra o código.
export function createRecovery() {
  sheet({
    title: 'Chave de recuperação',
    body: `<form class="form" data-f>
      <p class="sheet-text">${app.rwrap ? 'Gerar outra chave invalida a anterior. Digite a senha do Lida para continuar.' : 'Com a chave de recuperação, você cria uma senha nova se esquecer a sua. Digite a senha do Lida para gerar a chave.'}</p>
      <label class="field"><span>Senha do Lida</span><input name="p" type="password" required autocomplete="current-password"></label>
      <div class="sheet-actions"><span></span><button class="btn primary">${app.rwrap ? 'Gerar outra chave' : 'Gerar chave'}</button></div></form>`,
    onMount(el, close) {
      el.querySelector('[data-f]').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('.btn.primary');
        btn.disabled = true;
        try {
          const { rwrap, code } = await addRecovery(e.target.p.value, app.wrap);
          await saveRecovery(rwrap);
          close();
          await showCode(code);
          app.refresh?.();
        } catch (ex) {
          btn.disabled = false;
          toast(ex.code === 'bad-pass' ? t('Senha incorreta.') : ex.message || t('Não foi possível alterar. Verifique a conexão.'));
        }
      };
    },
  });
}
export async function saveRecovery(rwrap) {
  if (app.mode === 'cloud') await cloud.updateRecovery(app.sid, rwrap);
  else if (app.mode === 'files' && app.sync?.putSpace) await app.sync.putSpace(app.wrap, rwrap);
  app.rwrap = rwrap;
  await app.idb.put('meta', rwrap, 'rwrap');
}
// A chave pode ter sido criada em outro aparelho: confere na nuvem e guarda aqui.
export async function refreshRecovery() {
  try {
    let r = null;
    if (app.mode === 'cloud') r = (await cloud.getSpace(app.sid))?.rwrap || null;
    else if (app.mode === 'files') r = (await app.sync?.getRecovery?.()) || null;
    else return app.rwrap;
    if (r) {
      app.rwrap = r;
      await app.idb.put('meta', r, 'rwrap');
    }
  } catch {
    /* sem conexão: fica o que está aqui */
  }
  return app.rwrap;
}
