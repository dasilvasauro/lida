// Calendário: terceira forma de ver (Lista · Quadro · Calendário) em Hoje, Planejar, no Painel e nos
// projetos. Mês (grade com o dia escolhido embaixo), Semana e Dia (linha do tempo por hora, com a
// linha de agora). Hoje fica destacado em todas.
//
// O que dá para mexer: as tarefas (concluir, abrir, arrastar para outro dia ou horário, criar num dia
// ou horário) e os hábitos de hoje (um toque soma). Eventos das agendas externas são só leitura.
import { P, app } from '../state.js';
import { today } from '../lib/clock.js';
import { esc, addDays, parseISO, fmtDayLong, fmtDayMonth, fmtMonth, fmtTime, WD_SHORT, WD_LETTER, ymOf, addMonths, plural } from '../lib/util.js';
import { icon, sheet, toast, newTag, confirmDialog } from '../ui/ui.js';
import { haptic } from '../ui/haptics.js';
import { play } from '../core/sound.js';
import { itemsBetween, habitsDay, frequentSummary, layoutDay, monthGrid, weekDays, hhmm, DAY_MS } from '../core/calendar.js';
import { eventsBetween, refreshSources, onCalendarData, sources, saveSources, addSource, sourceState, googleCalendars, testICS, forget, SRC_COLORS } from '../core/calsources.js';
import { dropCalendarToken } from '../core/cloud.js';
import { nativeHttp, openExternal } from '../core/net.js';
import { saveTask, strip, checkTask } from '../core/tasks.js';
import * as H from '../core/habits.js';
import { taskList, bindTasks, quickAdd, bindQuick, openTask, editTask } from './tasks.js';
import { tr } from '../core/i18n.js';
import { helpQ } from '../ui/help.js';

/* ---------- Estado (a forma de ver fica lembrada neste aparelho) ---------- */
const KEY = 'lida.cal';
const VIEWS = ['day', 'week', 'month'];
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};
const st = { view: VIEWS.includes(read().view) ? read().view : 'month', anchor: null, sel: null };
const remember = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ view: st.view }));
  } catch {
    /* sem armazenamento */
  }
};
const HH = 44; // altura de uma hora na linha do tempo (px)

let listening = false;
let ticker = null;
function keepFresh() {
  if (!listening) {
    listening = true;
    onCalendarData(() => app.refresh?.());
  }
  refreshSources(P());
  clearInterval(ticker);
  // enquanto o calendário estiver na tela: baixa de novo as agendas e move a linha de agora
  ticker = setInterval(() => {
    if (!document.querySelector('.cv')) return clearInterval(ticker);
    refreshSources(P());
    moveNow();
  }, 60000);
}
function moveNow() {
  const line = document.querySelector('.cv-now');
  if (!line) return;
  const d = new Date();
  line.style.top = `${((d.getHours() * 60 + d.getMinutes()) / 60) * HH}px`;
}

const msOf = (day) => parseISO(day).getTime();

/* ---------- Peças ---------- */
function chip(it, { compact = false } = {}) {
  const cls = ['cv-chip', `k-${it.kind}`];
  if (it.done) cls.push('done');
  if (it.late) cls.push('late');
  if (it.kind === 'ghost' || it.ghost) cls.push('ghost');
  const color = it.color || (it.kind === 'event' ? 'var(--p2)' : `var(--${String(it.p || 'P4').toLowerCase()})`);
  const drag = it.kind === 'task' && !it.done ? ' draggable="true"' : '';
  const time = it.min != null && !compact ? `<b>${esc(fmtTime(hhmm(it.min)))}</b> ` : '';
  const ic = it.kind === 'ghost' || (it.kind === 'routine' && it.ghost) ? icon('repeat', 'sm') : it.kind === 'routine' ? icon('list', 'sm') : '';
  return `<span class="${cls.join(' ')}" style="--c:${esc(color)}" data-cit="${esc(it.id)}" data-kind="${it.kind}"${it.ref ? ` data-ref="${esc(it.ref)}"` : ''}${drag} title="${esc(it.title)}"><i></i>${ic}${time}<span translate="no">${esc(it.title)}</span></span>`;
}

