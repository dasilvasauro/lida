// Leitor de agendas no formato iCalendar (.ics), o "link secreto" que Google Agenda, Outlook, iCloud
// e Nextcloud oferecem. Só leitura: transforma os VEVENT em ocorrências dentro de uma janela de datas.
//
// Cobre o que esses serviços exportam na prática:
//   - DTSTART/DTEND (dia inteiro, UTC "Z", com TZID ou "flutuante") e DURATION
//   - RRULE com FREQ DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT, UNTIL, BYDAY (com ordinal no
//     mês: 1MO, -1FR), BYMONTHDAY e BYMONTH
//   - EXDATE (ocorrências apagadas) e RECURRENCE-ID (uma ocorrência alterada)
//   - STATUS:CANCELLED (ignorado)
// Fuso: TZID com nome IANA (America/Sao_Paulo) é convertido com o Intl; nomes que o Intl não conhece
// (ex.: os do Windows) caem no fuso do aparelho.

/* ---------- Linhas e propriedades ---------- */
function unfold(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
}
const unescape = (v) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

// "DTSTART;TZID=America/Sao_Paulo:20261118T100000" → { name, params, value }
function prop(line) {
  let i = 0;
  let inQ = false;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === ':' && !inQ) break;
  }
  const head = line.slice(0, i);
  const value = line.slice(i + 1);
  const parts = head.split(';');
  const params = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: parts[0].toUpperCase(), params, value };
}

/* ---------- Datas ---------- */
// Valor de data/hora: { y, m, d, hh, mm, ss, allDay, utc, tz }
function parseDT(value, params = {}) {
  const v = String(value).trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if (!m) return null;
  const allDay = params.VALUE === 'DATE' || !m[4];
  return { y: +m[1], m: +m[2], d: +m[3], hh: allDay ? 0 : +m[4], mm: allDay ? 0 : +m[5], ss: allDay ? 0 : +(m[6] || 0), allDay, utc: !!m[7], tz: m[7] ? null : params.TZID || null };
}

const fmtCache = new Map();
function zoneOk(tz) {
  if (!tz) return false;
  if (fmtCache.has(tz)) return !!fmtCache.get(tz);
  let f = null;
  try {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    f = null;
  }
  fmtCache.set(tz, f);
  return !!f;
}
// Diferença (ms) entre o relógio do fuso e o UTC num instante
function zoneOffset(tz, ms) {
  const f = fmtCache.get(tz);
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - ms;
}
// Horário de parede (componentes) → instante em ms
export function wallToMs(c, tz) {
  if (c.utc) return Date.UTC(c.y, c.m - 1, c.d, c.hh, c.mm, c.ss);
  if (tz && zoneOk(tz)) {
    const guess = Date.UTC(c.y, c.m - 1, c.d, c.hh, c.mm, c.ss);
    let ms = guess - zoneOffset(tz, guess);
    ms = guess - zoneOffset(tz, ms); // segunda volta: acerta a virada do horário de verão
    return ms;
  }
  return new Date(c.y, c.m - 1, c.d, c.hh, c.mm, c.ss).getTime();
}
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const dayNum = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / 86400000);
const fromDayNum = (n) => {
  const dt = new Date(n * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
};
const wdOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// "PT1H30M", "P1D" → ms
function durMs(v) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(v || '').trim());
  if (!m) return null;
  const ms = (((+(m[2] || 0) * 7 + +(m[3] || 0)) * 24 + +(m[4] || 0)) * 60 + +(m[5] || 0)) * 60000 + +(m[6] || 0) * 1000;
  return m[1] === '-' ? -ms : ms;
}

