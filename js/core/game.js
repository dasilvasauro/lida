// Economia e regras de jogo do Lida: itens da loja, power-ups, bônus, marcos de nível,
// estilos de jogo (Modus Operandi) e recompensas.
//
// O saldo nunca é um número guardado: é a soma dos eventos (registros "ev"). Comprar, usar um
// item, ganhar ou perder XP é sempre um evento novo. Eventos com id derivado do motivo
// (ev_fail_<tarefa>, ev_lvl_<nível>...) não contam em dobro se dois aparelhos os gerarem.
import { personal, P } from '../state.js';
import { levelOf, xpForLevel } from './model.js';
import { today, nowMs } from '../lib/clock.js';
import { uid } from '../lib/util.js';

/* ---------- Estilos de jogo ---------- */
export const MODUS = {
  multitask: { name: 'Multitarefa', icon: 'bolt', desc: '+20% de XP e ouro em toda tarefa concluída. Para quem gosta de volume.' },
  minimalist: { name: 'Minimalista', icon: 'target', desc: '+50% em tarefas P0 e P1. Para quem foca só no essencial.' },
  punctual: { name: 'Pontual', icon: 'timer', desc: '+30% em tarefas com data. Para quem vive de prazos.' },
  ambitious: { name: 'Ambicioso', icon: 'flag', desc: '+80% em Sprints e Desafios do dia. Para quem pensa no longo prazo.' },
};
function modusMult(modus, task) {
  if (modus === 'multitask') return 1.2;
  if (modus === 'minimalist' && (task.priority === 'P0' || task.priority === 'P1')) return 1.5;
  if (modus === 'punctual' && task.due) return 1.3;
  if (modus === 'ambitious' && (task.kind === 'sprint' || task.kind === 'challenge')) return 1.8;
  return 1;
}

/* ---------- Itens ---------- */
// use: onde o item é usado. 'auto' é consumido sozinho quando a regra pede.
export const ITEMS = {
  magicDice: { name: 'Dado Mágico', icon: 'dice', cost: 370, cur: 'gold', use: 'shop', desc: 'Rola um dado e dobra a recompensa de uma tarefa aberta. Tirando 5 ou 6, escolhe uma das suas P0 ou P1.' },
  xpBoost: { name: 'Impulso de XP', icon: 'up', cost: 300, cur: 'gold', use: 'shop', desc: 'Por 24 horas, tudo o que você concluir rende de 15% a 50% a mais de XP.' },
  goldBoost: { name: 'Impulso de Ouro', icon: 'coin', cost: 300, cur: 'gold', use: 'shop', desc: 'Por 24 horas, tudo o que você concluir rende de 25% a 45% a mais de ouro.' },
  respite: { name: 'Respiro', icon: 'timer', cost: 100, cur: 'gold', use: 'task', desc: 'Empurra o horário de uma tarefa em 3 horas. Use na própria tarefa.' },
  relief: { name: 'Alívio', icon: 'plan', cost: 200, cur: 'gold', use: 'task', desc: 'Adia o prazo de uma tarefa em 1 dia, sem punição. Use na própria tarefa.' },
  extraP0: { name: 'P0 Extra', icon: 'flag', cost: 100, cur: 'gold', use: 'auto', desc: 'Libera mais uma tarefa P0 no dia. Até o nível 30, o limite é uma P0 aberta por vez.' },
  extraP1: { name: 'P1 Extra', icon: 'flag', cost: 50, cur: 'gold', use: 'auto', desc: 'Libera mais uma tarefa P1 no dia. Até o nível 40, o limite é de duas P1 abertas.' },
  bonusTask: { name: 'Tarefa Bônus', icon: 'gift', cost: 200, cur: 'gold', use: 'auto', desc: 'Permite criar uma Tarefa Bônus: rende a recompensa normal e não pune se ficar para trás.' },
  changeModus: { name: 'Novo estilo de jogo', icon: 'user', cost: 1000, cur: 'gold', use: 'auto', desc: 'Permite trocar o seu Modus Operandi uma vez, em Ajustes.' },
  extraQuitter: { name: 'Espaço no Desapego', icon: 'shield', cost: 1700, cur: 'gold', use: 'auto', desc: 'Acompanhe mais um mau hábito no Desapego. Todo mundo começa com um espaço.' },
  freeze: { name: 'Congelamento', icon: 'snow', cost: 3, cur: 'vouchers', use: 'habit', desc: 'Protege a sequência de um hábito num dia difícil. Use no cartão do hábito.' },
  dayOff: { name: 'Folga dos hábitos', icon: 'coffee', cost: 7, cur: 'vouchers', use: 'shop', desc: 'Todos os hábitos de hoje contam como feitos. Nenhuma sequência se perde.' },
  instantLuck: { name: 'Sorte instantânea', icon: 'clover', cost: 5, cur: 'vouchers', use: 'instant', desc: 'Vira uma Carta da Sorte na hora.' },
  luckyCard: { name: 'Carta da Sorte', icon: 'clover', cost: 0, cur: 'none', use: 'shop', desc: 'Pode render 100 de ouro, 200 de XP ou nada. Ganhe a cada 5 níveis (e a cada nível depois do 25).' },
};
export const SHOP_GOLD = ['magicDice', 'xpBoost', 'goldBoost', 'respite', 'relief', 'bonusTask', 'extraP0', 'extraP1', 'changeModus', 'extraQuitter'];
export const SHOP_VOUCHERS = ['freeze', 'dayOff', 'instantLuck'];