function bar(S, title) {
  const errs = sources(S).filter((s) => s.on && sourceState(s.id)?.error).length;
  return `<div class="cv-bar">
    <div class="cv-nav">
      <button type="button" class="icon-btn" data-cnav="-1" aria-label="Anterior">${icon('left')}</button>
      <button type="button" class="btn small" data-cnav="0">Hoje</button>
      <button type="button" class="icon-btn" data-cnav="1" aria-label="Próximo">${icon('right')}</button>
      <h3 class="cv-title">${esc(title)}</h3>${helpQ('calendario')}
    </div>
    <div class="cv-tools">
      <div class="seg small" role="group" aria-label="Período">
        ${[['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']].map(([k, l]) => `<button type="button" data-cview="${k}" class="${st.view === k ? 'on' : ''}" aria-pressed="${st.view === k}">${l}</button>`).join('')}
      </div>
      <button type="button" class="icon-btn cv-src${errs ? ' warn' : ''}" data-csrc aria-label="Agendas externas" title="Agendas externas">${icon('calendar')}${errs ? '<i class="cv-badge"></i>' : ''}</button>
    </div>
  </div>`;
}

function freqStrip(S, map) {
  const f = frequentSummary(map);
  const rows = [];
  if (f.daily.length) rows.push(`<span><b>Todo dia:</b> <span translate="no">${esc(f.daily.join(', '))}</span></span>`);
  if (f.weekdays.length) rows.push(`<span><b>Dias úteis:</b> <span translate="no">${esc(f.weekdays.join(', '))}</span></span>`);
  return rows.length ? `<div class="cv-strip">${icon('repeat', 'sm')}${rows.join('')}</div>` : '';
}

/* ---------- Mês ---------- */
function month(S, day, ym, map) {
  const grid = monthGrid(ym);
  const head = Array.from({ length: 7 }, (_, i) => `<span><span class="w-l">${esc(WD_SHORT[i])}</span><span class="w-s">${esc(WD_LETTER[i])}</span></span>`).join('');
  const cells = grid
    .flat()
    .map((d) => {
      const list = (map.get(d) || []).filter((x) => !x.freq || x.kind === 'task');
      const hb = habitsDay(S, d, day);
      const cls = ['cv-cell'];
      if (ymOf(d) !== ym) cls.push('out');
      if (d === day) cls.push('today');
      if (d === st.sel) cls.push('sel');
      if (d < day) cls.push('was');
      const shown = list.slice(0, 3);
      const more = list.length - shown.length;
      const dots = list.slice(0, 5).map((x) => `<i class="cv-dot${x.done ? ' done' : ''}${x.kind === 'ghost' ? ' ghost' : ''}" style="--c:${esc(x.color || (x.kind === 'event' ? 'var(--p2)' : `var(--${String(x.p || 'P4').toLowerCase()})`))}"></i>`).join('');
      return `<div class="${cls.join(' ')}" data-cday="${d}" role="button" tabindex="0" aria-label="${esc(fmtDayLong(d))}: ${esc(plural(list.length, 'item', 'itens'))}">
        <span class="cv-num">${parseISO(d).getDate()}</span>
        ${hb.total ? `<small class="cv-hab${hb.done >= hb.total && d <= day ? ' ok' : ''}" title="Hábitos">${d <= day ? `${hb.done}/${hb.total}` : hb.total}</small>` : ''}
        <div class="cv-chips">${shown.map((x) => chip(x, { compact: true })).join('')}${more > 0 ? `<span class="cv-more">+${more}</span>` : ''}</div>
        <div class="cv-dots">${dots}${list.length > 5 ? '<i class="cv-dot plus"></i>' : ''}</div>
      </div>`;
    })
    .join('');
  return `${freqStrip(S, map)}<div class="cv-month"><div class="cv-week-head">${head}</div><div class="cv-grid" style="--rows:${grid.length}">${cells}</div></div>${dayPanel(S, st.sel, map.get(st.sel) || [], day)}`;
}

