import { today } from './clock.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const ALPHA = '0123456789abcdefghijklmnopqrstuvwxyz';
export function uid(len = 16) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (const x of b) s += ALPHA[x % 36];
  return s;
}

export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + f(x), 0);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

// Hash curto e estável (FNV-1a 32 bits). Usado para ids numéricos de notificação.
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ---------- Números ---------- */
export function fmtNum(n, max = 1) {
  return (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: max });
}
export const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('pt-BR');
export const fmtSigned = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmtInt(Math.abs(n));
export const plural = (n, one, many) => `${fmtInt(n)} ${Math.abs(n) === 1 ? one : many}`;
export function fmtMl(ml) {
  const v = Number(ml) || 0;
  return v >= 1000 ? `${fmtNum(v / 1000, 2)} L` : `${fmtInt(v)} ml`;
}

/* ---------- Datas (strings locais YYYY-MM-DD / YYYY-MM) ---------- */
export const pad = (n) => String(n).padStart(2, '0');
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseISO(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}
export const ymOf = (s) => s.slice(0, 7);
export function addMonths(ym, n) {
  let [y, m] = ym.split('-').map(Number);
  m += n;
  y += Math.floor((m - 1) / 12);
  m = ((((m - 1) % 12) + 12) % 12) + 1;
  return `${y}-${pad(m)}`;
}
export function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
export const clampDay = (ym, day) => `${ym}-${pad(Math.min(Math.max(1, day | 0), daysInMonth(ym)))}`;
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
export const weekday = (s) => parseISO(s).getDay();
export const isoOfMs = (ms) => isoOf(new Date(ms));

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MSHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const WD_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WD_LETTER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function fmtDay(s) {
  const d = parseISO(s);
  return `${d.getDate()} ${MSHORT[d.getMonth()]}`;
}
export function fmtDayLong(s) {
  const d = parseISO(s);
  return `${cap(WD[d.getDay()])}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
export function fmtDate(s) {
  const d = parseISO(s);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
// "Hoje", "Amanhã" ou "12 de novembro" (com o ano só se for outro).
export function fmtDateHuman(s) {
  const n = daysBetween(today(), s);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  const d = parseISO(s);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` de ${d.getFullYear()}` : ''}`;
}
export function fmtMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${cap(MONTHS[m - 1])} de ${y}`;
}
export function fmtMonthShort(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MSHORT[m - 1]}/${String(y).slice(2)}`;
}
// "hoje", "amanhã", "ontem", "sex", "12 nov".
export function relDay(s, ref = today()) {
  const n = daysBetween(ref, s);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  if (n > 1 && n < 7) return cap(WD[weekday(s)]);
  return fmtDay(s);
}
export function fmtTime(hhmm) {
  return hhmm ? hhmm.replace(/^0/, '') : '';
}

/* ---------- Texto ---------- */
export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