/* ---------- Eventos ---------- */
// Texto .ics → [{ uid, title, location, desc, start (componentes), end?, dur?, rrule?, exdates: Set, recurId?, status }]
export function parseICS(text) {
  const lines = unfold(text);
  const out = [];
  let ev = null;
  let depth = 0; // VALARM e outros blocos dentro do VEVENT
  for (const raw of lines) {
    if (!raw) continue;
    const p = prop(raw);
    if (p.name === 'BEGIN') {
      if (p.value.toUpperCase() === 'VEVENT' && !ev) {
        ev = { exdates: new Set(), title: '', location: '', desc: '' };
        depth = 0;
      } else if (ev) depth++;
      continue;
    }
    if (p.name === 'END') {
      if (ev && depth > 0) depth--;
      else if (ev && p.value.toUpperCase() === 'VEVENT') {
        if (ev.start) out.push(ev);
        ev = null;
      }
      continue;
    }
    if (!ev || depth > 0) continue;
    switch (p.name) {
      case 'UID':
        ev.uid = p.value;
        break;
      case 'SUMMARY':
        ev.title = unescape(p.value);
        break;
      case 'LOCATION':
        ev.location = unescape(p.value);
        break;
      case 'DESCRIPTION':
        ev.desc = unescape(p.value);
        break;
      case 'URL':
        ev.url = p.value;
        break;
      case 'STATUS':
        ev.status = p.value.toUpperCase();
        break;
      case 'DTSTART':
        ev.start = parseDT(p.value, p.params);
        break;
      case 'DTEND':
        ev.end = parseDT(p.value, p.params);
        break;
      case 'DURATION':
        ev.dur = durMs(p.value);
        break;
      case 'RRULE':
        ev.rrule = parseRRule(p.value);
        break;
      case 'EXDATE':
        for (const v of p.value.split(',')) {
          const c = parseDT(v, p.params);
          if (c) ev.exdates.add(keyOf(c, c.tz || p.params.TZID || ev.start?.tz));
        }
        break;
      case 'RECURRENCE-ID': {
        const c = parseDT(p.value, p.params);
        if (c) ev.recurId = c;
        break;
      }
      default:
    }
  }
  return out;
}

export function parseRRule(v) {
  const r = {};
  for (const part of String(v).split(';')) {
    const [k, val] = part.split('=');
    if (!k || val == null) continue;
    r[k.toUpperCase()] = val;
  }
  if (!r.FREQ) return null;
  const byday = (r.BYDAY || '')
    .split(',')
    .filter(Boolean)
    .map((x) => {
      const m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(x.toUpperCase());
      return m ? { n: m[1] ? +m[1] : 0, wd: ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(m[2]) } : null;
    })
    .filter(Boolean);
  return {
    freq: r.FREQ.toUpperCase(),
    interval: Math.max(1, +(r.INTERVAL || 1)),
    count: r.COUNT ? +r.COUNT : null,
    until: r.UNTIL ? parseDT(r.UNTIL.replace(/^(\d{8})$/, '$1'), {}) : null,
    byday,
    bymonthday: (r.BYMONTHDAY || '').split(',').filter(Boolean).map(Number),
    bymonth: (r.BYMONTH || '').split(',').filter(Boolean).map(Number),
  };
}

// Chave de uma ocorrência (para EXDATE e RECURRENCE-ID): o instante, ou o dia para dia inteiro
function keyOf(c, tz) {
  return c.allDay ? `d${isoDay(c.y, c.m, c.d)}` : `t${wallToMs(c, tz)}`;
}

// Dias candidatos (y, m, d) da regra, em ordem, a partir do DTSTART. Para numa contagem de segurança.
function* ruleDays(start, rule) {
  const { freq, interval } = rule;
  const sDay = dayNum(start.y, start.m, start.d);
  if (freq === 'DAILY') {
    for (let n = sDay, i = 0; i < 20000; n += interval, i++) {
      const c = fromDayNum(n);
      if (rule.bymonth.length && !rule.bymonth.includes(c.m)) continue;
      if (rule.byday.length && !rule.byday.some((b) => b.wd === wdOf(c.y, c.m, c.d))) continue;
      yield c;
    }
    return;
  }
  if (freq === 'WEEKLY') {
    const days = rule.byday.length ? [...new Set(rule.byday.map((b) => b.wd))].sort((a, b) => a - b) : [wdOf(start.y, start.m, start.d)];
    // começo da semana do DTSTART (domingo; a ordem dentro da semana não muda as datas geradas)
    const week0 = sDay - wdOf(start.y, start.m, start.d);
    for (let w = 0; w < 5000; w++) {
      const base = week0 + w * 7 * interval;
      for (const wd of days) {
        const n = base + wd;
        if (n < sDay) continue;
        const c = fromDayNum(n);
        if (rule.bymonth.length && !rule.bymonth.includes(c.m)) continue;
        yield c;
      }
    }
    return;
  }
  if (freq === 'MONTHLY' || freq === 'YEARLY') {
    const step = freq === 'MONTHLY' ? interval : interval * 12;
    for (let i = 0; i < 3000; i++) {
      const total = start.y * 12 + (start.m - 1) + i * step;
      const months = freq === 'YEARLY' && rule.bymonth.length ? rule.bymonth.map((bm) => Math.floor(total / 12) * 12 + bm - 1) : [total];
      for (const tm of months.sort((a, b) => a - b)) {
        const y = Math.floor(tm / 12);
        const m = (tm % 12) + 1;
        const last = dim(y, m);
        let ds = [];
        if (rule.bymonthday.length) ds = rule.bymonthday.map((x) => (x < 0 ? last + 1 + x : x)).filter((x) => x >= 1 && x <= last);
        else if (rule.byday.length) {
          for (const b of rule.byday) {
            const all = [];
            for (let d = 1; d <= last; d++) if (wdOf(y, m, d) === b.wd) all.push(d);
            if (!b.n) ds.push(...all);
            else {
              const pick = b.n > 0 ? all[b.n - 1] : all[all.length + b.n];
              if (pick) ds.push(pick);
            }
          }
        } else if (start.d <= last) ds = [start.d];
        for (const d of [...new Set(ds)].sort((a, b) => a - b)) {
          if (dayNum(y, m, d) < sDay) continue;
          yield { y, m, d };
        }
      }
    }
  }
}

