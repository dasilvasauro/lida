// Atualização dentro do app (APK do GitHub): uma vez por dia o app olha a última Release; se houver
// versão nova, mostra o que mudou (as Novidades e correções da versão) e, com um toque, baixa,
// confere o SHA-256 e instala sem sair do app. Depois de instalar, o Lida reabre (ou deixa uma
// notificação "toque para abrir", quando o Android não deixa reabrir sozinho).
// Na variante do F-Droid (e na web e no Linux) não faz nada: lá quem atualiza é a loja ou o install.sh.
import { app } from '../state.js';
import { hasPlugin, plugin } from '../native.js';
import { esc } from '../lib/util.js';
import { icon, sheet, toast } from '../ui/ui.js';
import { KIND_LABEL } from '../core/changelog.js';
import { play } from '../core/sound.js';

export const LATEST_URL = 'https://github.com/dasilvasauro/lida/releases/latest/download/latest.json';
const KEY = 'lida.update';
const DAY = 86400000;

const ls = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch {
      return {};
    }
  },
  set(p) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...ls.get(), ...p }));
    } catch {
      /* sem armazenamento */
    }
  },
};

export const updaterAvailable = () => hasPlugin('LidaApp');

// Procura versão nova. manual: ignora o intervalo de um dia e a versão pulada, e avisa quando não há.
export async function checkUpdate({ manual = false } = {}) {
  if (!updaterAvailable()) return null;
  const st = ls.get();
  if (!manual && Date.now() - (st.at || 0) < DAY) return null;
  const P = plugin('LidaApp');
  try {
    const info = await P.info();
    if (!info.updater) {
      if (manual) toast('Nesta versão, as atualizações chegam pela loja (F-Droid).');
      return null;
    }
    const res = await P.fetchText({ url: LATEST_URL });
    ls.set({ at: Date.now() });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    const latest = JSON.parse(res.text);
    const newer = Number(latest.versionCode) > Number(info.versionCode || 0);
    if (!newer) {
      if (manual) toast(`Você está na versão mais nova (${info.versionName || app.version}).`);
      return null;
    }
    if (!manual && st.skip === latest.version) return null;
    showUpdate(latest, info);
    return latest;
  } catch (e) {
    if (manual) toast('Não consegui procurar atualizações agora. Confira a internet.');
    console.warn('Atualização', e);
    return null;
  }
}

const fmtSize = (b) => (b ? `${(b / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : '');
const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

function showUpdate(latest, info) {
  let stop = () => {};
  sheet({
    title: 'Nova versão do Lida',
    body: `<div class="upd">
      <div class="upd-head"><span class="upd-ic">${icon('download')}</span><div><b>${esc(latest.title || latest.version)}</b>
        <small>${esc(latest.version)}${latest.date ? ` · ${fmtDate(latest.date)}` : ''}${latest.size ? ` · ${fmtSize(latest.size)}` : ''} · você tem a ${esc(info.versionName || app.version)}</small></div></div>
      ${
        (latest.items || []).length
          ? `<ul class="upd-items">${latest.items.map(([k, t]) => `<li class="cl-${esc(k)}"><span class="cl-kind">${esc(KIND_LABEL[k] || k)}</span><p>${esc(t)}</p></li>`).join('')}</ul>`
          : ''
      }
      <div class="upd-prog" data-prog hidden><div class="bar"><i data-pbar style="width:0%"></i></div><small data-ptext>Baixando…</small></div>
      <p class="hint" data-unote hidden></p>
      <div class="sheet-actions upd-actions">
        <button type="button" class="btn ghost" data-skip>Pular esta versão</button>
        <button type="button" class="btn ghost" data-later>Depois</button>
        <button type="button" class="btn primary" data-go>${icon('download')}Atualizar agora</button>
      </div>
    </div>`,
    onMount(el, close) {
      const P = plugin('LidaApp');
      const go = el.querySelector('[data-go]');
      const note = el.querySelector('[data-unote]');
      const prog = el.querySelector('[data-prog]');
      const say = (t) => ((note.hidden = !t), (note.textContent = t || ''));
      el.querySelector('[data-later]').onclick = close;
      el.querySelector('[data-skip]').onclick = () => (ls.set({ skip: latest.version }), close());
      let path = null;
      const install = async () => {
        try {
          say('Instalando… o Lida vai fechar e abrir de novo já na versão nova.');
          await P.install({ path });
        } catch (e) {
          if (String(e?.message || e).includes('need-permission')) {
            say('Falta liberar "Instalar apps desconhecidos" para o Lida (só desta vez). Toque em Liberar, ative a opção e volte para o app.');
            go.disabled = false;
            go.innerHTML = `${icon('settings')}Liberar`;
            go.onclick = () => P.openInstallSettings();
            // Ao voltar das configurações, tenta de novo sozinho.
            const onVis = async () => {
              if (document.visibilityState !== 'visible') return;
              const i = await P.info();
              if (!i.canInstall) return;
              document.removeEventListener('visibilitychange', onVis);
              go.disabled = true;
              install();
            };
            document.addEventListener('visibilitychange', onVis);
            stop = () => document.removeEventListener('visibilitychange', onVis);
          } else say(e?.message || 'Não consegui instalar a atualização.');
        }
      };
      go.onclick = async () => {
        go.disabled = true;
        el.querySelector('[data-skip]').hidden = true;
        prog.hidden = false;
        say('');
        const sub = await P.addListener('progress', ({ done, total }) => {
          const f = total > 0 ? done / total : 0;
          el.querySelector('[data-pbar]').style.width = `${Math.round(f * 100)}%`;
          el.querySelector('[data-ptext]').textContent = total > 0 ? `Baixando… ${fmtSize(done)} de ${fmtSize(total)}` : `Baixando… ${fmtSize(done)}`;
        });
        try {
          const r = await P.download({ url: latest.apk, sha256: latest.sha256 || '' });
          path = r.path;
          el.querySelector('[data-pbar]').style.width = '100%';
          el.querySelector('[data-ptext]').textContent = 'Download conferido.';
          play('tick');
          await install();
        } catch (e) {
          say(e?.message || 'Não consegui baixar a atualização.');
          go.disabled = false;
        } finally {
          sub?.remove?.();
        }
      };
    },
    onClose: () => stop(),
  });
}

// Começa a olhar por atualizações (alguns segundos depois de abrir e ao voltar para o app).
export function initUpdates() {
  if (!updaterAvailable()) return;
  setTimeout(() => checkUpdate(), 8000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkUpdate());
}
