// Modelo de dados do Lida 3.
//
// Tudo é registro (ver store.js). Os tipos ficam em dois espaços:
//   pessoal       tarefas, projetos, etiquetas, rotinas, hábitos e seus registros diários, desapego,
//                 água, eventos de XP/ouro, IPL diário, humor, visão, reflexões, preferências
//   compartilhado tarefas, projetos e etiquetas que duas pessoas fazem juntas, e quem participa
//
// Princípio: o que pode ser alterado em dois aparelhos ao mesmo tempo vira registros separados,
// com ids previsíveis quando for "um por dia" (ex.: hl_<hábito>_<dia>). Assim nada se sobrepõe:
// - hábito do dia:    hl_<habitId>_<AAAA-MM-DD>  { habitId, date, count, mod }
// - água:             um registro por copo        { date, ml, at }  (soma; desfazer = excluir)
// - economia:         um evento por acontecimento { kind, xp, gold, vouchers, items, date, ref }
//                     O saldo é a soma dos eventos. Eventos com id derivado do motivo
//                     (ex.: ev_fail_<tarefa>) não contam em dobro se dois aparelhos os gerarem.
import { sum, ymOf } from '../lib/util.js';

export const PERSONAL_TYPES = ['task', 'project', 'tag', 'routine', 'habit', 'hlog', 'quit', 'water', 'ev', 'wallet', 'score', 'month', 'hist', 'mood', 'vision', 'refl', 'brain', 'prefs', 'dayp'];

export const HABIT_DAYS_ALL = [0, 1, 2, 3, 4, 5, 6];
export const SHARED_TYPES = ['task', 'project', 'tag', 'member'];

// Campos com aviso quando a alteração de uma pessoa é sobreposta pela de outra (espaço compartilhado).
export const SHARED_WATCH = {
  task: { title: 'título', notes: 'descrição', due: 'data', time: 'horário', priority: 'prioridade' },
  project: { name: 'nome do projeto' },
};

/* ---------- Tarefas ---------- */
export const PRIORITIES = [
  { id: 'P0', label: 'Prioridade 0', short: 'P0', name: 'Crítica', tone: 'p0' },
  { id: 'P1', label: 'Prioridade 1', short: 'P1', name: 'Alta', tone: 'p1' },
  { id: 'P2', label: 'Prioridade 2', short: 'P2', name: 'Média', tone: 'p2' },
  { id: 'P3', label: 'Prioridade 3', short: 'P3', name: 'Baixa', tone: 'p3' },
  { id: 'P4', label: 'Prioridade 4', short: 'P4', name: 'Sem prioridade', tone: 'p4' },
];
export const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };

export const TASK_KINDS = {
  normal: { label: 'Tarefa', icon: 'circle', hint: '' },
  timed: { label: 'Com tempo', icon: 'timer', hint: 'Tem duração definida. Toque em ▶ para entrar no modo foco com cronômetro.' },
  sprint: { label: 'Sprint', icon: 'flag', hint: 'Um objetivo maior, com etapas e data de fim. Só um sprint ativo por vez.' },
  challenge: { label: 'Desafio do dia', icon: 'bolt', hint: 'Vale só para hoje e expira à meia-noite. Um por dia.' },
  bonus: { label: 'Bônus', icon: 'gift', hint: 'Rende a recompensa normal e não pune se ficar para trás. Usa uma Tarefa Bônus do inventário.' },
  routine: { label: 'Rotina', icon: 'repeat', hint: '' },
};

export const taskOpen = (t) => !t.done && !t.failed && !t.archived;

/* ---------- Economia ---------- */
export const levelOf = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
export const xpForLevel = (level) => Math.pow(Math.max(0, level - 1), 2) * 100;

export function wallet(events) {
  let xp = 0;
  let gold = 0;
  let vouchers = 0;
  let progress = 0;
  const items = {};
  for (const e of events) {
    xp += e.xp || 0;
    gold += e.gold || 0;
    vouchers += e.vouchers || 0;
    progress += e.voucherProgress || 0;
    for (const [k, v] of Object.entries(e.items || {})) items[k] = (items[k] || 0) + v;
  }
  // Progresso de voucher: a cada 3 vira um voucher.
  const carry = Math.floor(progress / 3);
  vouchers += carry;
  progress -= carry * 3;
  return { xp, gold, vouchers, voucherProgress: progress, items, level: levelOf(xp) };
}

/* ---------- Fotografias (índices prontos para as telas) ---------- */
const byKey = (arr, k) => {
  const m = new Map();
  for (const x of arr) {
    const g = x[k];
    if (!m.has(g)) m.set(g, []);
    m.get(g).push(x);
  }
  return m;
};