// Ocorrências entre dois instantes (ms). Devolve [{ uid, title, location, desc, url, start, end, allDay, date, endDate }]
//   start/end: ms (para horário); date/endDate: AAAA-MM-DD (endDate inclusiva, para dia inteiro)
export function expandEvents(events, fromMs, toMs, { max = 3000 } = {}) {
  const out = [];
  const overrides = new Map(); // uid → Map(chave da ocorrência → evento alterado)
  for (const ev of events) {
    if (!ev.recurId || !ev.uid) continue;
    if (!overrides.has(ev.uid)) overrides.set(ev.uid, new Map());
    overrides.get(ev.uid).set(keyOf(ev.recurId, ev.recurId.tz || ev.start.tz), ev);
  }
  const push = (ev, c) => {
    const s = ev.start;
    const tz = s.tz;
    if (s.allDay) {
      const lenDays = ev.end ? Math.max(1, dayNum(ev.end.y, ev.end.m, ev.end.d) - dayNum(s.y, s.m, s.d)) : ev.dur ? Math.max(1, Math.round(ev.dur / 86400000)) : 1;
      const n0 = dayNum(c.y, c.m, c.d);
      const startMs = new Date(c.y, c.m - 1, c.d).getTime();
      const e = fromDayNum(n0 + lenDays - 1);
      const endMs = new Date(e.y, e.m - 1, e.d, 23, 59, 59).getTime();
      if (endMs < fromMs || startMs > toMs) return;
      out.push({ uid: ev.uid || '', title: ev.title, location: ev.location, desc: ev.desc, url: ev.url || '', allDay: true, date: isoDay(c.y, c.m, c.d), endDate: isoDay(e.y, e.m, e.d), start: startMs, end: endMs });
      return;
    }
    const st = wallToMs({ ...s, y: c.y, m: c.m, d: c.d }, tz);
    let len = 3600000;
    if (ev.end) len = wallToMs(ev.end, ev.end.tz || tz) - wallToMs(s, tz);
    else if (ev.dur != null) len = ev.dur;
    const en = st + Math.max(0, len);
    if (en < fromMs || st > toMs) return;
    out.push({ uid: ev.uid || '', title: ev.title, location: ev.location, desc: ev.desc, url: ev.url || '', allDay: false, start: st, end: en });
  };
  for (const ev of events) {
    if (ev.recurId || ev.status === 'CANCELLED') continue;
    const s = ev.start;
    if (!ev.rrule) {
      push(ev, s);
      continue;
    }
    const r = ev.rrule;
    const untilMs = r.until ? (r.until.allDay ? new Date(r.until.y, r.until.m - 1, r.until.d, 23, 59, 59).getTime() : wallToMs({ ...r.until, utc: r.until.utc || !r.until.tz }, null)) : Infinity;
    const ov = overrides.get(ev.uid);
    let n = 0;
    for (const c of ruleDays(s, r)) {
      const occ = { ...s, y: c.y, m: c.m, d: c.d };
      const ms = s.allDay ? new Date(c.y, c.m - 1, c.d).getTime() : wallToMs(occ, s.tz);
      if (ms > untilMs || ms > toMs) break;
      n++;
      if (r.count && n > r.count) break;
      const key = keyOf(occ, s.tz);
      if (ev.exdates.has(key)) continue;
      const alt = ov?.get(key);
      if (alt) {
        if (alt.status !== 'CANCELLED') push(alt, alt.start);
      } else push(ev, c);
      if (out.length >= max) break;
    }
    if (out.length >= max) break;
  }
  return out.sort((a, b) => a.start - b.start);
}
