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
import { processDays, buckets, toggleTask } from './core/tasks.js';
import { reminders } from './core/reminders.js';
import { addWater, waterGlass, waterToday, waterGoal, isScheduled, isDone } from './core/habits.js';
import { seedDemo } from './core/demo.js';
import { initSound } from './core/sound.js';
import { app, personal, P, setPref } from './state.js';
import { applyAppearance, storedAppearance, FONTS, THEMES } from './ui/theme.js';
import { icon, initTips, toast, sheet, banner } from './ui/ui.js';
import { initPickers } from './ui/pickers.js';
import { isNative, plugin, call } from './native.js';
import * as gate from './views/gate.js';
import { todayView, planView } from './views/today.js';
import { habitsView } from './views/habits.js';
import { shopView } from './views/shop.js';
import { settingsView } from './views/settings.js';
import { meView } from './views/me.js';
import { maybeShowSummaries } from './views/summary.js';
import { boardView, isBoard, BOARD_MQ } from './views/board.js';
import { glance } from './core/glance.js';
import { initDesktop, isDesktop } from './desktop.js';
import { initChartTips } from './ui/chart.js';
import { editTask, openTask } from './views/tasks.js';
import { avatar } from './views/common.js';
import { openPomodoro, initTimers, paintChip, pickFocus } from './views/focus.js';
import { openBrain } from './views/brain.js';
import { openSearch } from './views/search.js';
import { fmtInt, fmtTime } from './lib/util.js';

const VIEWS = { hoje: todayView, planejar: planView, habitos: habitsView, loja: shopView, eu: meView, ajustes: settingsView };
const NAV = [
  ['hoje', 'Hoje', 'today'],
  ['planejar', 'Planejar', 'upcoming'],
  ['habitos', 'Hábitos', 'habit'],
  ['loja', 'Loja', 'shop'],
  ['eu', 'Eu', 'user'],
];
const ORDER = [...NAV.map((n) => n[0]), 'ajustes'];
const DB_NAME = () => (app.demo ? 'lida3-demo' : 'lida3');

