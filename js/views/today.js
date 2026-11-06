// Telas de tarefas: Hoje, Entrada (sem data) e Em breve (próximos dias).
import { P, prefs, setPref, displayName } from '../state.js';
import { buckets, updateTask } from '../core/tasks.js';
import { levelTitle, xpForLevel } from '../core/model.js';
import { today, now } from '../lib/clock.js';
import { esc, fmtInt, fmtDayLong, relDay, addDays, plural, daysBetween, cap, WD, weekday } from '../lib/util.js';
import { icon, ring, bar, empty, toast } from '../ui/ui.js';
import { taskList, bindTasks, quickAdd, bindQuick } from './tasks.js';

function greeting() {
  const h = now().getHours();
  const name = displayName();
  const g = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return name ? `${g}, ${name}` : g;
}

function levelCard(S) {
  const m = S.money;
  const base = xpForLevel(m.level);
  const next = xpForLevel(m.level + 1);
  const frac = (m.xp - base) / (next - base);
  return `<div class="lvl">
    <div class="lvl-badge" aria-hidden="true">${m.level}</div>
    <div class="lvl-info">
      <div class="row"><b>Nível ${m.level} · ${esc(levelTitle(m.level))}</b><span>${fmtInt(m.xp - base)} / ${fmtInt(next - base)} XP</span></div>
      ${bar(frac, { label: 'Progresso até o próximo nível' })}
      <div class="wallet"><span class="gold">${icon('coin')}${fmtInt(m.gold)} de ouro</span>${m.vouchers ? `<span>${icon('card')}${plural(m.vouchers, 'voucher', 'vouchers')}</span>` : ''}</div>
    </div>
  </div>`;
}

export const todayView = {
  title: 'Hoje',
  sub: () => fmtDayLong(today()),
  render(el) {
    const S = P();
    const day = today();
    const B = buckets(S, day);
    const total = B.today.length + B.doneToday.length;
    const showDone = prefs().showDone;
    el.innerHTML = `
      <div class="hello"><div class="grow"><h2>${esc(greeting())}</h2><p class="hint">${
        total ? `${fmtInt(B.doneToday.length)} de ${plural(total, 'tarefa concluída', 'tarefas concluídas')} hoje` : 'Nenhuma tarefa marcada para hoje'
      }</p></div>${total ? ring(B.doneToday.length / total, { size: 46, stroke: 5, label: `${B.doneToday.length} de ${total} concluídas` }) : ''}</div>
      ${levelCard(S)}
      ${
        B.overdue.length
          ? `<section class="block"><div class="block-head"><h2>Atrasadas<span class="count">${B.overdue.length}</span></h2><button type="button" class="link" data-resched>Reagendar para hoje</button></div>${taskList(B.overdue, { S })}</section>`
          : ''
      }
      <section class="block"><div class="block-head"><h2>${esc(relDay(day))}<span class="count">${B.today.length || ''}</span></h2></div>
        ${taskList(B.today, { S })}
        ${quickAdd({ due: day })}
        ${!B.today.length && !B.overdue.length ? empty({ ic: 'spark', title: B.doneToday.length ? 'Tudo feito por hoje' : 'Dia livre', text: B.doneToday.length ? 'Bom trabalho. Aproveite o resto do dia.' : 'Adicione o que você quer fazer hoje, ou traga algo da Entrada.' }) : ''}
      </section>
      ${
        B.doneToday.length
          ? `<section class="block"><button type="button" class="block-head toggle-done" data-toggledone aria-expanded="${showDone}"><h2>Concluídas<span class="count">${B.doneToday.length}</span></h2>${icon(showDone ? 'up' : 'down', 'sm')}</button>${showDone ? taskList(B.doneToday, { S }) : ''}</section>`
          : ''
      }`;
    bindTasks(el);
    bindQuick(el);
    el.querySelector('[data-resched]')?.addEventListener('click', async () => {
      const ids = B.overdue.map((t) => t.id);
      for (const id of ids) await updateTask(id, { due: day });
      toast(`${plural(ids.length, 'tarefa reagendada', 'tarefas reagendadas')} para hoje`);
    });
    el.querySelector('[data-toggledone]')?.addEventListener('click', () => {
      setPref('showDone', !prefs().showDone);
      todayView.render(el);
    });
  },
};

export const inboxView = {
  title: 'Entrada',
  sub: () => 'Tarefas sem data',
  render(el) {
    const S = P();
    const B = buckets(S);
    el.innerHTML = `<section class="block">
      ${taskList(B.inbox, { S })}
      ${quickAdd({})}
      ${B.inbox.length ? '' : empty({ ic: 'inbox', title: 'Entrada vazia', text: 'Anote aqui tudo o que surgir. Depois é só dar uma data ou uma prioridade.' })}
    </section>`;
    bindTasks(el);
    bindQuick(el);
  },
};

export const upcomingView = {
  title: 'Em breve',
  sub: () => 'Próximos dias',
  render(el) {
    const S = P();
    const day = today();
    const B = buckets(S, day);
    const groups = new Map();
    // Os próximos 7 dias sempre aparecem (com espaço para adicionar), depois só os dias com tarefas.
    for (let i = 1; i <= 7; i++) groups.set(addDays(day, i), []);
    for (const t of B.upcoming) {
      if (!groups.has(t.due)) groups.set(t.due, []);
      groups.get(t.due).push(t);
    }
    const days = [...groups.keys()].sort();
    el.innerHTML = days
      .map(
        (d) => `<section class="block day-block"><div class="block-head"><h2>${esc(daysBetween(day, d) < 7 ? relDay(d, day) : cap(WD[weekday(d)]))}<span class="count">${esc(fmtDayLong(d).split(', ')[1] || '')}</span></h2></div>
        ${taskList(groups.get(d), { S })}${quickAdd({ due: d })}</section>`,
      )
      .join('');
    bindTasks(el);
    el.querySelectorAll('.day-block').forEach(bindQuick);
  },
};