/* ---------- Dia escolhido (embaixo do mês e na visão Dia) ---------- */
function dayPanel(S, d, list, day) {
  const events = list.filter((x) => x.kind === 'event');
  const real = [];
  for (const x of list) {
    if ((x.kind === 'task' || (x.kind === 'routine' && x.ref)) && S.byId.get(x.ref)) real.push(S.byId.get(x.ref));
  }
  const ghosts = list.filter((x) => x.kind === 'ghost' || (x.kind === 'routine' && x.ghost));
  const hb = habitsDay(S, d, day);
  const evRow = (x) => {
    const e = x.ev;
    const when = e.allDay ? 'Dia inteiro' : `${fmtTime(hhmm(x.min))}–${fmtTime(hhmm(Math.min(24 * 60, x.min + x.dur)))}`;
    return `<li class="cv-ev" style="--c:${esc(x.color || 'var(--p2)')}" data-cev="${esc(x.id)}" role="button" tabindex="0"><i></i><span class="cv-ev-t">${esc(when)}</span><span class="grow"><b translate="no">${esc(e.title)}</b>${e.location ? `<small translate="no">${esc(e.location)}</small>` : ''}</span><small class="cv-ev-src" translate="no">${esc(e.srcName || '')}</small></li>`;
  };
  return `<section class="cv-day" data-cpanel="${d}">
    <div class="cv-day-head"><h3>${esc(fmtDayLong(d))}${d === day ? ' <span class="cv-today-tag">Hoje</span>' : ''}</h3>${st.view === 'month' ? `<button type="button" class="link" data-cdayview>${icon('timer', 'sm')}Linha do tempo</button>` : ''}</div>
    ${events.length ? `<ul class="cv-evs">${events.map(evRow).join('')}</ul>` : ''}
    ${real.length ? taskList(real, { S }) : ''}
    ${ghosts.length ? `<div class="cv-ghosts"><small>Previstas (repetições)</small>${ghosts.map((x) => chip(x)).join('')}</div>` : ''}
    ${
      hb.total
        ? `<div class="cv-habs"><small>Hábitos ${d <= day ? `${hb.done}/${hb.total}` : `(${hb.total})`}</small>${hb.list
            .map((x) => `<button type="button" class="cv-habit${x.done ? ' on' : ''}${d !== day ? ' ro' : ''}" data-chab="${esc(x.h.id)}"${d > day ? ' disabled' : ''}><span class="cv-habit-ic">${x.done ? icon('check', 'sm') : esc(x.h.icon || (x.h.title || '?')[0])}</span><span translate="no">${esc(x.h.title)}</span>${(x.h.goal || 1) > 1 ? `<small>${x.count}/${x.h.goal}</small>` : ''}</button>`)
            .join('')}</div>`
        : ''
    }
    ${!events.length && !real.length && !ghosts.length && !hb.total ? `<p class="hint cv-empty">Nada neste dia.</p>` : ''}
    ${quickAdd({ due: d }, `cv-${d}`)}
  </section>`;
}

