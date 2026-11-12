// Adição rápida em linguagem natural (como no Todoist):
//   "Pagar luz amanhã 9h p1 #Casa @contas"
//   -> título "Pagar luz", amanhã às 09:00, P1, projeto Casa, etiqueta contas.
// Reconhece: hoje, amanhã, depois de amanhã, dias da semana, "dia 15", 15/11, "em 3 dias",
// "próxima semana"; horários (9h, 9h30, 14:15, às 9); p0–p4; #projeto; @etiqueta;
// repetição (todo dia, dias úteis, toda segunda, toda semana, todo mês, todo ano).
import { addDays, weekday, norm } from '../lib/util.js';
import { lang as curLang } from './i18n.js';

// Palavras de cada idioma (já sem acento e em minúsculas). Só as do idioma do app valem, para
// "sex", "mar" ou "sun" no meio de um título não virarem data em outro idioma.
const WORDS = {
  pt: {
    wd: { domingo: 0, dom: 0, segunda: 1, seg: 1, terca: 2, ter: 2, quarta: 3, qua: 3, quinta: 4, qui: 4, sexta: 5, sex: 5, sabado: 6, sab: 6 },
    wdSuffix: '(?:-feira)?',
    daily: 'todos os dias|todo dia|diariamente',
    workdays: 'dias uteis|todo dia util',
    every: 'toda|todo|todas as|todos os',
    and: ' e ',
    weekly: 'toda semana|semanalmente',
    monthly: 'todo mes|mensalmente',
    yearly: 'todo ano|anualmente',
    after: 'depois de amanha',
    tomorrow: 'amanha',
    today: 'hoje',
    nextWeek: 'proxima semana|semana que vem',
    inDays: 'em (\\d{1,3}) dias?',
    wdPrefix: 'na|no|nesta|neste|proxima|proximo',
    dayOf: 'dia (\\d{1,2})',
    at: 'as |a ',
    mdy: false,
  },
  en: {
    wd: { sunday: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5, saturday: 6 },
    wdSuffix: '',
    daily: 'every day|everyday|daily',
    workdays: 'weekdays|every weekday',
    every: 'every|on',
    and: ' and ',
    weekly: 'every week|weekly',
    monthly: 'every month|monthly',
    yearly: 'every year|yearly|annually',
    after: 'day after tomorrow|the day after tomorrow',
    tomorrow: 'tomorrow',
    today: 'today|tonight',
    nextWeek: 'next week',
    inDays: 'in (\\d{1,3}) days?',
    wdPrefix: 'on|this|next',
    dayOf: '(?:on )?the (\\d{1,2})(?:st|nd|rd|th)?',
    at: 'at ',
    mdy: true,
  },
  es: {
    wd: { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 },
    wdSuffix: '',
    daily: 'todos los dias|cada dia|diariamente',
    workdays: 'dias laborables|dias habiles|entre semana',
    every: 'cada|todos los|todas las|los',
    and: ' y ',
    weekly: 'cada semana|todas las semanas|semanalmente',
    monthly: 'cada mes|todos los meses|mensualmente',
    yearly: 'cada ano|todos los anos|anualmente',
    after: 'pasado manana',
    tomorrow: 'manana',
    today: 'hoy|esta noche',
    nextWeek: 'la semana que viene|proxima semana|la proxima semana',
    inDays: 'en (\\d{1,3}) dias?',
    wdPrefix: 'el|este|el proximo|proximo',
    dayOf: '(?:el )?dia (\\d{1,2})',
    at: 'a las |a la ',
    mdy: false,
  },
};
const pad = (n) => String(n).padStart(2, '0');

