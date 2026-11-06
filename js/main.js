// Lida 3: entrada do app (web e Android).
import { openDB, deleteDB } from './lib/idb.js';
import { initClock, today, shiftDays, resetClock, clockOffset } from './lib/clock.js';
import { initHLC } from './lib/hlc.js';
import { createKey, changePass } from './lib/crypto.js';
import { uid, esc, $, debounce } from './lib/util.js';
import * as cloud from './core/cloud.js';
import { createSync } from './core/sync.js';
import * as legacy from './core/legacy.js';
import * as notify from './core/notify.js';
import { reminders } from './core/tasks.js';
import { seedDemo } from './core/demo.js';
import { initSound } from './core/sound.js';
import { app, personal, P } from './state.js';
import { applyAppearance, storedAppearance, FONTS, THEMES } from './ui/theme.js';
import { icon, initTips, toast, sheet } from './ui/ui.js';
import { initPickers } from './ui/pickers.js';
import { isNative, plugin, call } from './native.js';
import * as gate from './views/gate.js';
import { todayView, inboxView, upcomingView } from './views/today.js';
import { settingsView } from './views/settings.js';
import { editTask } from './views/tasks.js';
import { avatar } from './views/common.js';
import { buckets } from './core/tasks.js';

const VIEWS = { hoje: todayView, entrada: inboxView, 'em-breve': upcomingView, ajustes: settingsView };
const NAV = [
  ['hoje', 'Hoje', 'today'],
  ['entrada', 'Entrada', 'inbox'],
  ['em-breve', 'Em breve', 'upcoming'],
  ['ajustes', 'Ajustes', 'settings'],
];
const DB_NAME = () => (app.demo ? 'lida3-demo' : 'lida3');

let current = null;

const ls = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sem armazenamento */
    }
  },
};

function appearance(a = storedAppearance()) {
  const r = applyAppearance(a);
  if (isNative()) {
    call('StatusBar', 'setStyle', { style: r.scheme === 'dark' ? 'DARK' : 'LIGHT' });
    call('StatusBar', 'setBackgroundColor', { color: r.bg });
  }
  return r;
}
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
  if (storedAppearance().theme === 'sistema') appearance();
});