/* ---------- Linha do tempo (semana e dia) ---------- */
function timeline(S, days, map, day) {
  const nowMin = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();
  const heads = days
    .map((d) => {
      const dt = parseISO(d);
      const hb = habitsDay(S, d, day);
      return `<div class="tl-head${d === day ? ' today' : ''}" data-cday="${d}" role="button" tabindex="0"><span>${esc(WD_SHORT[dt.getDay()])}</span><b>${dt.getDate()}</b>${hb.total ? `<small class="cv-hab${hb.done >= hb.total && d <= day ? ' ok' : ''}">${d <= day ? `${hb.done}/${hb.total}` : hb.total}</small>` : ''}</div>`;
    })
    .join('');
  const allDay = days
    .map((d) => {
      const list = (map.get(d) || []).filter((x) => x.min == null);
      return `<div class="tl-all${d === day ? ' today' : ''}" data-cdrop="${d}">${list.map((x) => chip(x)).join('')}</div>`;
    })
    .join('');
  const hours = Array.from({ length: 24 }, (_, h) => `<span style="top:${h * HH}px">${h ? esc(fmtTime(hhmm(h * 60))) : ''}</span>`).join('');
  const cols = days
    .map((d) => {
      const lay = layoutDay(map.get(d) || []);
      const blocks = lay
        .map(({ it, lane, lanes, s, e }) => {
          const top = (s / 60) * HH;
          const h = Math.max(18, ((e - s) / 60) * HH - 2);
          return `<div class="tl-block" style="top:${top}px;height:${h}px;left:calc(${(lane / lanes) * 100}% + 2px);width:calc(${100 / lanes}% - 4px)">${chip(it)}</div>`;
        })
        .join('');
      return `<div class="tl-col${d === day ? ' today' : ''}" data-cslot="${d}" data-cdrop="${d}">${blocks}${d === day ? `<i class="cv-now" style="top:${(nowMin / 60) * HH}px"></i>` : ''}</div>`;
    })
    .join('');
  return `<div class="cv-tl" style="--days:${days.length};--hh:${HH}px">
    <div class="tl-row tl-heads"><span class="tl-gut"></span>${heads}</div>
    <div class="tl-row tl-alls"><span class="tl-gut"><small>dia</small></span>${allDay}</div>
    <div class="tl-scroll" data-cscroll><div class="tl-row tl-body" style="height:${24 * HH}px"><div class="tl-gut tl-hours">${hours}</div>${cols}</div></div>
  </div>`;
}

/* ---------- Tela ---------- */
// scope: { projectId } (projeto) — sem escopo, mostra tudo.
export function calendarView(S, { projectId = null } = {}) {
  const day = today();
  st.anchor ||= day;
  st.sel ||= day;
  let a;
  let b;
  let title;
  if (st.view === 'month') {
    const ym = ymOf(st.anchor);
    const g = monthGrid(ym);
    a = g[0][0];
    b = g[g.length - 1][6];
    title = fmtMonth(ym);
    if (ymOf(st.sel) !== ym && !(st.sel >= a && st.sel <= b)) st.sel = ymOf(day) === ym ? day : `${ym}-01`;
  } else if (st.view === 'week') {
    const w = weekDays(st.anchor);
    a = w[0];
    b = w[6];
    title = `${fmtDayMonth(parseISO(a), false)} – ${fmtDayMonth(parseISO(b))}`;
  } else {
    a = b = st.anchor;
    title = fmtDayLong(st.anchor);
  }
  const events = eventsBetween(S, msOf(a), msOf(b) + DAY_MS - 1);
  const map = itemsBetween(S, a, b, { today: day, projectId, events });
  let body;
  if (st.view === 'month') body = month(S, day, ymOf(st.anchor), map);
  else if (st.view === 'week') body = timeline(S, weekDays(st.anchor), map, day);
  else body = `${timeline(S, [st.anchor], map, day)}${dayPanel(S, st.anchor, map.get(st.anchor) || [], day)}`;
  return `<section class="block cv cv-v-${st.view}" data-cal="${projectId || ''}">${bar(S, title)}${body}</section>`;
}

