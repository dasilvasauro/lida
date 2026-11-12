import { today } from './clock.js';
import { lang, locale, t } from '../core/i18n.js';

const LANG = lang();
export const LOC = locale();

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
  return (Number(n) || 0).toLocaleString(LOC, { maximumFractionDigits: max });
}
export const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString(LOC);
export const fmtSigned = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmtInt(Math.abs(n));
// As palavras passam pelo dicionário ("tarefa"/"tarefas" → "task"/"tasks").
export const plural = (n, one, many) => `${fmtInt(n)} ${t(Math.abs(n) === 1 ? one : many)}`;
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

// i18n:skip-start (já traduzido aqui)
const CAL = {
  pt: {
    months: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    mshort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    wd: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
    wdShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    wdLetter: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    rel: ['Hoje', 'Amanhã', 'Ontem'],
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    mshort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    wd: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    wdShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    wdLetter: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    rel: ['Today', 'Tomorrow', 'Yesterday'],
  },
  es: {
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    mshort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'],
    wd: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    wdShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    wdLetter: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    rel: ['Hoy', 'Mañana', 'Ayer'],
  },
};
// i18n:skip-end
const C = CAL[LANG] || CAL.pt;
export const MONTHS = C.months;
export const MSHORT = C.mshort;
export const WD = C.wd;
export const WD_SHORT = C.wdShort;
export const WD_LETTER = C.wdLetter;
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const thisYear = () => new Date().getFullYear();

// "12 nov" (en: "Nov 12")
export function fmtDay(s) {
  const d = parseISO(s);
  return LANG === 'en' ? `${MSHORT[d.getMonth()]} ${d.getDate()}` : `${d.getDate()} ${MSHORT[d.getMonth()]}`;
}
// "Quinta, 12 de novembro"
export function fmtDayLong(s) {
  const d = parseISO(s);
  if (LANG === 'en') return `${WD[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return `${cap(WD[d.getDay()])}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
export function fmtDate(s) {
  const d = parseISO(s);
  if (LANG === 'en') return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
// "12 de novembro" (com o ano só se for outro)
export function fmtDayMonth(d, withYear = d.getFullYear() !== thisYear()) {
  if (LANG === 'en') return `${MONTHS[d.getMonth()]} ${d.getDate()}${withYear ? `, ${d.getFullYear()}` : ''}`;
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}${withYear ? ` de ${d.getFullYear()}` : ''}`;
}
// "Hoje", "Amanhã" ou "12 de novembro" (com o ano só se for outro).
export function fmtDateHuman(s) {
  const n = daysBetween(today(), s);
  if (n === 0) return C.rel[0];
  if (n === 1) return C.rel[1];
  if (n === -1) return C.rel[2];
  return fmtDayMonth(parseISO(s));
}
// "Novembro de 2026"
export function fmtMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return LANG === 'en' ? `${MONTHS[m - 1]} ${y}` : `${cap(MONTHS[m - 1])} de ${y}`;
}
export function fmtMonthShort(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MSHORT[m - 1]}/${String(y).slice(2)}`;
}
// "Hoje", "Amanhã", "Ontem", "Sexta", "12 nov".
export function relDay(s, ref = today()) {
  const n = daysBetween(ref, s);
  if (n === 0) return C.rel[0];
  if (n === 1) return C.rel[1];
  if (n === -1) return C.rel[2];
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