async function boot() {
  appearance();
  initTips();
  initSound();
  const inv = location.hash.match(/^#convite=([^&]+)/);
  if (inv) {
    sessionStorage.setItem('lida.invite', decodeURIComponent(inv[1]));
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (!window.isSecureContext || !crypto.subtle) throw new Error('o Lida precisa ser aberto por HTTPS ou por localhost: endereços como http://192.168… não liberam a criptografia do navegador.');
  registerSW();
  app.demo = ls.get('lida.demo') === '1';
  initClock(app.demo);
  document.documentElement.classList.toggle('is-demo', app.demo);
  if (!app.demo) await cloud.loadConfig();
  const idb = await openDB(DB_NAME());
  app.idb = idb;
  let device = await idb.get('meta', 'device');
  if (!device) await idb.put('meta', (device = uid(6)), 'device');
  initHLC(device);

  if (app.demo) return bootDemo(idb);

  let sid = await idb.get('meta', 'sid');
  let key = null;
  let res = null;
  if (!sid) {
    if (cloud.cloudConfigured() && !isNative()) {
      try {
        const u = await cloud.currentUser();
        if (u) res = await gate.afterGoogle(u);
      } catch {
        /* sem rede: segue para a tela inicial */
      }
    }
    res ||= await gate.welcome();
    ({ sid, key } = res);
    Object.assign(app, { sid, wrap: res.wrap, mode: res.mode, me: res.uid, user: res.user || null });
    for (const [k, v] of Object.entries({ sid, wrap: res.wrap, mode: res.mode, uid: res.uid })) await idb.put('meta', v, k);
    if (ls.get('lida.requirePass') !== '1') await idb.put('meta', key, 'key');
  } else {
    Object.assign(app, { sid, wrap: await idb.get('meta', 'wrap'), mode: await idb.get('meta', 'mode'), me: await idb.get('meta', 'uid') });
    if (ls.get('lida.requirePass') !== '1') key = await idb.get('meta', 'key');
    if (!key) key = await gate.unlock(app.wrap);
  }
  app.key = key;
  personal.setMe(app.me);
  const opened = await personal.init(idb, key);
  if (res?.legacy) await importLegacy(res.legacy);
  if (app.mode === 'cloud') await startCloud(idb);
  gate.closeGate();
  start();
  if (opened.rejected) toast(`${opened.rejected} registros com falha de integridade foram descartados${app.mode === 'cloud' ? ' e serão baixados de novo' : ''}.`);
}

async function importLegacy(L) {
  gate.loading('Trazendo seus dados do Lida anterior…');
  const recs = legacy.toRecords(L);
  await personal.importPlain(legacy.toPlain(recs, app.me));
  // Tema e fonte que a pessoa usava, se ainda existirem.
  const p = recs.find((r) => r.type === 'prefs')?.data || {};
  const a = storedAppearance();
  appearance({ ...a, theme: THEMES[p.theme] ? p.theme : a.theme, font: FONTS[p.font] ? p.font : a.font });
  setTimeout(() => toast(`Pronto: ${recs.filter((r) => r.type === 'task').length} tarefas trazidas do Lida anterior.`, { ms: 5000 }), 800);
}

async function startCloud(idb) {
  try {
    let user = await cloud.currentUser();
    if (!user) {
      gate.closeGate();
      user = await gate.signInAgain();
      if (!user) return; // segue sem sincronizar nesta sessão
    }
    if (user.uid !== app.me) return toast('Esta conta Google é diferente da usada neste aparelho.');
    app.user = user;
    app.sync = createSync(personal, { sid: app.sid, uid: app.me, idb });
    await app.sync.start();
  } catch {
    // Sem rede ou SDK indisponível: segue offline com os dados do aparelho.
  }
}

async function bootDemo(idb) {
  let key = await idb.get('meta', 'key');
  if (!key) {
    ({ key } = await createKey(uid(24)));
    await idb.put('meta', key, 'key');
  }
  Object.assign(app, { sid: 'demo', mode: 'local', me: 'local', key });
  personal.setMe('local');
  await personal.init(idb, key);
  if (!personal.list('task').length) await seedDemo();
  start();
}

/* ---------- Casca ---------- */
function shell() {
  document.getElementById('app').innerHTML = `
    <nav class="nav" aria-label="Seções">
      <a class="brand" href="#hoje"><img src="icons/pwa-192x192.png" alt="" width="28" height="28"><span>Lida</span></a>
      ${NAV.map(([id, label, ic]) => `<a href="#${id}" data-nav="${id}">${icon(ic)}<span>${label}</span><span class="count" data-count="${id}"></span></a>`).join('')}
      <button type="button" class="nav-new" data-new>${icon('plus')}<span>Adicionar tarefa</span></button>
    </nav>
    <div class="main-col">
      <div class="head">
        ${app.demo ? `<div class="testbar" data-demobar></div>` : ''}
        <header class="topbar"><h1><span data-title></span><span class="sub" data-sub></span></h1><span class="sync-dot" data-dot hidden></span><button type="button" class="me-btn" data-me aria-label="Ajustes e conta"></button></header>
      </div>
      <main id="view" tabindex="-1"></main>
    </div>
    <button type="button" class="fab" data-new aria-label="Adicionar tarefa">${icon('plus')}</button>`;
  document.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', newTask));
  $('[data-me]').onclick = () => (location.hash = 'ajustes');
  if (app.sync) {
    const dot = $('[data-dot]');
    dot.hidden = false;
    const L = { synced: 'Sincronizado', syncing: 'Sincronizando', offline: 'Sem conexão: as alterações ficam salvas e sobem quando a internet voltar', error: 'Erro ao sincronizar', denied: 'Sem acesso aos dados na nuvem', local: 'Somente neste aparelho' };
    app.sync.onStatus((s) => {
      dot.dataset.s = s;
      dot.title = L[s] || '';
      dot.setAttribute('aria-label', L[s] || '');
    });
  }
  if (app.demo) demobar();
}

function newTask() {
  const d = today();
  editTask(null, current === 'entrada' ? {} : { due: d });
}

function route() {
  const h = location.hash.slice(1);
  const m = h.match(/^tarefa-(.+)$/);
  if (m) {
    history.replaceState(null, '', '#hoje');
    setTimeout(() => editTask(decodeURIComponent(m[1])), 50);
  }
  const next = VIEWS[h] ? h : 'hoje';
  const changed = next !== current;
  current = next;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('on', a.dataset.nav === current);
    if (a.dataset.nav === current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const v = VIEWS[current];
  $('[data-title]').textContent = v.title;
  $('[data-me]').hidden = current === 'ajustes';
  $('[data-me]').innerHTML = avatar(30);
  document.querySelector('.fab').hidden = current === 'ajustes';
  document.title = current === 'hoje' ? 'Lida' : `${v.title} · Lida`;
  render(changed);
  if (changed) window.scrollTo(0, 0);
}

function render(animate = false) {
  const el = document.getElementById('view');
  const y = window.scrollY;
  const v = VIEWS[current];
  $('[data-sub]').textContent = v.sub?.() || '';
  v.render(el);
  counts();
  if (animate) {
    el.classList.remove('enter');
    void el.offsetWidth;
    el.classList.add('enter');
  } else window.scrollTo(0, y);
}

// Contadores no trilho lateral (computador).
function counts() {
  const B = buckets(P());
  const set = (id, n) => {
    const c = document.querySelector(`[data-count="${id}"]`);
    if (c) c.textContent = n || '';
  };
  set('hoje', B.today.length + B.overdue.length);
  set('entrada', B.inbox.length);
}

const rerender = (() => {
  let raf = 0;
  return () => {
    cancelAnimationFrame(raf);
    // Enquanto a animação de concluir roda, a lista não é redesenhada.
    raf = requestAnimationFrame(() => (app.hold ? null : render(false)));
  };
})();

// Agenda os lembretes de novo sempre que algo muda (só a diferença vai para o sistema).
const reschedule = debounce(() => notify.reconcile(reminders(P(), notify.notifyPrefs())).catch(() => {}), 1200);

function start() {
  shell();
  initPickers();
  app.nav = (r) => (location.hash = r);
  app.refresh = rerender;
  app.actions.reschedule = reschedule;
  window.addEventListener('hashchange', route);
  personal.subscribe(rerender);
  personal.subscribe(reschedule);
  notify.initNotify((r) => (location.hash = r));
  reschedule();
  route();
  call('SplashScreen', 'hide');
  nativeBack();

  // Virada do dia com o app aberto: redesenha e reagenda.
  let day = today();
  const tickDay = () => {
    if (today() === day) return;
    day = today();
    render(false);
    reschedule();
  };
  setInterval(tickDay, 60000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tickDay());

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'q' || e.key === 'n') && !e.ctrlKey && !e.metaKey && !e.altKey && !document.body.classList.contains('has-sheet') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) {
      e.preventDefault();
      newTask();
    }
  });
}