export const THEME_PRICES = { aqua: 2500, matrix: 2500, rosa: 2500, tomate: 2500, cinza: 2500, laranja: 2500 };

/* ---------- Marcos de nível ---------- */
export const MILESTONES = [
  { level: 5, text: 'Carta da Sorte', icon: 'clover' },
  { level: 10, text: 'Tema Suave', icon: 'palette' },
  { level: 15, text: '+15 vouchers', icon: 'card' },
  { level: 20, text: 'Tema Manteiga', icon: 'palette' },
  { level: 25, text: 'Uma Carta da Sorte por nível', icon: 'clover' },
  { level: 30, text: 'P0 sem limite', icon: 'flag' },
  { level: 35, text: 'Tema Marinho', icon: 'palette' },
  { level: 40, text: 'P1 sem limite', icon: 'flag' },
  { level: 50, text: 'Tema Darcula e +40 vouchers', icon: 'crown' },
];
// O que o nível `n` dá ao ser alcançado.
export function levelGift(n) {
  let cards = 0;
  if (n % 5 === 0) cards++;
  if (n >= 25) cards++;
  const vouchers = n === 15 ? 15 : n === 50 ? 40 : 0;
  return { cards, vouchers };
}

/* ---------- Saldo ---------- */
export const money = () => P().money;
export const has = (item) => (money().items[item] || 0) > 0;
export const boosts = (S = P()) => ({ xp: (S.walletMeta.xpBoostUntil || 0) > nowMs(), gold: (S.walletMeta.goldBoostUntil || 0) > nowMs(), xpUntil: S.walletMeta.xpBoostUntil || 0, goldUntil: S.walletMeta.goldBoostUntil || 0 });

const ev = (data, id = `ev_${uid(12)}`) => ({ type: 'ev', id, data: { date: today(), ...data } });

// Grava eventos e concede os presentes dos níveis alcançados. Devolve { levelUp, gifts }.
export async function commit(items) {
  const before = money().level;
  await personal.saveMany(items);
  const after = money().level;
  if (after <= before) return { levelUp: 0 };
  const gifts = [];
  let cards = 0;
  let vouchers = 0;
  for (let n = before + 1; n <= after; n++) {
    const g = levelGift(n);
    if (!g.cards && !g.vouchers) continue;
    if (personal.get(`ev_lvl_${n}`)) continue;
    cards += g.cards;
    vouchers += g.vouchers;
    gifts.push(ev({ kind: 'level', ref: String(n), vouchers: g.vouchers || undefined, items: g.cards ? { luckyCard: g.cards } : undefined }, `ev_lvl_${n}`));
  }
  if (gifts.length) await personal.saveMany(gifts);
  return { levelUp: after, cards, vouchers };
}

/* ---------- Recompensa de uma tarefa ---------- */
const BASE = { P0: [150, 50], P1: [100, 40], P2: [75, 30], P3: [50, 20], P4: [25, 10] };
const rnd = (a, b) => a + Math.random() * (b - a);