let current = null;
let lastTab = 'em-breve';

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
  document.documentElement.classList.toggle('is-native', isNative()); // antes da aparência (tamanho padrão)
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
  document.documentElement.classList.toggle('is-native', isNative());
  if (!app.demo) await cloud.loadConfig();
  const idb = await openDB(DB_NAME());
  app.idb = idb;
  let device = await idb.get('meta', 'device');
  if (!device) await idb.put('meta', (device = uid(6)), 'device');
  app.device = device;
  initHLC(device);

  if (app.demo) return bootDemo(idb);

  let sid = await idb.get('meta', 'sid');
  let key = null;
  let res = null;
  if (!sid) {
    if (cloud.googleAvailable()) {
      try {
        const u = await cloud.currentUser();
        if (u) res = await gate.afterGoogle(u);
      } catch {
        /* sem rede: segue para a tela inicial */
      }
    }
    if (!res && ls.get('lida.intro') !== '1') await gate.intro();
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
  if (!r) return;
  if (maybeShowSummaries(r) || !r.failed.length) return;
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
      <div class="rail-tools rail-projects" data-railproj hidden></div>
      <div class="rail-tools"><span>Ferramentas</span>
        <button type="button" data-rail-tool="pick-focus">${icon('target')}<span>Focar numa tarefa</span></button>
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
          <button type="button" class="icon-btn" data-search aria-label="Buscar (/)">${icon('search')}</button>
          <span class="sync-dot" data-dot hidden></span>
          <button type="button" class="me-btn" data-me aria-label="Ajustes e conta"></button></header>
      </div>
      <main id="view" tabindex="-1"></main>
    </div>
    <button type="button" class="fab" data-new aria-label="Adicionar tarefa">${icon('plus')}</button>`;
  document.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', newTask));
  document.querySelectorAll('[data-rail-tool]').forEach((b) => b.addEventListener('click', () => app.actions.tool(b.dataset.railTool)));
  $('[data-search]').onclick = () => openSearch();
  $('[data-me]').onclick = () => (location.hash = current === 'eu' ? 'ajustes' : 'eu');
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
  if (current === 'planejar' && planView.tab === 'projeto') return editTask(null, { projectId: planView.pid });
  editTask(null, current === 'planejar' && ['entrada', 'projetos'].includes(planView.tab) ? {} : { due: d });
}

// Rotas: #hoje, #planejar (#entrada e #em-breve abrem as abas), #habitos, #loja, #ajustes, #tarefa-<id>.
function route() {
  let h = location.hash.slice(1);
  const m = h.match(/^tarefa-(.+)$/);
  if (m) {
    history.replaceState(null, '', '#hoje');
    setTimeout(() => openTask(decodeURIComponent(m[1])), 50);
    h = 'hoje';
  }
  let changedTab = false;
  const pm = h.match(/^projeto-(.+)$/);
  if (h === 'entrada' || h === 'em-breve' || h === 'projetos' || pm) {
    const tab = pm ? 'projeto' : h;
    changedTab = planView.tab !== tab || (pm && planView.pid !== pm[1]);
    planView.tab = tab;
    if (pm) planView.pid = decodeURIComponent(pm[1]);
    h = 'planejar';
  }
  const next = VIEWS[h] ? h : 'hoje';
  const prev = current;
  const changed = next !== prev;
  current = next;
  const board = isBoard() && (current === 'hoje' || current === 'planejar');
  document.body.classList.toggle('is-board', board);
  const navKey = current === 'ajustes' ? 'eu' : board ? 'hoje' : current;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('on', a.dataset.nav === navKey);
    if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  movePill();
  const v = viewOf();
  $('[data-title]').textContent = v.title;
  // No topo: a foto leva à aba Eu; em Eu, uma engrenagem leva aos Ajustes; em Ajustes, voltar.
  const me = $('[data-me]');
  me.classList.toggle('as-icon', current === 'eu' || current === 'ajustes');
  me.innerHTML = current === 'eu' ? icon('settings') : current === 'ajustes' ? icon('back') : avatar(30);
  me.setAttribute('aria-label', current === 'eu' ? 'Ajustes' : current === 'ajustes' ? 'Voltar para Eu' : 'Abrir a aba Eu');
  document.querySelector('.fab').hidden = !['hoje', 'planejar'].includes(current) || (current === 'planejar' && planView.tab === 'projetos');
  document.title = current === 'hoje' ? 'Lida' : `${v.title} · Lida`;
  const TABS = ['em-breve', 'entrada', 'projetos', 'projeto'];
  const dir = !prev ? 'up' : changedTab && !changed ? (TABS.indexOf(planView.tab) >= TABS.indexOf(lastTab) ? 'left' : 'right') : ORDER.indexOf(next) >= ORDER.indexOf(prev) ? 'left' : 'right';
  lastTab = planView.tab;
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
// Em telas largas, Hoje e Planejar viram uma tela só (o Painel).
const viewOf = () => (document.body.classList.contains('is-board') && (current === 'hoje' || current === 'planejar') ? boardView : VIEWS[current]);

function render(animate = false) {
  const el = document.getElementById('view');
  const y = window.scrollY;
  const v = viewOf();
  $('[data-sub]').textContent = v.sub?.() || '';
  const draw = () => {
    v.render(el);
    counts();
    paintChip();
    markNew(el);
  };
  // A animação de entrada vale só para a troca de seção: redesenhos (marcar hábito, concluir
  // tarefa, sincronização) não podem reanimar a tela inteira.
  clearTimeout(render.t);
  el.classList.remove('enter', 'from-left', 'from-right', 'from-up');
  if (!animate) {
    draw();
    return window.scrollTo(0, y);
  }
  draw();
  void el.offsetWidth;
  el.classList.add('enter', `from-${animate === 'right' ? 'left' : animate === 'left' ? 'right' : 'up'}`);
  render.t = setTimeout(() => el.classList.remove('enter', 'from-left', 'from-right', 'from-up'), 900);
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
  railProjects();
}

// Na barra lateral (computador): projetos com tarefas abertas, para ir direto a cada um.
function railProjects() {
  const box = document.querySelector('[data-railproj]');
  if (!box) return;
  const S = P();
  const rows = S.project
    .filter((p) => !p.archived)
    .map((p) => ({ p, n: S.task.filter((t) => t.projectId === p.id && !t.done && !t.failed && !t.archived).length }))
    .slice(0, 8);
  box.hidden = !rows.length;
  const on = current === 'planejar' && planView.tab === 'projeto' ? planView.pid : null;
  box.innerHTML = `<span>Projetos</span>${rows.map(({ p, n }) => `<a href="#projeto-${encodeURIComponent(p.id)}" class="${on === p.id ? 'on' : ''}"><i style="background:${esc(p.color || 'var(--accent)')}"></i><span>${esc(p.name)}</span><small>${n || ''}</small></a>`).join('')}`;
}

// Ao cruzar a largura do Painel, a navegação e a tela mudam.
matchMedia(BOARD_MQ).addEventListener?.('change', () => {
  updateNavMode();
  if (current) route();
});
function updateNavMode() {
  const lbl = document.querySelector('.nav [data-nav="hoje"] > span:not(.count)');
  if (lbl) lbl.textContent = isBoard() ? 'Painel' : 'Hoje';
  document.documentElement.classList.toggle('board-wide', isBoard());
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

// Widget do Android: um resumo pronto do dia (o widget só desenha).
const updateWidget = debounce(() => {
  if (!isNative()) return;
  const S = P();
  const d = today();
  const B = buckets(S, d);
  const hs = S.habit.filter((h) => !h.archived && isScheduled(h, d));
  const hd = hs.filter((h) => isDone(S, h, d)).length;
  const L = (ml) => (ml >= 1000 ? `${(ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L` : `${ml} ml`);
  const footer = [hs.length ? `Hábitos ${hd}/${hs.length}` : '', `Água ${L(waterToday(S, d))} de ${L(waterGoal(S))}`].filter(Boolean).join('  ·  ');
  const tasks = [...B.overdue, ...B.today].slice(0, 4).map((t) => ({ t: t.title, time: t.time ? fmtTime(t.time) : '' }));
  const g = glance(S, d);
  const rings = { tasksDone: g.tasks.done, tasksTotal: g.tasks.total, habitsDone: g.habits.done, habitsTotal: g.habits.total, waterMl: g.water.ml, waterGoal: g.water.goal };
  call('LidaWidget', 'update', { data: JSON.stringify({ date: d, title: 'Hoje', done: B.doneToday.length, total: B.today.length + B.doneToday.length, tasks, footer, rings }) });
}, 1500);

// Links lida://secao (vindos do widget) abrem a seção certa.
function deepLinks() {
  const A = plugin('App');
  if (!A) return;
  const go = (url) => {
    const m = String(url || '').match(/^lida:\/\/([a-z-]+)/);
    if (m) location.hash = m[1];
  };
  A.addListener('appUrlOpen', (e) => go(e?.url));
  call('App', 'getLaunchUrl').then((r) => go(r?.url));
}

function start() {
  shell();
  updateNavMode();
  initPickers();
  initChartTips();
  app.nav = (r) => (location.hash = r);
  app.refresh = rerender;
  app.actions.reschedule = reschedule;
  window.addEventListener('hashchange', route);
  personal.subscribe(rerender);
  personal.subscribe(reschedule);
  personal.subscribe(updateWidget);
  notify.initNotify((r) => (location.hash = r), onNotifyAction, onInApp);
  reschedule();
  route();
  initTimers();
  dismissBoot();
  call('SplashScreen', 'hide');
  nativeBack();
  keyboard();
  deepLinks();
  updateWidget();
  initDesktop();
  runDay();

  // Virada do dia com o app aberto: fecha o dia anterior, redesenha e reagenda.
  let day = today();
  const tickDay = () => {
    if (today() === day) return;
    day = today();
    runDay();
    render(false);
    reschedule();
    updateWidget();
  };
  setInterval(tickDay, 60000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && tickDay());

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !document.body.classList.contains('has-sheet')) {
      e.preventDefault();
      return openSearch();
    }
    if (e.ctrlKey || e.metaKey || e.altKey || document.body.classList.contains('has-sheet') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (e.key === 'q' || e.key === 'n') {
      e.preventDefault();
      newTask();
    } else if (e.key === 'p') app.actions.tool('focus');
    else if (e.key === 'b') app.actions.tool('brain');
    else if (e.key === '/') {
      e.preventDefault();
      openSearch();
    }
    else if (/^[1-5]$/.test(e.key)) location.hash = ORDER[Number(e.key) - 1];
  });
}

// Botões das notificações.
async function onNotifyAction(action, extra = {}) {
  const t = extra.taskId ? P().byId.get(extra.taskId) : null;
  if (action === 'done' && t) {
    if (!t.done) {
      const res = await toggleTask(t.id);
      toast(res?.reward?.xp ? `"${t.title}" concluída · +${res.reward.xp} XP` : `"${t.title}" concluída`);
    }
  } else if (action === 'snooze' && t) {
    await notify.scheduleOne({ key: `snooze:${t.id}`, at: Date.now() + 3600000, title: t.title, body: 'Lembrete adiado em 1 hora', summary: 'Tarefas', actions: 'TASK', route: `tarefa-${t.id}`, extra: { taskId: t.id } });
    toast('Vou lembrar de novo em 1 hora.');
  } else if (action === 'water') {
    const ml = waterGlass(); // botão da notificação: um copo
    await addWater(ml);
    toast(`+${ml} ml registrados.`);
  }
}

// Lembrete que chegou com o Lida aberto: aviso no topo com os mesmos botões da notificação.
function onInApp(w) {
  const go = w.route ? () => (location.hash = w.route) : undefined;
  const ic = w.actions === 'WATER' ? 'water' : w.route === 'habitos' ? 'habit' : w.actions === 'TASK' ? 'check' : 'bell';
  const actions =
    w.actions === 'TASK'
      ? [
          { label: 'Concluir', primary: true, onClick: () => onNotifyAction('done', w.extra) },
          { label: 'Daqui a 1 h', onClick: () => onNotifyAction('snooze', w.extra) },
        ]
      : w.actions === 'WATER'
        ? [{ label: 'Bebi um copo', primary: true, onClick: () => onNotifyAction('water', w.extra) }]
        : go
          ? [{ label: 'Abrir', onClick: go }]
          : [];
  banner({ title: w.title, body: w.body, icon: ic, actions, onOpen: go });
}

// Teclado: com ele aberto, a barra de navegação e o botão + saem do caminho e o campo em foco
// vai para o meio da área visível. No APK, o plugin Keyboard avisa e redimensiona a tela
// (resizeOnFullScreen); na web, a área visível (visualViewport) diz se o teclado está aberto.
const isText = (el) => !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit', 'hidden'].includes(el.type)) || el.isContentEditable);
function keyboard() {
  const set = (open) => document.body.classList.toggle('kb-open', open);
  const K = plugin('Keyboard');
  if (K) {
    K.addListener('keyboardWillShow', () => set(true));
    K.addListener('keyboardWillHide', () => set(false));
  } else if (window.visualViewport) {
    let full = window.innerHeight;
    const check = () => {
      if (!isText(document.activeElement)) full = Math.max(full, window.innerHeight, window.visualViewport.height);
      set(isText(document.activeElement) && full - window.visualViewport.height > 150);
    };
    window.visualViewport.addEventListener('resize', check);
    document.addEventListener('focusout', () => setTimeout(check, 100));
  }
  // Só rola se o campo ficou escondido atrás do teclado (rolar sem precisar faz a tela "piscar").
  document.addEventListener('focusin', (e) => {
    if (!isText(e.target) || matchMedia('(min-width: 960px)').matches) return;
    setTimeout(() => {
      const el = e.target;
      if (!el.isConnected || document.activeElement !== el) return;
      const r = el.getBoundingClientRect();
      const h = window.visualViewport?.height || window.innerHeight;
      if (r.top < 70 || r.bottom > h - 12) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 400);
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
    if (t === 'pick-focus') pickFocus();
    if (t === 'brain') openBrain();
  },
  setTheme(id) {
    appearance({ ...storedAppearance(), theme: id });
    render(false);
  },
  setAppearance(patch) {
    appearance({ ...storedAppearance(), ...patch });
    render(false);
  },
  newTask: () => newTask(),
  search: () => openSearch(),
  setShowDone(on) {
    setPref('showDone', on);
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
      updateNavMode();
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
  // No app Linux os arquivos vêm do próprio app (sem cache de service worker).
  if (isNative() || isDesktop() || !('serviceWorker' in navigator) || location.protocol === 'file:') return;
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