// Botão "voltar" do Android: fecha o painel aberto, depois volta à tela Hoje, depois sai.
function nativeBack() {
  const A = plugin('App');
  if (!A) return;
  A.addListener('backButton', () => {
    const open = document.querySelector('.sheet-wrap.open, .pop-wrap.open, .reward-wrap.open');
    if (open) return document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    if (current !== 'hoje') return (location.hash = 'hoje');
    A.exitApp();
  });
}

/* ---------- Barra do modo demo ---------- */
function demobar() {
  const bar = $('[data-demobar]');
  const draw = () => {
    const off = clockOffset();
    bar.innerHTML = `<span class="tb-label">${icon('flask')}Demo<b>${off ? `relógio ${off > 0 ? '+' : ''}${off} dia${Math.abs(off) > 1 ? 's' : ''}` : 'dados de exemplo'}</b></span>
      <div class="tb-actions">
        <button type="button" data-next>Avançar um dia</button>
        ${off ? '<button type="button" data-now>Voltar para hoje</button>' : ''}
        <button type="button" data-reset>Recomeçar</button>
      </div>`;
    bar.querySelector('[data-next]').onclick = () => {
      shiftDays(1);
      draw();
      render(false);
      toast(`Agora é ${today().split('-').reverse().join('/')}`);
    };
    bar.querySelector('[data-now]')?.addEventListener('click', () => {
      resetClock();
      draw();
      render(false);
    });
    bar.querySelector('[data-reset]').onclick = () => app.actions.resetDemo();
  };
  draw();
}