export function bindCalendar(root) {
  const el = root.querySelector('[data-cal]');
  if (!el) return;
  keepFresh();
  const S = P();
  const day = today();
  const go = () => {
    haptic('tick');
    app.refresh();
  };
  el.querySelectorAll('[data-cnav]').forEach(
    (b) =>
      (b.onclick = () => {
        const n = +b.dataset.cnav;
        if (!n) st.anchor = st.sel = day;
        else if (st.view === 'month') {
          st.anchor = `${addMonths(ymOf(st.anchor), n)}-01`;
          st.sel = ymOf(day) === ymOf(st.anchor) ? day : st.anchor;
        } else st.anchor = st.sel = addDays(st.anchor, n * (st.view === 'week' ? 7 : 1));
        go();
      }),
  );
  el.querySelectorAll('[data-cview]').forEach(
    (b) =>
      (b.onclick = () => {
        st.view = b.dataset.cview;
        st.anchor = st.sel || st.anchor;
        remember();
        go();
      }),
  );
  el.querySelector('[data-csrc]')?.addEventListener('click', () => openSources());
  el.querySelector('[data-cdayview]')?.addEventListener('click', () => {
    st.view = 'day';
    st.anchor = st.sel;
    remember();
    go();
  });
  // dia: um toque escolhe; no dia já escolhido (ou num cabeçalho da semana), abre o Dia
  el.querySelectorAll('[data-cday]').forEach((c) => {
    const pick = (e) => {
      if (e.target.closest('[data-cit]')) return;
      const d = c.dataset.cday;
      if (st.view === 'month' && d !== st.sel) {
        st.sel = d;
        if (ymOf(d) !== ymOf(st.anchor)) st.anchor = `${ymOf(d)}-01`;
        return go();
      }
      st.view = 'day';
      st.anchor = st.sel = d;
      remember();
      go();
    };
    c.addEventListener('click', pick);
    c.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick(e)));
  });
  // itens
  el.querySelectorAll('[data-cit]').forEach(
    (c) =>
      (c.onclick = (e) => {
        e.stopPropagation();
        const kind = c.dataset.kind;
        if (kind === 'event') return openEvent(S, c.dataset.cit);
        const ref = c.dataset.ref;
        if (ref && S.byId.get(ref)) {
          if (kind === 'ghost') toast('Repetição prevista: abrindo a ocorrência atual.', { ms: 2500 });
          return openTask(ref);
        }
        if (kind === 'routine') app.nav('habitos');
      }),
  );
  el.querySelectorAll('[data-cev]').forEach((c) => (c.onclick = () => openEvent(S, c.dataset.cev)));
  // hábitos de hoje: um toque soma (como na aba Hábitos)
  el.querySelectorAll('[data-chab]').forEach(
    (b) =>
      (b.onclick = async () => {
        const h = S.byId.get(b.dataset.chab);
        if (!h) return;
        const d = el.querySelector('[data-cpanel]')?.dataset.cpanel || day;
        if (d !== day) return app.nav('habitos');
        await H.tap(h, day);
        haptic('tap');
        play('tick');
      }),
  );
  // horário vazio na linha do tempo: tarefa nova naquele dia e hora
  el.querySelectorAll('[data-cslot]').forEach(
    (col) =>
      (col.onclick = (e) => {
        if (e.target.closest('[data-cit]')) return;
        const r = col.getBoundingClientRect();
        const min = Math.max(0, Math.min(23 * 60 + 45, Math.round((((e.clientY - r.top) / HH) * 60) / 15) * 15));
        editTask(null, { due: col.dataset.cslot, time: hhmm(min) });
      }),
  );
  // arrastar tarefas (mouse): para outro dia (mês, faixa "dia") ou outro horário (linha do tempo)
  el.querySelectorAll('[data-cit][draggable]').forEach((c) =>
    c.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/lida-task', c.dataset.ref);
      e.dataTransfer.effectAllowed = 'move';
      c.classList.add('dragging');
    }),
  );
  const targets = [...el.querySelectorAll('.cv-cell[data-cday], [data-cdrop]')];
  for (const t of targets) {
    t.addEventListener('dragover', (e) => {
      if (![...e.dataTransfer.types].includes('text/lida-task')) return;
      e.preventDefault();
      t.classList.add('drop');
    });
    t.addEventListener('dragleave', () => t.classList.remove('drop'));
    t.addEventListener('drop', async (e) => {
      e.preventDefault();
      t.classList.remove('drop');
      const id = e.dataTransfer.getData('text/lida-task');
      const task = P().byId.get(id);
      if (!task) return;
      const d = t.dataset.cday || t.dataset.cdrop;
      const patch = { due: d };
      if (t.classList.contains('tl-col')) {
        const r = t.getBoundingClientRect();
        patch.time = hhmm(Math.max(0, Math.min(23 * 60 + 45, Math.round((((e.clientY - r.top) / HH) * 60) / 15) * 15)));
      } else if (t.classList.contains('tl-all')) patch.time = undefined;
      const data = { ...strip(task), ...patch };
      if (patch.time === undefined && 'time' in patch) delete data.time;
      const c = checkTask(data, id);
      if (!c.ok) return toast(c.msg);
      await saveTask(id, data, c.consume);
      haptic('add');
      toast(`Movida para ${fmtDayLong(d).toLowerCase()}${patch.time ? `, ${fmtTime(patch.time)}` : ''}.`);
    });
  }
  bindTasks(el);
  bindQuick(el);
  // linha do tempo: começa perto de agora (ou às 7h)
  const sc = el.querySelector('[data-cscroll]');
  if (sc) {
    // redesenho da mesma tela (algo sincronizou): fica onde a pessoa estava
    const key = `${st.view}|${st.anchor}`;
    if (st.scroll?.key === key) sc.scrollTop = st.scroll.top;
    else {
      const hasToday = !!el.querySelector('.tl-col.today');
      const items = [...el.querySelectorAll('.tl-block')].map((x) => parseFloat(x.style.top));
      const first = items.length ? Math.min(...items) - HH / 2 : 7 * HH;
      sc.scrollTop = Math.max(0, hasToday ? (new Date().getHours() - 1) * HH : Math.min(first, 7 * HH));
    }
    sc.addEventListener('scroll', () => (st.scroll = { key, top: sc.scrollTop }), { passive: true });
  }
}

