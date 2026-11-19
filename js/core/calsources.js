// Agendas externas do calendário (só leitura):
//   - "ics": o link secreto iCal (Google, Outlook, iCloud, Nextcloud...). No app Android e no Linux o
//     próprio app baixa o arquivo; no navegador o servidor costuma bloquear (CORS) e aparece o aviso.
//   - "google": a Google Agenda da conta, pela API oficial (permissão de leitura da agenda).
// A lista fica nas preferências sincronizadas (cifradas, como o resto): prefs.calendars =
//   [{ id, kind, name, color, on, url? (ics), calId? (google) }]
// Os eventos ficam só na memória deste aparelho (baixados de novo a cada 15 minutos com o calendário
// aberto): nada das agendas externas vai para a nuvem do Lida.
import { personal } from '../state.js';
import { strip } from './tasks.js';
import { http, nativeHttp } from './net.js';
import { parseICS, expandEvents } from './ical.js';
import { googleCalendarToken, dropCalendarToken } from './cloud.js';
import { uid, addDays } from '../lib/util.js';

export const SRC_COLORS = ['#5aa9ff', '#3dd6a3', '#f2c14e', '#ff7a6b', '#b48cff', '#ff9f43', '#4fd1d9', '#ef6fae'];
const TTL = 15 * 60000;
const PAST = 92 * 86400000;
const AHEAD = 400 * 86400000;

export const sources = (S) => (Array.isArray(S?.prefs?.calendars) ? S.prefs.calendars : []);

export async function saveSources(list) {
  const prev = personal.get('prefs');
  await personal.save('prefs', { ...(prev ? strip(prev) : {}), calendars: list }, 'prefs');
}
export async function addSource(src) {
  const { P } = await import('../state.js');
  const list = sources(P());
  const s = { id: uid(10), on: true, color: SRC_COLORS[list.length % SRC_COLORS.length], ...src };
  await saveSources([...list, s]);
  return s;
}

/* ---------- Memória (por fonte) ---------- */
// id → { at, raw (VEVENTs, ics) | list (eventos, google), error, code }
const cache = new Map();
let listeners = [];
export const onCalendarData = (fn) => {
  listeners.push(fn);
  return () => (listeners = listeners.filter((x) => x !== fn));
};
const emit = () => listeners.forEach((f) => f());
export const sourceState = (id) => cache.get(id) || null;
export function forget(id) {
  cache.delete(id);
}

// Eventos das fontes ligadas entre dois instantes, normalizados para o calendário.
export function eventsBetween(S, fromMs, toMs) {
  const out = [];
  for (const s of sources(S)) {
    if (!s.on) continue;
    const c = cache.get(s.id);
    if (!c) continue;
    const list = c.raw ? expandEvents(c.raw, fromMs, toMs) : (c.list || []).filter((e) => e.end >= fromMs && e.start <= toMs);
    for (const e of list) out.push({ ...e, id: `${s.id}:${e.uid || e.id}:${e.start}`, color: e.color || s.color, src: s.id, srcName: s.name });
  }
  return out;
}