export function rewardFor(task, S = P()) {
  let xp;
  let gold;
  if (task.kind === 'routine') {
    const n = Math.max(1, (task.subtasks || []).length);
    xp = gold = Math.min(200, Math.round(50 + (n - 1) * 37.5));
  } else [xp, gold] = BASE[task.priority] || BASE.P4;
  const parts = [];
  const m = modusMult(S.prefs.modus, task);
  if (m > 1) parts.push(`${MODUS[S.prefs.modus].name} +${Math.round((m - 1) * 100)}%`);
  xp *= m;
  gold *= m;
  if (task.powerups?.dice) {
    xp *= 2;
    gold *= 2;
    parts.push('Dado Mágico ×2');
  }
  const b = boosts(S);
  if (b.xp) {
    const k = rnd(0.15, 0.5);
    xp *= 1 + k;
    parts.push(`Impulso de XP +${Math.round(k * 100)}%`);
  }
  if (b.gold) {
    const k = rnd(0.25, 0.45);
    gold *= 1 + k;
    parts.push(`Impulso de ouro +${Math.round(k * 100)}%`);
  }
  return { xp: Math.round(xp), gold: Math.round(gold), parts };
}

// Punição de uma tarefa que venceu: os mesmos valores-base, sem nunca baixar de nível.
export function penaltyFor(task, S = P()) {
  const [bx, bg] = BASE[task.priority] || BASE.P4;
  const m = S.money;
  return { xp: -Math.min(bx, Math.max(0, m.xp - xpForLevel(m.level))), gold: -Math.min(bg, Math.max(0, m.gold)) };
}

// Perde uma fração do progresso dentro do nível e do ouro (recaída no Desapego). Nunca baixa de nível.
export function xpFloorPenalty(frac, S = P()) {
  const m = S.money;
  return { xp: -Math.floor(Math.max(0, m.xp - xpForLevel(m.level)) * frac), gold: -Math.floor(Math.max(0, m.gold) * frac) };
}

/* ---------- Limites de prioridade ---------- */
// Até o nível 30, uma P0 aberta para hoje (ou sem data); até o 40, duas P1. Itens extras furam o limite.
export function priorityGate(priority, S = P(), exceptId = null) {
  const lvl = S.money.level;
  const cap = priority === 'P0' ? (lvl >= 30 ? Infinity : 1) : priority === 'P1' ? (lvl >= 40 ? Infinity : 2) : Infinity;
  if (cap === Infinity) return { ok: true };
  const d = today();
  const open = S.task.filter((t) => t.priority === priority && !t.done && !t.failed && !t.archived && (!t.due || t.due === d) && t.id !== exceptId).length;
  if (open < cap) return { ok: true };
  const item = priority === 'P0' ? 'extraP0' : 'extraP1';
  if ((S.money.items[item] || 0) > 0) return { ok: true, consume: item };
  return { ok: false, item, cap, unlock: priority === 'P0' ? 30 : 40 };
}

/* ---------- Loja ---------- */
export async function buy(id) {
  const it = ITEMS[id];
  const m = money();
  if (!it || it.cur === 'none') return { ok: false };
  if ((m[it.cur] || 0) < it.cost) return { ok: false, reason: 'saldo' };
  const items = id === 'instantLuck' ? { luckyCard: 1 } : { [id]: 1 };
  await commit([ev({ kind: 'buy', ref: id, [it.cur]: -it.cost, items })]);
  return { ok: true };
}

export async function buyTheme(id) {
  const price = THEME_PRICES[id];
  if (!price || money().gold < price) return { ok: false };
  const w = personal.get('wallet');
  const themes = [...new Set([...(w?.themes || []), id])];
  await personal.saveMany([ev({ kind: 'buy', ref: `tema:${id}`, gold: -price }), { type: 'wallet', id: 'wallet', data: { ...strip(w), themes } }]);
  return { ok: true };
}

export const useItemEvent = (item, ref, extra = {}) => ev({ kind: 'use', ref: `${item}:${ref || ''}`, items: { [item]: -1 }, ...extra });

export async function activateBoost(kind) {
  const item = kind === 'xp' ? 'xpBoost' : 'goldBoost';
  if (!has(item)) return false;
  const w = personal.get('wallet');
  const key = kind === 'xp' ? 'xpBoostUntil' : 'goldBoostUntil';
  const from = Math.max(nowMs(), w?.[key] || 0);
  await personal.saveMany([useItemEvent(item), { type: 'wallet', id: 'wallet', data: { ...strip(w), [key]: from + 24 * 3600000 } }]);
  return true;
}