/* ---------- Evento externo (só leitura) ---------- */
function openEvent(S, id) {
  const all = eventsBetween(S, Date.now() - 400 * DAY_MS, Date.now() + 400 * DAY_MS);
  const base = id.split('|')[0];
  const e = all.find((x) => x.id === base);
  if (!e) return;
  const when = e.allDay
    ? e.endDate && e.endDate !== e.date
      ? `${fmtDayLong(e.date)} – ${fmtDayLong(e.endDate)}`
      : `${fmtDayLong(e.date)} · Dia inteiro`
    : `${fmtDayLong(new Date(e.start).toLocaleDateString('sv-SE'))} · ${fmtTime(hhmm(new Date(e.start).getHours() * 60 + new Date(e.start).getMinutes()))}–${fmtTime(hhmm(new Date(e.end).getHours() * 60 + new Date(e.end).getMinutes()))}`;
  sheet({
    title: 'Evento',
    body: `<div class="cv-evd" style="--c:${esc(e.color)}">
      <h3 translate="no">${esc(e.title)}</h3>
      <p>${icon('calendar', 'sm')}${esc(when)}</p>
      ${e.location ? `<p translate="no">${icon('pin', 'sm')}${esc(e.location)}</p>` : ''}
      ${e.desc ? `<p class="cv-evd-desc" translate="no">${esc(e.desc).replace(/\n/g, '<br>')}</p>` : ''}
      <p class="hint">${icon('lock', 'sm')}Da agenda <b translate="no">${esc(e.srcName || '')}</b>. Eventos externos são só leitura: mude na agenda de origem.</p>
    </div>
    <div class="sheet-actions">${e.url && /^https:\/\//.test(e.url) ? `<button type="button" class="btn ghost" data-open>${icon('open')}Abrir na agenda</button>` : '<span></span>'}<button type="button" class="btn primary" data-ok>Fechar</button></div>`,
    onMount(el, close) {
      el.querySelector('[data-ok]').onclick = close;
      el.querySelector('[data-open]')?.addEventListener('click', () => openExternal(e.url));
    },
  });
}

