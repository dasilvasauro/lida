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
import { reminders, processDays, buckets } from './core/tasks.js';
import { seedDemo } from './core/demo.js';
import { initSound } from './core/sound.js';
import { app, personal, P } from './state.js';
import { applyAppearance, storedAppearance, FONTS, THEMES } from './ui/theme.js';
import { icon, initTips, toast, sheet } from './ui/ui.js';
import { initPickers } from './ui/pickers.js';
import { isNative, plugin, call } from './native.js';
import * as gate from './views/gate.js';
import { todayView, planView } from './views/today.js';
import { habitsView } from './views/habits.js';
import { shopView } from './views/shop.js';
import { settingsView } from './views/settings.js';
import { editTask } from './views/tasks.js';
import { avatar } from './views/common.js';
import { openPomodoro, initTimers, paintChip } from './views/focus.js';
import { openBrain } from './views/brain.js';
import { fmtInt } from './lib/util.js';

const VIEWS = { hoje: todayView, planejar: planView, habitos: habitsView, loja: shopView, ajustes: settingsView };
const NAV = [
  ['hoje', 'Hoje', 'today'],
  ['planejar', 'Planejar', 'upcoming'],
  ['habitos', 'Hábitos', 'habit'],
  ['loja', 'Loja', 'shop'],
  ['ajustes', 'Ajustes', 'settings'],
];
const ORDER = NAV.map((n) => n[0]);
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

// Antes de fechar os dias anteriores, espera a primeira sincronização (até 8 s): uma tarefa
// concluída em outro aparelho não deve ser marcada como vencida aqui.
function firstSync() {
  if (!app.sync) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(done, 8000);
    let off = () => {};
    function done() {
      clearTimeout(t);
      setTimeout(() => off(), 0);
      resolve();
    }
    off = app.sync.onStatus((st) => ['synced', 'offline', 'error', 'denied'].includes(st) && done());
  });
}

