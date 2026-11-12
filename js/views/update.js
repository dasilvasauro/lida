// Atualização dentro do app, no Android (APK do GitHub) e no Linux (pacote lida-linux.tar.gz): uma vez
// por dia o app olha a última Release; se houver versão nova, mostra o que mudou (as Novidades e
// correções da versão) e, com um toque, baixa, confere o SHA-256 e instala sem sair do app.
// Android: depois de instalar, o Lida reabre (ou deixa uma notificação "toque para abrir").
// Linux: o app roda o install.sh do pacote e abre de novo. Quem instalou pelo git vê como atualizar.
// Na variante do F-Droid e na web não faz nada: lá quem atualiza é a loja ou o próprio site.
import { app } from '../state.js';
import { hasPlugin, plugin } from '../native.js';
import { http } from '../core/net.js';
import { versionCode } from '../lib/version.js';
import { esc, LOC } from '../lib/util.js';
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

const isDesktop = () => typeof window !== 'undefined' && !!window.__LIDA_DESKTOP__;
export const updaterAvailable = () => hasPlugin('LidaApp') || isDesktop();

async function desk(path, body = {}) {
  const r = await fetch(`/__desktop/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lida-Token': window.__LIDA_DESKTOP__.token }, body: JSON.stringify(body) });
  const x = await r.json().catch(() => ({}));
  if (!r.ok || x.error) throw new Error(x.error || `HTTP ${r.status}`);
  return x;
}

// O que cada plataforma sabe fazer: info, buscar o latest.json, baixar e instalar.
const ANDROID = {
  info: () => plugin('LidaApp').info(),
  fetchText: (url) => plugin('LidaApp').fetchText({ url }),
  pick: (latest, info) => (info.flavor === 'libre' ? (latest.apkLibre ? { ...latest, apk: latest.apkLibre, sha256: latest.sha256Libre || '', size: latest.sizeLibre || 0 } : null) : latest),
};
const LINUX = {
  async info() {
    const i = await desk('update-info');
    return { versionName: i.version, versionCode: versionCode(i.version), updater: true, source: i.source, repo: i.repo };
  },
  fetchText: (url) => http({ url }),
  pick: (latest) => (latest.linux ? { ...latest, size: latest.sizeLinux || 0 } : null),
};
const platform = () => (hasPlugin('LidaApp') ? ANDROID : LINUX);

// Procura versão nova. manual: ignora o intervalo de um dia e a versão pulada, e avisa quando não há.
export async function checkUpdate({ manual = false } = {}) {
  if (!updaterAvailable()) return null;
  const st = ls.get();
  if (!manual && Date.now() - (st.at || 0) < DAY) return null;
  const P = platform();
  try {
    const info = await P.info();
    if (!info.updater) {
      if (manual) toast('Nesta versão, as atualizações chegam pela loja (F-Droid).');
      return null;
    }
    const res = await P.fetchText(LATEST_URL);
    ls.set({ at: Date.now() });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    // A Libre baixa o APK dela (outro id, sem nada do Google); o Linux, o pacote dele.
    const latest = P.pick(JSON.parse(res.text), info);
    if (!latest) {
      if (manual) toast(`Você está na versão mais nova (${info.versionName || app.version}).`);
      return null;
    }
    const newer = Number(latest.versionCode || versionCode(latest.version)) > Number(info.versionCode || 0);
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

const fmtSize = (b) => (b ? `${(b / 1048576).toLocaleString(LOC, { maximumFractionDigits: 1 })} MB` : '');
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
      ${info.source === 'git' ? `<div class="upd-git"><p class="hint">Você instalou pelo repositório (git). Para atualizar, no terminal:</p><pre><code>lida fechar
cd ${esc(info.repo || '~/projetos/lida')}
git pull
./desktop/install.sh
lida-desktop &amp;</code></pre></div>` : ''}
      <div class="upd-prog" data-prog hidden><div class="bar"><i data-pbar style="width:0%"></i></div><small data-ptext>Baixando…</small></div>
      <p class="hint" data-unote hidden></p>
      <div class="sheet-actions upd-actions">
        <button type="button" class="btn ghost" data-skip>Pular esta versão</button>
        <button type="button" class="btn ghost" data-later>Depois</button>
        ${info.source === 'git' ? '' : `<button type="button" class="btn primary" data-go>${icon('download')}Atualizar agora</button>`}
      </div>
    </div>`,
    onMount(el, close) {
      const go = el.querySelector('[data-go]');
      const note = el.querySelector('[data-unote]');
      const prog = el.querySelector('[data-prog]');
      const say = (t) => ((note.hidden = !t), (note.textContent = t || ''));
      el.querySelector('[data-later]').onclick = close;
      el.querySelector('[data-skip]').onclick = () => (ls.set({ skip: latest.version }), close());
      if (!go) return;
      if (!hasPlugin('LidaApp')) {
        go.onclick = () => linuxInstall(el, go, say, (f) => (stop = f));
        return;
      }
      const P = plugin('LidaApp');
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

// Linux: o app baixa o pacote, confere, roda o install.sh e reabre. Aqui só acompanha.
async function linuxInstall(el, go, say, setStop) {
  const bar = el.querySelector('[data-pbar]');
  const txt = el.querySelector('[data-ptext]');
  go.disabled = true;
  el.querySelector('[data-skip]').hidden = true;
  el.querySelector('[data-prog]').hidden = false;
  say('');
  let latest = null;
  try {
    latest = JSON.parse((await http({ url: LATEST_URL })).text);
    await desk('update-start', { url: latest.linux, sha256: latest.sha256Linux });
  } catch (e) {
    say(e?.message || 'Não consegui começar a atualização.');
    go.disabled = false;
    return;
  }
  let timer = null;
  const tick = async () => {
    let s;
    try {
      s = await desk('update-status');
    } catch {
      return;
    }
    if (s.phase === 'download') {
      const f = s.total > 0 ? s.done / s.total : 0;
      bar.style.width = `${Math.round(f * 100)}%`;
      txt.textContent = s.total > 0 ? `Baixando… ${fmtSize(s.done)} de ${fmtSize(s.total)}` : `Baixando… ${fmtSize(s.done)}`;
    } else if (s.phase === 'verify') txt.textContent = 'Conferindo o download…';
    else if (s.phase === 'install') {
      bar.style.width = '100%';
      txt.textContent = 'Instalando… (pode levar um minuto)';
    } else if (s.phase === 'done') {
      clearInterval(timer);
      txt.textContent = 'Pronto.';
      play('tick');
      say('O Lida vai fechar e abrir de novo já na versão nova.');
      setTimeout(() => desk('update-restart').catch(() => {}), 1200);
    } else if (s.phase === 'error') {
      clearInterval(timer);
      say(s.error || 'Não consegui instalar a atualização.');
      go.disabled = false;
    }
  };
  // Continua acompanhando mesmo se a folha for fechada: quando terminar, o app reabre.
  timer = setInterval(tick, 600);
  setStop(() => {});
}

// Começa a olhar por atualizações (alguns segundos depois de abrir e ao voltar para o app).
export function initUpdates() {
  if (!updaterAvailable()) return;
  setTimeout(() => checkUpdate(), 8000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkUpdate());
}