/* ---------- Agendas externas ---------- */
const kindName = (s) => (s.kind === 'google' ? 'Google Agenda' : 'Link iCal');
export function openSources() {
  sheet({
    title: 'Agendas externas',
    wide: true,
    body: `<div data-srcbody></div>`,
    onMount(el, close) {
      const paint = () => {
        const S = P();
        const list = sources(S);
        el.querySelector('[data-srcbody]').innerHTML = `
          <p class="sheet-text">Os eventos de outras agendas aparecem no calendário do Lida, só para ver (não dá para mudar daqui). Eles ficam só neste aparelho e são baixados de novo a cada 15 minutos.</p>
          ${
            list.length
              ? `<div class="set-list">${list
                  .map((s) => {
                    const c = sourceState(s.id);
                    const note = c?.error ? `<small class="neg-text">${esc(c.error)}</small>` : c?.at ? `<small>${esc(kindName(s))} · atualizada ${esc(new Date(c.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</small>` : `<small>${esc(kindName(s))}</small>`;
                    return `<div class="set-row"><i class="src-dot" style="--c:${esc(s.color)}"></i><span class="grow" translate="no">${esc(s.name)}${note}</span>
                      ${c?.code === 'auth' ? `<button type="button" class="btn small" data-reauth="${esc(s.id)}">Conectar</button>` : ''}
                      <label class="toggle"><input type="checkbox" data-srcon="${esc(s.id)}"${s.on ? ' checked' : ''} aria-label="Mostrar ${esc(s.name)}"><i></i></label>
                      <button type="button" class="icon-btn" data-srcdel="${esc(s.id)}" aria-label="Remover ${esc(s.name)}">${icon('trash')}</button></div>`;
                  })
                  .join('')}</div>`
              : '<p class="hint">Nenhuma agenda externa ainda.</p>'
          }
          <div class="src-add">
            <button type="button" class="btn" data-addg>${icon('calendar')}Google Agenda${newTag()}</button>
            <button type="button" class="btn" data-addics>${icon('plus')}Link iCal (.ics)</button>
          </div>
          ${nativeHttp() ? '' : '<p class="hint">No navegador, a maioria dos links iCal é bloqueada pelo servidor da agenda. Eles funcionam no app Android e no do Linux; aqui, use a Google Agenda.</p>'}`;
        bind();
      };
      const bind = () => {
        el.querySelectorAll('[data-srcon]').forEach(
          (b) =>
            (b.onchange = async () => {
              const list = sources(P()).map((s) => (s.id === b.dataset.srcon ? { ...s, on: b.checked } : s));
              await saveSources(list);
              refreshSources(P());
            }),
        );
        el.querySelectorAll('[data-srcdel]').forEach(
          (b) =>
            (b.onclick = async () => {
              const s = sources(P()).find((x) => x.id === b.dataset.srcdel);
              if (!s || !(await confirmDialog(`Remover "${s.name}" do calendário? A agenda original não muda.`, { ok: 'Remover' }))) return;
              forget(s.id);
              const rest = sources(P()).filter((x) => x.id !== s.id);
              await saveSources(rest);
              if (s.kind === 'google' && !rest.some((x) => x.kind === 'google')) dropCalendarToken({ forget: true });
              paint();
            }),
        );
        el.querySelectorAll('[data-reauth]').forEach(
          (b) =>
            (b.onclick = async () => {
              try {
                dropCalendarToken();
                await googleCalendars({ interactive: true });
                await refreshSources(P(), { force: true });
              } catch (e) {
                toast(e.message || String(e), { ms: 6000 });
              }
              paint();
            }),
        );
        el.querySelector('[data-addics]').onclick = () => addICS(paint);
        el.querySelector('[data-addg]').onclick = () => addGoogle(paint);
      };
      paint();
      const off = onCalendarData(paint);
      el.closest('.sheet-wrap')?.addEventListener('transitionend', () => !document.body.contains(el) && off());
      void close;
    },
  });
}

