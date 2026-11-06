// Adição rápida em linguagem natural (como no Todoist):
//   "Pagar luz amanhã 9h p1 #Casa @contas"
//   -> título "Pagar luz", amanhã às 09:00, P1, projeto Casa, etiqueta contas.
// Reconhece: hoje, amanhã, depois de amanhã, dias da semana, "dia 15", 15/11, "em 3 dias",
// "próxima semana"; horários (9h, 9h30, 14:15, às 9); p0–p4; #projeto; @etiqueta;
// repetição (todo dia, dias úteis, toda segunda, toda semana, todo mês, todo ano).
import { addDays, weekday, norm } from '../lib/util.js';

const WD = { domingo: 0, dom: 0, segunda: 1, seg: 1, terca: 2, ter: 2, quarta: 3, qua: 3, quinta: 4, qui: 4, sexta: 5, sex: 5, sabado: 6, sab: 6 };
const WD_RE = '(domingo|segunda|terca|quarta|quinta|sexta|sabado|dom|seg|ter|qua|qui|sex|sab)(?:-feira)?';
const pad = (n) => String(n).padStart(2, '0');

// Procura no texto já normalizado (sem acentos, minúsculo) e devolve a posição no original,
// que tem o mesmo comprimento: a normalização só troca letras acentuadas por sem acento.
function fold(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function parseQuick(input, { today, projects = [], tags = [] }) {
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

  // Repetição (antes das datas, porque "toda segunda" também tem um dia da semana).
  take(/\s(todos os dias|todo dia|diariamente)(?=\s)/, () => (out.recurrence = { type: 'daily' }));
  take(/\s(dias uteis|todo dia util)(?=\s)/, () => (out.recurrence = { type: 'weekly', weekdays: [1, 2, 3, 4, 5] }));
  take(new RegExp(`\\s(?:toda|todo) ${WD_RE}(?=\\s)`), (m) => {
    out.recurrence = { type: 'weekly', weekdays: [WD[m[1]]] };
    out.due = nextWeekday(today, WD[m[1]], true);
  });
  take(/\s(toda semana|semanalmente)(?=\s)/, () => (out.recurrence = { type: 'weekly', weekdays: [weekday(out.due || today)] }));
  take(/\s(todo mes|mensalmente)(?=\s)/, () => (out.recurrence = { type: 'monthly', dayOfMonth: Number((out.due || today).slice(8)) }));
  take(/\s(todo ano|anualmente)(?=\s)/, () => (out.recurrence = { type: 'yearly', dayOfMonth: Number((out.due || today).slice(8)), monthOfYear: Number((out.due || today).slice(5, 7)) - 1 }));

  // Datas
  take(/\s(depois de amanha)(?=\s)/, () => (out.due = addDays(today, 2)));
  take(/\s(amanha)(?=\s)/, () => (out.due = addDays(today, 1)));
  take(/\s(hoje)(?=\s)/, () => (out.due = today));
  take(/\s(proxima semana|semana que vem)(?=\s)/, () => (out.due = nextWeekday(today, 1, false)));
  take(/\sem (\d{1,3}) dias?(?=\s)/, (m) => (out.due = addDays(today, Number(m[1]))));
  take(new RegExp(`\\s(?:(?:na|no|nesta|neste|proxima|proximo) )?${WD_RE}(?=\\s)`), (m) => {
    if (out.due) return false;
    out.due = nextWeekday(today, WD[m[1]], false);
  });
  take(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, (m) => {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return false;
    let y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : Number(today.slice(0, 4));
    let iso = `${y}-${pad(mo)}-${pad(d)}`;
    if (!m[3] && iso < today) iso = `${y + 1}-${pad(mo)}-${pad(d)}`;
    out.due = iso;
  });
  take(/\sdia (\d{1,2})(?=\s)/, (m) => {
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

  // Horário
  take(/\s(?:as |a )?(\d{1,2})(?::(\d{2})|h(\d{2})?)(?=\s)/, (m) => {
    const h = Number(m[1]);
    const min = Number(m[2] || m[3] || 0);
    if (h > 23 || min > 59) return false;
    out.time = `${pad(h)}:${pad(min)}`;
  });
  take(/\sas (\d{1,2})(?=\s)/, (m) => {
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
  return out;
}

function nextWeekday(today, wd, includeToday) {
  const cur = weekday(today);
  let diff = (wd - cur + 7) % 7;
  if (diff === 0 && !includeToday) diff = 7;
  return addDays(today, diff);
}