// Procura no texto já normalizado (sem acentos, minúsculo) e devolve a posição no original,
// que tem o mesmo comprimento: a normalização só troca letras acentuadas por sem acento.
function fold(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function parseQuick(input, { today, projects = [], tags = [], lang = curLang() }) {
  const W = WORDS[lang] || WORDS.pt;
  const WD = W.wd;
  const WD_RE = `(${Object.keys(WD).sort((a, b) => b.length - a.length).join('|')})${W.wdSuffix}`;
  let text = ` ${String(input).normalize('NFC')} `;
  const out = { due: null, time: null, priority: null, projectId: null, projectName: null, tags: [], newTags: [], recurrence: null, tokens: [] };
  const take = (re, fn) => {
    const f = fold(text);
    const m = re.exec(f);
    if (!m) return false;
    const raw = text.slice(m.index, m.index + m[0].length);
    if (fn(m, raw) === false) return false;
    out.tokens.push(raw.trim());
    text = `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`;
    return true;
  };
  const word = (alts) => new RegExp(`\\s(${alts})(?=\\s)`);

  // Repetição (antes das datas, porque "toda segunda" também tem um dia da semana).
  take(word(W.daily), () => (out.recurrence = { type: 'daily' }));
  take(word(W.workdays), () => (out.recurrence = { type: 'weekly', weekdays: [1, 2, 3, 4, 5] }));
  // "toda segunda", "toda segunda, quarta e sexta", "todas as terças e quintas"
  const ONE = `${WD_RE}s?`;
  take(new RegExp(`\\s(?:${W.every}) (${ONE}(?:(?:, ?|${W.and}|,${W.and})${ONE})*)(?=\\s)`), (m) => {
    const days = [...new Set([...m[1].matchAll(new RegExp(WD_RE, 'g'))].map((x) => WD[x[1]]))].sort();
    if (!days.length) return false;
    // en: "on monday" é só uma data; "on mondays" (plural) ou "every monday" repete
    if (lang === 'en' && /^\s?on /.test(m[0]) && !/s(?=\s|,|$)/.test(m[1].trim())) return false;
    out.recurrence = { type: 'weekly', weekdays: days };
    out.due = days.map((d) => nextWeekday(today, d, true)).sort()[0];
  });
  take(word(W.weekly), () => (out.recurrence = { type: 'weekly', weekdays: [weekday(out.due || today)] }));
  take(word(W.monthly), () => (out.recurrence = { type: 'monthly', dayOfMonth: Number((out.due || today).slice(8)) }));
  take(word(W.yearly), () => (out.recurrence = { type: 'yearly', dayOfMonth: Number((out.due || today).slice(8)), monthOfYear: Number((out.due || today).slice(5, 7)) - 1 }));

  // Datas
  take(word(W.after), () => (out.due = addDays(today, 2)));
  take(word(W.tomorrow), () => (out.due = addDays(today, 1)));
  take(word(W.today), () => (out.due = today));
  take(word(W.nextWeek), () => (out.due = nextWeekday(today, 1, false)));
  take(new RegExp(`\\s${W.inDays}(?=\\s)`), (m) => (out.due = addDays(today, Number(m[1]))));
  take(new RegExp(`\\s(?:(?:${W.wdPrefix}) )?${WD_RE}(?=\\s)`), (m) => {
    if (out.due) return false;
    out.due = nextWeekday(today, WD[m[1]], false);
  });
  take(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, (m) => {
    const d = Number(W.mdy ? m[2] : m[1]);
    const mo = Number(W.mdy ? m[1] : m[2]);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return false;
    let y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : Number(today.slice(0, 4));
    let iso = `${y}-${pad(mo)}-${pad(d)}`;
    if (!m[3] && iso < today) iso = `${y + 1}-${pad(mo)}-${pad(d)}`;
    out.due = iso;
  });
  take(new RegExp(`\\s${W.dayOf}(?=\\s)`), (m) => {
    const d = Number(m[1]);
    if (d < 1 || d > 31) return false;
    let [y, mo] = today.split('-').map(Number);
    if (d < Number(today.slice(8))) mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
    out.due = `${y}-${pad(mo)}-${pad(Math.min(d, new Date(y, mo, 0).getDate()))}`;
  });

  // Horário: 9h, 9h30, 14:15, às 9 (en: 9am, 9:30pm, at 9)
  take(/\s(?:as |a |at |a las |a la )?(\d{1,2})(?::(\d{2})|h(\d{2})?)?\s?(am|pm)(?=\s)/, (m) => {
    let h = Number(m[1]);
    const min = Number(m[2] || m[3] || 0);
    if (h < 1 || h > 12 || min > 59) return false;
    if (m[4] === 'pm' && h < 12) h += 12;
    if (m[4] === 'am' && h === 12) h = 0;
    out.time = `${pad(h)}:${pad(min)}`;
  });
  take(new RegExp(`\\s(?:${W.at})?(\\d{1,2})(?::(\\d{2})|h(\\d{2})?)(?=\\s)`), (m) => {
    if (out.time) return false;
    const h = Number(m[1]);
    const min = Number(m[2] || m[3] || 0);
    if (h > 23 || min > 59) return false;
    out.time = `${pad(h)}:${pad(min)}`;
  });
  take(new RegExp(`\\s(?:${W.at.split('|')[0].trim()}) (\\d{1,2})(?=\\s)`), (m) => {
    if (out.time || Number(m[1]) > 23) return false;
    out.time = `${pad(Number(m[1]))}:00`;
  });

  // Prioridade
  take(/\sp([0-4])(?=\s)/, (m) => (out.priority = `P${m[1]}`));

  // #projeto (só projetos existentes; com espaço no nome, use #Nome_composto ou o início do nome)
  take(/\s#([\wÀ-ɏ-]+)(?=\s)/, (m) => {
    const key = norm(m[1].replace(/_/g, ' '));
    const p = projects.find((x) => norm(x.name) === key) || projects.find((x) => norm(x.name).startsWith(key));
    if (!p) return false;
    out.projectId = p.id;
    out.projectName = p.name;
  });
  // @etiquetas (as que não existem são criadas)
  let guard = 0;
  while (guard++ < 8 && take(/\s@([\wÀ-ɏ-]+)(?=\s)/, (m, raw) => {
    const name = raw.trim().slice(1);
    const t = tags.find((x) => norm(x.name) === norm(name));
    if (t) out.tags.push(t.id);
    else out.newTags.push(name);
  }));

  out.title = text.replace(/\s+/g, ' ').trim();
  if (out.recurrence && !out.due) out.due = today;
  if (out.time && !out.due) out.due = today;
  // "dia 5 todo mês": a repetição segue a data escrita, não o dia de hoje
  if (out.recurrence?.type === 'monthly') out.recurrence.dayOfMonth = Number(out.due.slice(8));
  if (out.recurrence?.type === 'yearly') Object.assign(out.recurrence, { dayOfMonth: Number(out.due.slice(8)), monthOfYear: Number(out.due.slice(5, 7)) - 1 });
  return out;
}

function nextWeekday(today, wd, includeToday) {
  const cur = weekday(today);
  let diff = (wd - cur + 7) % 7;
  if (diff === 0 && !includeToday) diff = 7;
  return addDays(today, diff);
}