function addICS(done) {
  sheet({
    title: 'Link iCal (.ics)',
    body: `<form class="form" data-f>
      <p class="sheet-text">Cole o endereço secreto da agenda no formato iCal. <b>Google Agenda:</b> Configurações > a agenda > "Endereço secreto no formato iCal". <b>Outlook:</b> Configurações > Calendário > Calendários compartilhados > Publicar. <b>iCloud:</b> compartilhar a agenda como pública. O link dá acesso de leitura à agenda: ele fica cifrado com os seus dados.</p>
      <label class="field"><span>Nome</span><input name="name" required maxlength="40" placeholder="Trabalho"></label>
      <label class="field"><span>Endereço</span><input name="url" required inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://… .ics" translate="no"></label>
      <div class="field"><span>Cor</span><div class="src-colors">${SRC_COLORS.map((c, i) => `<label><input type="radio" name="color" value="${c}"${i === sources(P()).length % SRC_COLORS.length ? ' checked' : ''}><i style="--c:${c}"></i></label>`).join('')}</div></div>
      <div class="sheet-actions"><span></span><button class="btn primary">Adicionar</button></div></form>`,
    onMount(el, close) {
      el.querySelector('[data-f]').onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        const btn = f.querySelector('.btn.primary');
        btn.disabled = true;
        try {
          const n = await testICS(f.url.value);
          await addSource({ kind: 'ics', name: f.name.value.trim(), url: f.url.value.trim(), color: f.color.value });
          toast(`Agenda adicionada (${plural(n, 'evento', 'eventos')}).`);
          close();
          await refreshSources(P(), { force: true });
          done();
        } catch (ex) {
          btn.disabled = false;
          toast(ex.message || String(ex), { ms: 7000 });
        }
      };
    },
  });
}

async function addGoogle(done) {
  let cals;
  try {
    cals = await googleCalendars({ interactive: true });
  } catch (e) {
    return toast(e.message || String(e), { ms: 7000 });
  }
  if (!cals) return;
  const have = new Set(sources(P()).filter((s) => s.kind === 'google').map((s) => s.calId));
  sheet({
    title: 'Google Agenda',
    body: `<form class="form" data-f><p class="sheet-text">Escolha as agendas da conta que aparecem no calendário do Lida (só leitura).</p>
      <div class="set-list">${cals
        .map((c) => `<label class="set-row"><i class="src-dot" style="--c:${esc(c.color || '#5aa9ff')}"></i><span class="grow" translate="no">${esc(c.name)}${c.primary ? `<small>${esc(tr({ pt: 'Principal', en: 'Primary', es: 'Principal' }))}</small>` : ''}</span><input type="checkbox" name="c" value="${esc(c.calId)}"${have.has(c.calId) || (!have.size && c.primary) ? ' checked' : ''}></label>`)
        .join('')}</div>
      <div class="sheet-actions"><span></span><button class="btn primary">Salvar</button></div></form>`,
    onMount(el, close) {
      el.querySelector('[data-f]').onsubmit = async (e) => {
        e.preventDefault();
        const chosen = new Set([...e.target.querySelectorAll('input[name=c]:checked')].map((x) => x.value));
        let list = sources(P()).filter((s) => s.kind !== 'google' || chosen.has(s.calId));
        for (const c of cals) {
          if (!chosen.has(c.calId) || list.some((s) => s.kind === 'google' && s.calId === c.calId)) continue;
          list = [...list, { id: `g${Math.random().toString(36).slice(2, 10)}`, kind: 'google', calId: c.calId, name: c.name, color: c.color || SRC_COLORS[list.length % SRC_COLORS.length], on: true }];
        }
        await saveSources(list);
        close();
        await refreshSources(P(), { force: true });
        done();
      };
    },
  });
}
