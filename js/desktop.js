// Lida para Linux: ponte entre o app (Qt/PySide6, pasta desktop/) e este código web.
//
// O app serve estes arquivos em http://localhost e injeta window.__LIDA_DESKTOP__ = { token, version }.
// - App → web: o app chama window.lidaDesktop.exec(id, comando, argumentos); a resposta volta por
//   POST em /__desktop/reply. É assim que a CLI `lida`, o menu global e a bandeja agem no Lida.
// - Web → app: o estado do dia (tarefas, foco, Pomodoro, hábitos, água, aparência) vai por POST em
//   /__desktop/state sempre que muda. O app atualiza o menu e a bandeja e grava o arquivo que os
//   widgets do Plasma leem.
// Tudo passa pelas mesmas regras do app (recompensas, punições, sincronização, cifragem).
import { P, app, personal, prefs } from './state.js';
import { buckets, toggleTask, toggleSub, removeTask, saveTask, checkTask, strip, doneDay, byDue } from './core/tasks.js';
import * as H from './core/habits.js';
import { glance } from './core/glance.js';
import { focusSummary, focusedTask } from './core/focus.js';
import { dayIPL, monthIPL, grade } from './core/ipl.js';
import { parseQuick } from './core/parse.js';
import { addFromText } from './views/tasks.js';
import { focusOn, pomoStart, pomoPause, pomoReset, pomoSkip, pomoSet, pomoState } from './views/focus.js';
import { storedAppearance, THEMES, THEME_ORDER, FONTS, FONT_ORDER, SIZES, themeName } from './ui/theme.js';
import { soundPrefs, setSoundPrefs } from './core/sound.js';
import * as notify from './core/notify.js';
import { today } from './lib/clock.js';
import { addDays, norm, ymOf, debounce } from './lib/util.js';
import { lang, locale, t as tt } from './core/i18n.js';

const D = () => window.__LIDA_DESKTOP__ || null;
export const isDesktop = () => !!D();