// Abre uma Carta da Sorte. Devolve o prêmio: { gold } | { xp } | {}.
export async function openLuckyCard() {
  if (!has('luckyCard')) return null;
  const r = Math.random();
  const prize = r > 0.8 ? { gold: 100 } : r > 0.4 ? { xp: 200 } : {};
  const res = await commit([useItemEvent('luckyCard', '', prize)]);
  return { prize, ...res };
}

// Dado Mágico: escolhe uma tarefa aberta e dobra a recompensa dela.
export async function rollDice() {
  if (!has('magicDice')) return null;
  const open = P().task.filter((t) => !t.done && !t.failed && !t.archived && !t.powerups?.dice);
  if (!open.length) return { error: 'Nenhuma tarefa aberta para receber o dado.' };
  const roll = 1 + Math.floor(Math.random() * 6);
  const high = open.filter((t) => t.priority === 'P0' || t.priority === 'P1');
  const pool = roll >= 5 && high.length ? high : open;
  const t = pool[Math.floor(Math.random() * pool.length)];
  await personal.saveMany([useItemEvent('magicDice', t.id), { type: 'task', id: t.id, data: { ...strip(t), powerups: { ...(t.powerups || {}), dice: true } } }]);
  return { roll, task: t };
}

// Respiro (+3 h) e Alívio (+1 dia) aplicados a uma tarefa.
export async function applyTaskItem(item, task) {
  if (!has(item)) return false;
  const data = { ...strip(task), powerups: { ...(task.powerups || {}), [item]: true } };
  if (item === 'respite' && task.time) {
    const [h, m] = task.time.split(':').map(Number);
    const total = Math.min(23 * 60 + 59, h * 60 + m + 180);
    data.time = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  if (item === 'relief' && task.due) {
    const [y, mo, d] = task.due.split('-').map(Number);
    const dt = new Date(y, mo - 1, d + 1, 12);
    data.due = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }
  await personal.saveMany([useItemEvent(item, task.id), { type: 'task', id: task.id, data }]);
  return true;
}

export function strip(view) {
  if (!view) return {};
  const o = {};
  for (const [k, v] of Object.entries(view)) if (k !== 'id' && !k.startsWith('_')) o[k] = v;
  return o;
}

export const levelProgress = (m = money()) => {
  const base = xpForLevel(m.level);
  const next = xpForLevel(m.level + 1);
  return { base, next, into: m.xp - base, need: next - base, frac: (m.xp - base) / (next - base) };
};
export { levelOf };

/* ---------- Prêmio do dia (check-in diário) ---------- */
// Ciclo de 7 dias: o prêmio cresce a cada dia seguido e o maior vem no 7º. Pular um dia
// volta ao dia 1. Um evento por dia (ev_ci_<dia>), então dois aparelhos não resgatam em dobro.
export const CHECKIN = [{ gold: 20 }, { gold: 30 }, { gold: 40, xp: 30 }, { gold: 50 }, { gold: 60, vouchers: 1 }, { gold: 80, xp: 50 }, { gold: 150, xp: 100, vouchers: 2 }];

export function checkinState(S = P(), day = today()) {
  const claims = S.ev.filter((e) => e.kind === 'checkin' && e.date).sort((a, b) => a.date.localeCompare(b.date));
  const mine = claims.find((e) => e.date === day);
  const prev = claims.filter((e) => e.date < day).pop();
  const y = addDay(day, -1);
  const cont = prev && prev.date === y;
  const n = mine ? mine.n : cont ? (prev.n % 7) + 1 : 1;
  return { claimed: !!mine, n, prize: CHECKIN[n - 1], next: CHECKIN[n % 7], reset: !mine && !!prev && !cont && prev.n > 1 };
}

export async function claimCheckin(day = today()) {
  const st = checkinState(P(), day);
  if (st.claimed) return null;
  const p = st.prize;
  const res = await commit([ev({ kind: 'checkin', n: st.n, gold: p.gold, xp: p.xp, vouchers: p.vouchers, date: day }, `ev_ci_${day}`)]);
  return { ...st, ...res };
}

function addDay(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n, 12);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