/* ---------- Download ---------- */
const webcal = (u) => String(u || '').trim().replace(/^webcals?:\/\//i, 'https://');

async function fetchICS(s) {
  const url = webcal(s.url);
  if (!/^https:\/\//i.test(url)) throw Object.assign(new Error('Use o endereço https:// (ou webcal://) da agenda.'), { code: 'config' });
  let text;
  if (nativeHttp()) {
    const r = await http({ url, headers: { Accept: 'text/calendar, */*' }, timeout: 30000 });
    if (r.status === 401 || r.status === 403 || r.status === 404) throw Object.assign(new Error('O link da agenda não abriu (ele pode ter mudado ou ter sido revogado).'), { code: 'gone' });
    if (r.status >= 400) throw Object.assign(new Error(`A agenda respondeu com erro ${r.status}.`), { code: 'http' });
    text = r.text;
  } else {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw Object.assign(new Error(`A agenda respondeu com erro ${r.status}.`), { code: 'http' });
      text = await r.text();
    } catch (e) {
      if (e.code) throw e;
      throw Object.assign(new Error('O navegador bloqueou o link (o servidor da agenda não libera páginas web). Use o app Android ou o do Linux, ou a Google Agenda pela conta.'), { code: 'cors' });
    }
  }
  if (!/BEGIN:VCALENDAR/i.test(text || '')) throw Object.assign(new Error('O endereço não devolveu uma agenda .ics.'), { code: 'format' });
  return parseICS(text);
}

const G = 'https://www.googleapis.com/calendar/v3';
async function gget(path, token) {
  const r = await fetch(`${G}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401 || r.status === 403) {
    dropCalendarToken();
    throw Object.assign(new Error('A permissão da Google Agenda venceu: conecte de novo.'), { code: 'auth' });
  }
  if (!r.ok) throw Object.assign(new Error(`A Google Agenda respondeu com erro ${r.status}.`), { code: 'http' });
  return r.json();
}
// Agendas da conta (para escolher quais mostrar)
export async function googleCalendars({ interactive = true } = {}) {
  const token = await googleCalendarToken({ interactive });
  if (!token) throw Object.assign(new Error('Sem permissão da Google Agenda.'), { code: 'auth' });
  const r = await gget('/users/me/calendarList?minAccessRole=reader&maxResults=250', token);
  return (r.items || []).map((c) => ({ calId: c.id, name: c.summaryOverride || c.summary || c.id, color: c.backgroundColor || null, primary: !!c.primary }));
}
function gEvent(e) {
  if (e.status === 'cancelled') return null;
  if (e.start?.date) {
    const s = e.start.date;
    // fim exclusivo → inclusivo
    const last = addDays(e.end?.date || addDays(s, 1), -1);
    const endDate = last < s ? s : last;
    return { uid: e.id, title: e.summary || '(sem título)', location: e.location || '', desc: e.description || '', url: e.htmlLink || '', allDay: true, date: s, endDate, start: new Date(`${s}T00:00`).getTime(), end: new Date(`${endDate}T23:59:59`).getTime() };
  }
  const st = Date.parse(e.start?.dateTime || '');
  const en = Date.parse(e.end?.dateTime || '') || st + 3600000;
  if (!st) return null;
  return { uid: e.id, title: e.summary || '(sem título)', location: e.location || '', desc: e.description || '', url: e.htmlLink || '', allDay: false, start: st, end: en };
}
async function fetchGoogle(s) {
  const token = await googleCalendarToken({ interactive: false });
  if (!token) throw Object.assign(new Error('Conecte a Google Agenda neste aparelho.'), { code: 'auth' });
  const now = Date.now();
  const q = `timeMin=${encodeURIComponent(new Date(now - PAST).toISOString())}&timeMax=${encodeURIComponent(new Date(now + AHEAD).toISOString())}&singleEvents=true&orderBy=startTime&maxResults=2500`;
  const list = [];
  let page = '';
  for (let i = 0; i < 4; i++) {
    const r = await gget(`/calendars/${encodeURIComponent(s.calId || 'primary')}/events?${q}${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`, token);
    for (const e of r.items || []) {
      const x = gEvent(e);
      if (x) list.push(x);
    }
    if (!r.nextPageToken) break;
    page = r.nextPageToken;
  }
  return list;
}

const busy = new Set();
// Baixa as fontes ligadas que estão velhas (ou todas, com force). Avisa quem está ouvindo ao terminar.
export async function refreshSources(S, { force = false } = {}) {
  const jobs = [];
  for (const s of sources(S)) {
    if (!s.on || busy.has(s.id)) continue;
    const c = cache.get(s.id);
    if (!force && c && Date.now() - c.at < (c.error ? 120000 : TTL)) continue;
    busy.add(s.id);
    jobs.push(
      (async () => {
        try {
          if (s.kind === 'google') cache.set(s.id, { at: Date.now(), list: await fetchGoogle(s) });
          else cache.set(s.id, { at: Date.now(), raw: await fetchICS(s) });
        } catch (e) {
          const old = cache.get(s.id);
          // mantém o que já tinha (sem rede, o calendário continua mostrando a última versão)
          cache.set(s.id, { ...(old || {}), at: Date.now(), error: e.message || String(e), code: e.code || 'offline' });
        } finally {
          busy.delete(s.id);
        }
      })(),
    );
  }
  if (!jobs.length) return;
  await Promise.all(jobs);
  emit();
}

// Testa um link antes de salvar (devolve quantos eventos tem)
export async function testICS(url) {
  const raw = await fetchICS({ url });
  return raw.length;
}