async function post(path, body) {
  const r = await fetch(`/__desktop/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lida-Token': D().token }, body: JSON.stringify(body ?? {}) });
  if (!r.ok) throw new Error((await r.text().catch(() => '')) || `HTTP ${r.status}`);
  return r.json().catch(() => ({}));
}

// Login com Google: o app abre o navegador do sistema (o Google não deixa entrar dentro de um
// navegador embutido) e devolve o idToken para o Firebase daqui.
export async function googleIdToken() {
  const r = await post('google', {});
  if (!r.idToken) throw new Error(r.error || 'O Google não devolveu a credencial.');
  return r.idToken;
}

/* ---------- Conversões para a CLI e os widgets ---------- */
const projName = (S, id) => (id ? S.byId.get(id)?.name || null : null);
const taskOut = (S, t) => ({
  id: t.id,
  title: t.title,
  priority: t.priority || 'P4',
  due: t.due || null,
  time: t.time || null,
  kind: t.kind || 'normal',
  project: projName(S, t.projectId),
  tags: (t.tags || []).map((id) => S.byId.get(id)?.name).filter(Boolean),
  done: !!t.done,
  failed: !!t.failed,
  doneDay: t.done ? doneDay(t) : null,
  notes: t.notes || null,
  recurring: !!t.recurrence,
  subtasks: (t.subtasks || []).map((s) => ({ id: s.id, title: s.title, done: !!s.done })),
});
const habitOut = (S, h, d = today()) => ({
  id: h.id,
  title: h.title,
  icon: h.icon || null,
  color: h.color || null,
  goal: h.goal || 1,
  count: H.logOf(S, h, d)?.count || 0,
  done: H.isDone(S, h, d),
  scheduled: H.isScheduled(h, d),
  streak: H.streak(S, h, d),
});

const isOpen = (t) => !t.done && !t.failed && !t.archived;

function resolve(list, ref, what = 'tarefa') {
  const r = String(ref ?? '').trim();
  if (!r) throw new Error(`Diga qual ${what}.`);
  const byId = list.find((x) => x.id === r);
  if (byId) return byId;
  const q = norm(r);
  const exact = list.filter((x) => norm(x.title || x.name || '') === q);
  if (exact.length === 1) return exact[0];
  const part = list.filter((x) => norm(x.title || x.name || '').includes(q));
  if (part.length === 1) return part[0];
  if (!part.length) throw new Error(/^(?=.*\d)[a-z0-9_]{10,}$/.test(r) ? `Essa ${what} não está mais disponível (concluída, excluída ou fora desta lista). Rode a lista de novo.` : `Nenhuma ${what} com "${r}".`);
  throw Object.assign(new Error(`"${r}" combina com ${part.length} ${what}s. Seja mais específico.`), { candidates: part.slice(0, 8).map((x) => ({ id: x.id, title: x.title || x.name })) });
}
const findTask = (S, ref, { open = true } = {}) =>
  resolve(
    // Rotinas entram só as de hoje (dá para focar nelas e marcar os itens pela CLI e pelo widget).
    S.task.filter((t) => !t.archived && (t.kind !== 'routine' || t.due === today()) && (!open || isOpen(t))),
    ref,
  );

function taskList(S, view, project) {
  const d = today();
  const B = buckets(S, d);
  let list;
  if (view === 'hoje') list = [...B.overdue, ...B.today];
  else if (view === 'atrasadas') list = B.overdue;
  else if (view === 'entrada') list = B.inbox;
  else if (view === 'proximos') list = B.upcoming.filter((t) => t.due <= addDays(d, 14));
  else if (view === 'feitas') list = B.doneToday;
  else if (view === 'tudo') list = S.task.filter((t) => isOpen(t) && t.kind !== 'routine').sort(byDue);
  else throw new Error(`Lista desconhecida: ${view}. Use hoje, atrasadas, entrada, proximos, feitas ou tudo.`);
  if (project) {
    const p = resolve(S.project.filter((x) => !x.archived), project, 'projeto');
    list = (view === 'tudo' ? list : S.task.filter((t) => isOpen(t))).filter((t) => t.projectId === p.id).sort(byDue);
  }
  if (B.sprint && (view === 'hoje' || view === 'tudo') && !project) list = [B.sprint, ...list.filter((t) => t.id !== B.sprint.id)];
  return list.map((t) => taskOut(S, t));
}

/* ---------- Estado para o app (menu, bandeja, widgets) ---------- */
// Textos dos widgets do Plasma (vão traduzidos no estado, em txt; o widget usa o português se faltar).
const PLASMA_TEXTS = [
  'Em foco: {0}',
  'O Lida está fechado',
  'O Lida está fechado.',
  '{0} de {1} tarefas · hábitos {2}/{3} · água: {4}',
  'faltam {0}',
  'meta batida',
  'Modo foco',
  'Modo foco · pausado',
  'Pausa',
  'Pomodoro · parado',
  'Em foco há',
  'Não consegui falar com o Lida.',
  'Abra para ver o foco e as tarefas de hoje.',
  'Abrir o Lida',
  'Hoje',
  'Nova tarefa: pagar a luz amanhã 10h p1 #casa',
  'Datas, horário, p0–p4, #projeto, @etiqueta e "toda segunda" são entendidos.',
  'Concluir',
  'Nada em foco. Passe o mouse numa tarefa e toque no alvo.',
  'Atrasadas',
  'Entrada',
  'atrasada',
  '{0}/{1} subtarefas',
  'Parar foco',
  'Focar nesta tarefa',
  'Faltam {0} de água',
  'Meta de água batida',
  'Copo',
  'Garrafa',
  'Concluindo…',
  'Adicionando…',
  'Lida · Anéis',
  'Tarefas',
  'Hábitos',
  'Água',
  'IPL de hoje: {0}',
];
const plasmaTexts = () => (lang() === 'pt' ? {} : Object.fromEntries(PLASMA_TEXTS.map((k) => [k, tt(k)])));

function stateNow() {
  const S = P();
  const d = today();
  const g = glance(S, d);
  const B = buckets(S, d);
  const a = storedAppearance();
  const np = notify.notifyPrefs();
  const ipl = dayIPL(S, d, { live: true });
  return {
    v: 1,
    at: Date.now(),
    date: d,
    lang: lang(),
    locale: locale(),
    txt: plasmaTexts(),
    user: app.user ? { name: app.user.displayName || '', email: app.user.email || '' } : null,
    mode: app.mode,
    glance: g,
    focus: focusSummary(S),
    today: [...B.overdue, ...B.today].slice(0, 30).map((t) => taskOut(S, t)),
    doneToday: B.doneToday.length,
    inbox: B.inbox.length,
    inboxList: B.inbox.slice(0, 15).map((t) => taskOut(S, t)),
    habits: S.habit.filter((h) => !h.archived && H.isScheduled(h, d)).map((h) => habitOut(S, h, d)),
    water: { ml: g.water.ml, goal: g.water.goal, glass: H.waterGlass(S), bottle: H.waterBottle(S) },
    ipl: ipl.score,
    money: { level: S.money.level, xp: S.money.xp, gold: S.money.gold },
    ui: {
      theme: a.theme,
      font: a.font,
      size: a.size,
      themes: THEME_ORDER.map((id) => ({ id, name: tt(themeName(id)), locked: !!THEMES[id]?.unlock && !(S.walletMeta.themes || []).includes(id) && !(THEMES[id].unlock.level && S.money.level >= THEMES[id].unlock.level) })),
      fonts: FONT_ORDER.map((id) => ({ id, name: tt(FONTS[id].name) })),
      sizes: Object.entries(SIZES).map(([id, s]) => ({ id, name: tt(s.name) })),
      sound: soundPrefs().on,
      notify: { on: np.on, tasks: np.tasks, habits: np.habits, morning: np.morning, daily: np.daily, water: np.water, inApp: np.inApp !== false },
      punish: S.prefs.punishments !== false,
      showDone: prefs().showDone,
      glass: glassOn(),
    },
  };
}
const pushState = debounce(() => post('state', stateNow()).catch(() => {}), 350);

/* ---------- Comandos ---------- */
const COMMANDS = {
  ping: () => ({ ok: true, version: app.version }),
  status: () => stateNow(),

  tasks: ({ view = 'hoje', project } = {}) => ({ view, tasks: taskList(P(), view, project) }),
  projects: () => {
    const S = P();
    return S.project.filter((p) => !p.archived).map((p) => ({ id: p.id, name: p.name, open: S.task.filter((t) => t.projectId === p.id && isOpen(t)).length, done: S.task.filter((t) => t.projectId === p.id && t.done).length }));
  },
  search: ({ q }) => {
    const S = P();
    const n = norm(q || '');
    return S.task.filter((t) => !t.archived && (norm(t.title).includes(n) || norm(t.notes || '').includes(n))).slice(0, 40).map((t) => taskOut(S, t));
  },

  add: async ({ text, due, project, priority }) => {
    const S = P();
    const defaults = {};
    if (due) {
      const r = parseQuick(`x ${due}`, { today: today(), projects: [], tags: [] });
      if (!r.due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new Error(`Data não entendida: ${due}`);
      defaults.due = r.due || due;
      if (r.time) defaults.time = r.time;
    }
    if (project) defaults.projectId = resolve(S.project.filter((x) => !x.archived), project, 'projeto').id;
    if (priority) defaults.priority = /^p[0-4]$/i.test(priority) ? priority.toUpperCase() : `P${priority}`;
    const r = await addFromText(text, defaults);
    if (r.error) throw new Error(r.error);
    app.lastAdded = r.id;
    return taskOut(P(), P().byId.get(r.id));
  },
  done: async ({ ref }) => {
    const t = findTask(P(), ref);
    const r = await toggleTask(t.id);
    return { task: taskOut(P(), P().byId.get(t.id)), reward: r?.reward || null, levelUp: r?.levelUp || null };
  },
  undone: async ({ ref }) => {
    const S = P();
    const t = resolve(S.task.filter((x) => x.done && !x.archived), ref);
    await toggleTask(t.id);
    return { task: taskOut(P(), P().byId.get(t.id)) };
  },
  rm: async ({ ref }) => {
    const t = findTask(P(), ref, { open: false });
    await removeTask(t.id);
    return { removed: { id: t.id, title: t.title } };
  },
  edit: async ({ ref, title, due, time, priority, notes }) => {
    const S = P();
    const t = findTask(S, ref, { open: false });
    const data = strip(t);
    if (title) data.title = title;
    if (notes != null) data.notes = notes || undefined;
    if (priority) data.priority = /^p[0-4]$/i.test(priority) ? priority.toUpperCase() : `P${priority}`;
    if (due != null) {
      if (!due || /^(nenhuma|none|limpar)$/i.test(due)) delete data.due;
      else {
        const r = parseQuick(`x ${due}`, { today: today(), projects: [], tags: [] });
        data.due = r.due || (/^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null);
        if (!data.due) throw new Error(`Data não entendida: ${due}`);
        if (r.time && !time) data.time = r.time;
      }
    }
    if (time != null) data.time = time && !/^(nenhum|none|limpar)$/i.test(time) ? time : undefined;
    const c = checkTask(data, t.id);
    if (!c.ok) throw new Error(c.msg);
    await saveTask(t.id, data, c.consume);
    return taskOut(P(), P().byId.get(t.id));
  },
  sub: async ({ ref, n }) => {
    // "foco" (ou "focus"): a tarefa em foco, para marcar os itens dela sem saber o id.
    const t = ['foco', 'focus'].includes(String(ref).trim().toLowerCase()) ? focusedTask() || (() => { throw new Error('Nenhuma tarefa em foco.'); })() : findTask(P(), ref);
    const subs = t.subtasks || [];
    const i = Number(n) - 1;
    if (!subs[i]) throw new Error(`"${t.title}" não tem a subtarefa ${n}.`);
    await toggleSub(t.id, subs[i].id);
    return taskOut(P(), P().byId.get(t.id));
  },

  focus: async ({ ref, action } = {}) => {
    if (action === 'stop') await focusOn(null);
    else if (action === 'done') {
      const t = focusedTask();
      if (!t) throw new Error('Nenhuma tarefa em foco.');
      await focusOn(null);
      const r = await toggleTask(t.id);
      return { done: taskOut(P(), P().byId.get(t.id)), reward: r?.reward || null, focus: focusSummary(P()) };
    } else if (ref) await focusOn(findTask(P(), ref).id);
    return focusSummary(P());
  },
  pomo: async ({ action = 'status', focusMin, breakMin } = {}) => {
    if (focusMin || breakMin) pomoSet({ focusMin, breakMin });
    if (action === 'start') pomoStart();
    else if (action === 'pause') pomoPause();
    else if (action === 'toggle') (pomoState().running ? pomoPause : pomoStart)();
    else if (action === 'reset') pomoReset();
    else if (action === 'skip') pomoSkip();
    // O registro sincronizado é gravado em seguida; o estado local já é o novo.
    const st = pomoState();
    return { ...focusSummary(P()).pomo, ...st, active: st.running || st.leftSec !== (st.mode === 'focus' ? st.focusMin : st.breakMin) * 60 };
  },

  habits: () => {
    const S = P();
    return S.habit.filter((h) => !h.archived).map((h) => habitOut(S, h));
  },
  habit: async ({ ref, undo }) => {
    const S = P();
    const h = resolve(S.habit.filter((x) => !x.archived), ref, 'hábito');
    const c = H.logOf(S, h, today())?.count || 0;
    const r = undo ? await H.setCount(h, Math.max(0, c - 1)) : await H.tap(h);
    return { habit: habitOut(P(), P().byId.get(h.id)), completed: !!r.completed };
  },
  water: async ({ ml, undo }) => {
    if (undo) return { removed: await H.undoWater(), total: H.waterToday() };
    const S = P();
    const v = ml === 'copo' || ml == null ? H.waterGlass(S) : ml === 'garrafa' ? H.waterBottle(S) : Number(ml);
    if (!(v > 0 && v <= 5000)) throw new Error('Quantidade inválida. Use copo, garrafa ou um número em ml.');
    const r = await H.addWater(v);
    return { added: v, total: r.total, goal: r.goal, hit: r.hit, streak: r.streak || undefined, prize: r.streakPrize || undefined };
  },
  ipl: () => {
    const S = P();
    const d = today();
    const now = dayIPL(S, d, { live: true });
    const mo = monthIPL(S, ymOf(d));
    const days = S.score.filter((s) => s.date >= addDays(d, -14) && s.score != null).sort((a, b) => a.date.localeCompare(b.date)).map((s) => ({ date: s.date, score: s.score }));
    return { today: now.score, parts: now.parts, month: mo ? { score: mo.score, grade: mo.grade, days: mo.days.length } : null, grade: now.score != null ? grade(now.score) : null, days };
  },
  brain: async ({ text }) => {
    const lines = String(text || '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Escreva o que quer tirar da cabeça.');
    await personal.saveMany(lines.map((t) => ({ type: 'brain', data: { text: t, quadrant: 'unorganized' } })));
    return { added: lines.length };
  },

  // Interface (menu global, bandeja, atalhos do app).
  ui: async ({ action, value }) => {
    const A = app.actions;
    if (action === 'nav') app.nav(value || 'hoje');
    else if (action === 'new-task') A.newTask?.();
    else if (action === 'search') A.search?.();
    else if (action === 'tool') A.tool(value);
    else if (action === 'theme') A.setTheme(value);
    else if (action === 'font' || action === 'size') A.setAppearance?.({ [action]: value });
    else if (action === 'sound') setSoundPrefs({ on: !!value });
    else if (action === 'notify') {
      notify.setNotifyPrefs(value || {});
      A.reschedule?.();
    } else if (action === 'punish') await personal.save('prefs', { ...strip(personal.get('prefs') || {}), punishments: !!value }, 'prefs');
    else if (action === 'showDone') A.setShowDone?.(!!value);
    else if (action === 'glass') setGlass(!!value);
    A.refresh?.();
    pushState();
    return { ok: true };
  },
};

// Barra lateral translúcida (o fundo da janela fica transparente ali; o KWin desfoca o que está atrás).
export const glassOn = () => {
  try {
    return localStorage.getItem('lida.glass') === '1';
  } catch {
    return false;
  }
};
export function setGlass(on) {
  try {
    localStorage.setItem('lida.glass', on ? '1' : '0');
  } catch {
    /* sem armazenamento */
  }
  document.documentElement.classList.toggle('is-glass', !!on && isDesktop());
  pushState();
}

export function initDesktop() {
  if (!isDesktop()) return;
  document.documentElement.classList.add('is-desktop');
  document.documentElement.classList.toggle('is-glass', glassOn());
  window.lidaDesktop = {
    async exec(id, cmd, args) {
      let out;
      try {
        const f = COMMANDS[cmd];
        if (!f) throw new Error(`Comando desconhecido: ${cmd}`);
        out = { id, ok: true, data: await f(args || {}) };
      } catch (e) {
        out = { id, ok: false, error: e?.message || String(e), candidates: e?.candidates };
      }
      await post('reply', out).catch(() => {});
    },
  };
  personal.subscribe(pushState);
  // Os cronômetros mudam sem passar pelo repositório em alguns casos (pausa local): reenvia de tempo em tempo.
  setInterval(pushState, 15000);
  post('ready', { version: app.version }).catch(() => {});
  pushState();
}