async function runDay() {
  await firstSync();
  const r = await processDays().catch((e) => (console.warn('Virada do dia', e), null));
  if (!r || !r.failed.length) return;
  const n = r.failed.length;
  const lost = r.penalty.xp || r.penalty.gold ? ` (${fmtInt(r.penalty.xp)} XP, ${fmtInt(r.penalty.gold)} de ouro)` : '';
  setTimeout(() => toast(`${n === 1 ? 'Uma tarefa venceu' : `${n} tarefas venceram`} desde a última visita${lost}.`, { ms: 6000 }), 900);
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
      <span class="nav-pill" aria-hidden="true"></span>
      <div class="rail-tools"><span>Ferramentas</span>
        <button type="button" data-rail-tool="focus">${icon('timer')}<span>Pomodoro</span></button>
        <button type="button" data-rail-tool="brain">${icon('brain')}<span>Esvaziar a mente</span></button>
      </div>
      <button type="button" class="nav-new" data-new>${icon('plus')}<span>Adicionar tarefa</span></button>
    </nav>
    <div class="main-col">
      <div class="head">
        ${app.demo ? `<div class="testbar" data-demobar></div>` : ''}
        <header class="topbar"><h1><span data-title></span><span class="sub" data-sub></span></h1>
          <button type="button" class="timer-chip" data-timer-chip hidden></button>
          <span class="sync-dot" data-dot hidden></span>
          <button type="button" class="me-btn" data-me aria-label="Ajustes e conta"></button></header>
      </div>
      <main id="view" tabindex="-1"></main>
    </div>
    <button type="button" class="fab" data-new aria-label="Adicionar tarefa">${icon('plus')}</button>`;
  document.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', newTask));
  document.querySelectorAll('[data-rail-tool]').forEach((b) => b.addEventListener('click', () => app.actions.tool(b.dataset.railTool)));
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
  editTask(null, current === 'planejar' && planView.tab === 'entrada' ? {} : { due: d });
}

// Rotas: #hoje, #planejar (#entrada e #em-breve abrem as abas), #habitos, #loja, #ajustes, #tarefa-<id>.
function route() {
  let h = location.hash.slice(1);
  const m = h.match(/^tarefa-(.+)$/);
  if (m) {
    history.replaceState(null, '', '#hoje');
    setTimeout(() => editTask(decodeURIComponent(m[1])), 50);
    h = 'hoje';
  }
  let changedTab = false;
  if (h === 'entrada' || h === 'em-breve') {
    changedTab = planView.tab !== h;
    planView.tab = h;
    h = 'planejar';
  }
  const next = VIEWS[h] ? h : 'hoje';
  const prev = current;
  const changed = next !== prev;
  current = next;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('on', a.dataset.nav === current);
    if (a.dataset.nav === current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  movePill();
  const v = VIEWS[current];
  $('[data-title]').textContent = v.title;
  $('[data-me]').hidden = current === 'ajustes';
  $('[data-me]').innerHTML = avatar(30);
  document.querySelector('.fab').hidden = !['hoje', 'planejar'].includes(current);
  document.title = current === 'hoje' ? 'Lida' : `${v.title} · Lida`;
  const dir = !prev ? 'up' : changedTab && !changed ? (planView.tab === 'entrada' ? 'left' : 'right') : ORDER.indexOf(next) >= ORDER.indexOf(prev) ? 'left' : 'right';
  render(changed || changedTab ? dir : false);
  if (changed) window.scrollTo(0, 0);
}

// Indicador da seção ativa na barra de baixo (desliza até o item).
function movePill() {
  const pill = document.querySelector('.nav-pill');
  const on = document.querySelector('.nav [data-nav].on');
  if (!pill || !on) return;
  const nav = on.parentElement.getBoundingClientRect();
  const r = on.getBoundingClientRect();
  pill.style.setProperty('--x', `${r.left - nav.left + r.width / 2}px`);
  pill.style.setProperty('--y', `${r.top - nav.top}px`);
  pill.style.setProperty('--h', `${r.height}px`);
}
window.addEventListener('resize', () => movePill());

// animate: false | 'up' (entrada) | 'left' | 'right' (direção da troca de seção).
function render(animate = false) {
  const el = document.getElementById('view');
  const y = window.scrollY;
  const v = VIEWS[current];
  $('[data-sub]').textContent = v.sub?.() || '';
  const draw = () => {
    v.render(el);
    counts();
    paintChip();
    markNew(el);
  };
  if (!animate) {
    draw();
    return window.scrollTo(0, y);
  }
  el.classList.remove('enter', 'from-left', 'from-right', 'from-up');
  draw();
  void el.offsetWidth;
  el.classList.add('enter', `from-${animate === 'right' ? 'left' : animate === 'left' ? 'right' : 'up'}`);
}

// A tarefa recém-criada entra com uma animação própria.
function markNew(el) {
  if (!app.lastAdded) return;
  const li = el.querySelector(`.task[data-id="${CSS.escape(app.lastAdded)}"]`);
  app.lastAdded = null;
  li?.classList.add('is-new');
}

// Contadores no trilho lateral (computador).
function counts() {
  const B = buckets(P());
  const set = (id, n) => {
    const c = document.querySelector(`[data-count="${id}"]`);
    if (c) c.textContent = n || '';
  };
  set('hoje', B.today.length + B.overdue.length);
  set('planejar', B.inbox.length);
}

const rerender = (() => {
  let raf = 0;
  return () => {
    cancelAnimationFrame(raf);
    // Enquanto uma animação de concluir roda, a lista não é redesenhada.
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
  initTimers();
  dismissBoot();
  call('SplashScreen', 'hide');
  nativeBack();
  runDay();

  // Virada do dia com o app aberto: fecha o dia anterior, redesenha e reagenda.
  let day = today();
  const tickDay = () => {
    if (today() === day) return;
    day = today();
    runDay();
    render(false);
    reschedule();
  };
  setInterval(tickDay, 60000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tickDay());

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || document.body.classList.contains('has-sheet') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (e.key === 'q' || e.key === 'n') {
      e.preventDefault();
      newTask();
    } else if (e.key === 'p') app.actions.tool('focus');
    else if (e.key === 'b') app.actions.tool('brain');
    else if (/^[1-5]$/.test(e.key)) location.hash = ORDER[Number(e.key) - 1];
  });
}

// Tela de abertura (logo) some com um fade assim que o app está pronto.
function dismissBoot() {
  const b = document.getElementById('boot');
  if (!b) return;
  b.classList.add('out');
  setTimeout(() => b.remove(), 450);
}

// Botão "voltar" do Android: fecha o painel aberto, depois volta à tela Hoje, depois sai.
function nativeBack() {
  const A = plugin('App');
  if (!A) return;
  A.addListener('backButton', () => {
    const open = document.querySelector('.sheet-wrap.open, .pop-wrap.open, .reward-wrap.open, .focus-overlay.open');
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
      toast(`Agora é ${today().split('-').reverse().join('/')}`);
      runDay().then(() => render(false));
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
  tool(t) {
    if (t === 'focus') openPomodoro();
    if (t === 'brain') openBrain();
  },
  setTheme(id) {
    appearance({ ...storedAppearance(), theme: id });
    render(false);
  },
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
  document.getElementById('boot')?.remove();
  const g = document.getElementById('gate');
  g.hidden = false;
  g.innerHTML = `<div class="gate-card"><h1>Lida</h1><p class="gate-lead">Não foi possível abrir o app: ${esc(e.message || e)}</p><button class="btn primary wide" onclick="location.reload()">Tentar de novo</button></div>`;
});