export function buildPersonal(list) {
  const S = Object.fromEntries(PERSONAL_TYPES.map((t) => [t, list(t)]));
  S.byId = new Map();
  for (const t of PERSONAL_TYPES) for (const x of S[t]) S.byId.set(x.id, x);
  S.hlogByHabit = byKey(S.hlog, 'habitId');
  S.hlogMap = new Map(S.hlog.map((l) => [`${l.habitId}|${l.date}`, l]));
  S.waterByDate = byKey(S.water, 'date');
  S.evByDate = byKey(S.ev, 'date');
  S.scoreByDate = new Map(S.score.map((x) => [x.date, x]));
  S.moodByDate = new Map(S.mood.map((x) => [x.date, x.mood]));
  S.prefs = S.prefs[0] || {};
  S.walletMeta = S.wallet[0] || {};
  S.vision = S.vision[0] || null;
  S.money = wallet(S.ev);
  S.project.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  S.tag.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  S.habit.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a._ca || 0) - (b._ca || 0));
  S.routine.sort((a, b) => (a._ca || 0) - (b._ca || 0));
  S.quit.sort((a, b) => (a._ca || 0) - (b._ca || 0));
  S.brain.sort((a, b) => (a._ca || 0) - (b._ca || 0));
  return S;
}

export function buildShared(list) {
  const S = Object.fromEntries(SHARED_TYPES.map((t) => [t, list(t)]));
  S.byId = new Map();
  for (const t of SHARED_TYPES) for (const x of S[t]) S.byId.set(x.id, x);
  return S;
}

export const waterOn = (S, date) => sum(S.waterByDate.get(date) || [], (w) => w.ml || 0);
export const monthEvents = (S, ym) => S.ev.filter((e) => e.date && ymOf(e.date) === ym);

/* ---------- Títulos por nível ---------- */
// Um título novo a cada faixa. A curva de XP é a mesma do Lida anterior (nível = √(xp/100) + 1).
export const LEVEL_TITLES = [
  [1, 'Aprendiz'],
  [3, 'Iniciante'],
  [5, 'Praticante'],
  [8, 'Constante'],
  [12, 'Disciplinado'],
  [16, 'Persistente'],
  [20, 'Veterano'],
  [25, 'Especialista'],
  [30, 'Mestre'],
  [40, 'Grão-Mestre'],
  [50, 'Lenda'],
];
export function levelTitle(level) {
  let t = LEVEL_TITLES[0][1];
  for (const [min, name] of LEVEL_TITLES) if (level >= min) t = name;
  return t;
}
export const nextTitle = (level) => LEVEL_TITLES.find(([min]) => min > level) || null;

/* ---------- Eventos de uma tarefa ---------- */
export const doneEventId = (taskId) => `ev_done_${taskId}`;

/* ---------- Repetição ---------- */
// rec: { type: 'daily' | 'weekly' | 'monthly' | 'yearly', every?, weekdays?, dayOfMonth?, monthOfYear? }
// Devolve a próxima data (AAAA-MM-DD) depois de `from`.
export function nextOccurrence(from, rec) {
  if (!rec || !rec.type || rec.type === 'none') return null;
  const [y, m, d] = from.split('-').map(Number);
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const base = new Date(y, m - 1, d, 12);
  const every = Math.max(1, rec.every || 1);
  if (rec.type === 'daily') return iso(new Date(y, m - 1, d + every, 12));
  if (rec.type === 'weekly') {
    const days = [...(rec.weekdays?.length ? rec.weekdays : [base.getDay()])].sort((a, b) => a - b);
    const wd = base.getDay();
    const next = days.find((x) => x > wd);
    const add = next !== undefined ? next - wd : 7 * every - wd + days[0];
    return iso(new Date(y, m - 1, d + add, 12));
  }
  if (rec.type === 'monthly') {
    const day = rec.dayOfMonth || d;
    const last = new Date(y, m - 1 + every + 1, 0).getDate();
    return iso(new Date(y, m - 1 + every, Math.min(day, last), 12));
  }
  if (rec.type === 'yearly') {
    const mo = rec.monthOfYear ?? m - 1;
    const day = rec.dayOfMonth || d;
    const last = new Date(y + every, mo + 1, 0).getDate();
    return iso(new Date(y + every, mo, Math.min(day, last), 12));
  }
  return null;
}

const WDS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export function recurrenceLabel(rec) {
  if (!rec || !rec.type || rec.type === 'none') return '';
  const n = rec.every > 1 ? rec.every : 1;
  if (rec.type === 'daily') return n > 1 ? `A cada ${n} dias` : 'Todo dia';
  if (rec.type === 'weekly') {
    const d = [...(rec.weekdays || [])].sort((a, b) => a - b);
    if (d.length === 5 && d.join() === '1,2,3,4,5') return 'Dias úteis';
    if (d.length === 7) return 'Todo dia';
    if (n === 1 && d.length > 1) return `Toda ${d.map((x) => WDS[x]).join(', ').replace(/, ([^,]*)$/, ' e $1')}`;
    return `${n > 1 ? `A cada ${n} semanas` : 'Toda semana'}${d.length ? ` (${d.map((x) => WDS[x]).join(', ')})` : ''}`;
  }
  if (rec.type === 'monthly') return `${n > 1 ? `A cada ${n} meses` : 'Todo mês'}${rec.dayOfMonth ? `, dia ${rec.dayOfMonth}` : ''}`;
  if (rec.type === 'yearly') return 'Todo ano';
  return '';
}