/* ---------- Ações globais ---------- */
Object.assign(app.actions, {
  async connectGoogle() {
    try {
      const user = await cloud.signIn();
      if (!user) return;
      const profile = await cloud.getProfile(user.uid);
      if (profile?.personal && profile.personal !== app.sid) {
        const ok = await new Promise((resolve) => {
          let r = false;
          sheet({
            title: 'Conta já usada no Lida',
            body: `<p class="sheet-text">Esta conta Google já tem dados no Lida 3. Entrar nela substitui o que está neste aparelho.</p>
              <div class="sheet-actions"><button type="button" class="btn ghost" data-no>Cancelar</button><button type="button" class="btn danger" data-yes>Usar os dados da conta</button></div>`,
            onMount(el, close) {
              el.querySelector('[data-no]').onclick = close;
              el.querySelector('[data-yes]').onclick = () => ((r = true), close());
            },
            onClose: () => resolve(r),
          });
        });
        if (!ok) return cloud.signOut();
        app.idb.close?.();
        await deleteDB(DB_NAME());
        location.reload();
        return;
      }
      if (!profile?.personal) await cloud.createSpace(app.sid, app.wrap, user.uid, { kind: 'personal' });
      Object.assign(app, { mode: 'cloud', me: user.uid, user });
      await personal.claimLocal(user.uid);
      for (const [k, v] of Object.entries({ mode: 'cloud', uid: user.uid })) await app.idb.put('meta', v, k);
      app.sync = createSync(personal, { sid: app.sid, uid: app.me, idb: app.idb });
      await app.sync.start();
      toast('Conta conectada. Seus dados estão sendo enviados, já cifrados.');
      shell();
      route();
    } catch (e) {
      toast('Não foi possível conectar: ' + (e.message || e.code));
    }
  },
  async signOut() {
    app.sync?.stop();
    await cloud.signOut();
    await notify.reconcile([]);
    app.idb.close();
    await deleteDB(DB_NAME());
    location.hash = '';
    location.reload();
  },
  async lock() {
    await app.idb.del('meta', 'key');
    location.reload();
  },
  async setRequirePass(on) {
    ls.set('lida.requirePass', on ? '1' : '0');
    if (on) await app.idb.del('meta', 'key');
    else await app.idb.put('meta', app.key, 'key');
    toast(on ? 'A senha será pedida sempre que o Lida abrir' : 'Este aparelho abre o Lida sem pedir a senha');
  },
  changePass() {
    sheet({
      title: 'Alterar senha',
      body: `<form class="form" data-f>
        <label class="field"><span>Senha atual</span><input name="a" type="password" required autocomplete="current-password"></label>
        <label class="field"><span>Nova senha</span><input name="b" type="password" minlength="8" required autocomplete="new-password"></label>
        <label class="field"><span>Repita a nova senha</span><input name="c" type="password" required autocomplete="new-password"></label>
        <p class="form-meta">${app.mode === 'cloud' ? 'Use a nova senha ao entrar num aparelho novo. Os aparelhos já abertos continuam funcionando.' : 'A senha protege os dados guardados neste aparelho.'}</p>
        <div class="sheet-actions"><span></span><button class="btn primary">Alterar senha</button></div></form>`,
      onMount(el, close) {
        el.querySelector('[data-f]').onsubmit = async (e) => {
          e.preventDefault();
          const f = e.target;
          if (f.b.value !== f.c.value) return toast('As senhas novas não conferem.');
          try {
            const wrap = await changePass(f.a.value, f.b.value, app.wrap);
            if (app.mode === 'cloud') await cloud.updateWrap(app.sid, wrap);
            app.wrap = wrap;
            await app.idb.put('meta', wrap, 'wrap');
            close();
            toast('Senha alterada');
          } catch (ex) {
            toast(ex.code === 'bad-pass' ? 'A senha atual não confere.' : 'Não foi possível alterar. Verifique a conexão.');
          }
        };
      },
    });
  },
  toggleDemo() {
    ls.set('lida.demo', app.demo ? '0' : '1');
    location.hash = '';
    location.reload();
  },
  async resetDemo() {
    resetClock();
    app.idb.close();
    await deleteDB('lida3-demo');
    location.hash = '';
    location.reload();
  },
});

/* ---------- Service worker (só na web) ---------- */
function registerSW() {
  if (isNative() || !('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker
    .register('sw.js')
    .then((reg) => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Nova versão do Lida disponível', { action: 'Atualizar', onAction: () => w.postMessage('skip'), ms: 8000 });
        });
      });
    })
    .catch(() => {});
  let reloaded = !navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}

boot().catch((e) => {
  console.error(e);
  const g = document.getElementById('gate');
  g.hidden = false;
  g.innerHTML = `<div class="gate-card"><h1>Lida</h1><p class="gate-lead">Não foi possível abrir o app: ${esc(e.message || e)}</p><button class="btn primary wide" onclick="location.reload()">Tentar de novo</button></div>`;
});
