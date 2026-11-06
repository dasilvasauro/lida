// Telas de tarefas: Hoje e Planejar (Entrada e Próximos dias).
import { P, prefs, setPref, displayName, app } from '../state.js';
import { buckets, updateTask } from '../core/tasks.js';
import { levelTitle } from '../core/model.js';
import { boosts, levelProgress } from '../core/game.js';
import { today, now, nowMs } from '../lib/clock.js';
import { esc, fmtInt, fmtDayLong, relDay, addDays, plural, daysBetween, cap, WD, weekday } from '../lib/util.js';
import { icon, ring, bar, empty, toast } from '../ui/ui.js';
import { taskList, bindTasks, quickAdd, bindQuick, sprintCard, bindSprint } from './tasks.js';

function greeting() {
  const h = now().getHours();
  const name = displayName();
  const g = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return name ? `${g}, ${name}` : g;
}

export function levelCard(S) {
  const m = S.money;
  const lp = levelProgress(m);
  const b = boosts(S);
  const hrs = (until) => Math.max(1, Math.round((until - nowMs()) / 3600000));
  return `<a class="lvl" href="#loja" aria-label="Nível ${m.level}, ${fmtInt(m.gold)} de ouro. Abrir a Loja">
    <div class="lvl-badge" aria-hidden="true">${m.level}</div>
    <div class="lvl-info">
      <div class="row"><b>Nível ${m.level} · ${esc(levelTitle(m.level))}</b><span>${fmtInt(lp.into)} / ${fmtInt(lp.need)} XP</span></div>
      ${bar(lp.frac, { label: 'Progresso até o próximo nível' })}
      <div class="wallet"><span class="gold">${icon('coin')}<b data-count="gold">${fmtInt(m.gold)}</b></span><span class="vouch">${icon('card')}<b>${fmtInt(m.vouchers)}</b><i class="vdots" aria-label="${m.voucherProgress} de 3 para o próximo voucher">${[0, 1, 2].map((k) => `<i class="${k < m.voucherProgress ? 'on' : ''}"></i>`).join('')}</i></span>
        ${b.xp ? `<span class="boost">${icon('up')}XP ${hrs(b.xpUntil)} h</span>` : ''}${b.gold ? `<span class="boost">${icon('coin')}Ouro ${hrs(b.goldUntil)} h</span>` : ''}</div>
    </div>
  </a>`;
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
      }</p></div>${total ? ring(B.doneToday.length / total, { size: 48, stroke: 5, label: `${B.doneToday.length} de ${total} concluídas` }) : ''}</div>
      ${levelCard(S)}
      <div class="tools">
        <button type="button" class="tool" data-tool="focus">${icon('timer')}<span>Pomodoro</span></button>
        <button type="button" class="tool" data-tool="brain">${icon('brain')}<span>Esvaziar a mente</span>${S.brain.length ? `<small>${S.brain.length}</small>` : ''}</button>
      </div>
      ${B.sprint ? sprintCard(B.sprint) : ''}
      ${
        B.overdue.length
          ? `<section class="block"><div class="block-head"><h2>Atrasadas<span class="count">${B.overdue.length}</span></h2><button type="button" class="link" data-resched>Trazer para hoje</button></div>${taskList(B.overdue, { S })}</section>`
          : ''
      }
      ${
        B.failedToday.length
          ? `<section class="block failed-block"><div class="block-head"><h2>Venceram ontem<span class="count">${B.failedToday.length}</span></h2><button type="button" class="link" data-retry>Reagendar para hoje</button></div>
            <p class="hint">Ainda dá para concluir, mas sem recompensa. Reagendar devolve a tarefa para hoje.</p>${taskList(B.failedToday, { S })}</section>`
          : ''
      }
      <section class="block"><div class="block-head"><h2>${esc(relDay(day))}<span class="count">${B.today.length || ''}</span></h2></div>
        ${taskList(B.today, { S })}
        ${quickAdd({ due: day })}
        ${!B.today.length && !B.overdue.length ? empty({ ic: 'sparkles', title: B.doneToday.length ? 'Tudo feito por hoje' : 'Dia livre', text: B.doneToday.length ? 'Bom trabalho. Aproveite o resto do dia.' : 'Adicione o que você quer fazer hoje, ou traga algo da Entrada.' }) : ''}
      </section>
      ${
        B.doneToday.length
          ? `<section class="block"><button type="button" class="block-head toggle-done" data-toggledone aria-expanded="${showDone}"><h2>Concluídas<span class="count">${B.doneToday.length}</span></h2>${icon(showDone ? 'up' : 'down', 'sm')}</button>${showDone ? taskList(B.doneToday, { S }) : ''}</section>`
          : ''
      }`;
    bindTasks(el);
    bindQuick(el);
    bindSprint(el);
    el.querySelectorAll('[data-tool]').forEach((b) => (b.onclick = () => app.actions.tool(b.dataset.tool)));
    el.querySelector('[data-resched]')?.addEventListener('click', async () => {
      const ids = B.overdue.map((t) => t.id);
      for (const id of ids) await updateTask(id, { due: day });
      toast(`${plural(ids.length, 'tarefa trazida', 'tarefas trazidas')} para hoje`);
    });
    el.querySelector('[data-retry]')?.addEventListener('click', async () => {
      for (const t of B.failedToday) await updateTask(t.id, { due: day, failed: undefined });
      toast('Reagendadas para hoje. Desta vez vai.');
    });
    el.querySelector('[data-toggledone]')?.addEventListener('click', () => {
      setPref('showDone', !prefs().showDone);
      todayView.render(el);
    });
  },
};

// Planejar: a Entrada (sem data) e os próximos dias, numa tela só.
export const planView = {
  title: 'Planejar',
  sub: () => (planView.tab === 'entrada' ? 'Tarefas sem data' : 'Próximos dias'),
  tab: 'em-breve',
  render(el) {
    const S = P();
    const day = today();
    const B = buckets(S, day);
    const tab = planView.tab;
    const head = `<div class="seg small plan-tabs" role="tablist">
      <button type="button" role="tab" class="${tab === 'em-breve' ? 'on' : ''}" aria-selected="${tab === 'em-breve'}" data-tab="em-breve">Próximos dias</button>
      <button type="button" role="tab" class="${tab === 'entrada' ? 'on' : ''}" aria-selected="${tab === 'entrada'}" data-tab="entrada">Entrada${B.inbox.length ? ` <span class="count">${B.inbox.length}</span>` : ''}</button>
    </div>`;
    if (tab === 'entrada') {
      el.innerHTML = `${head}<section class="block">
        ${taskList(B.inbox, { S })}
        ${quickAdd({})}
        ${B.inbox.length ? '' : empty({ ic: 'inbox', title: 'Entrada vazia', text: 'Anote aqui tudo o que surgir. Depois é só dar uma data ou uma prioridade.' })}
      </section>`;
      bindTasks(el);
      bindQuick(el);
    } else {
      const groups = new Map();
      // Os próximos 7 dias sempre aparecem (com espaço para adicionar), depois só os dias com tarefas.
      for (let i = 1; i <= 7; i++) groups.set(addDays(day, i), []);
      for (const t of B.upcoming) {
        if (!groups.has(t.due)) groups.set(t.due, []);
        groups.get(t.due).push(t);
      }
      const days = [...groups.keys()].sort();
      el.innerHTML =
        head +
        days
          .map(
            (d, i) => `<section class="block day-block" style="--i:${i}"><div class="block-head"><h2>${esc(daysBetween(day, d) < 7 ? relDay(d, day) : cap(WD[weekday(d)]))}<span class="count">${esc(fmtDayLong(d).split(', ')[1] || '')}</span></h2></div>
          ${taskList(groups.get(d), { S })}${quickAdd({ due: d })}</section>`,
          )
          .join('');
      bindTasks(el);
      el.querySelectorAll('.day-block').forEach(bindQuick);
    }
    el.querySelectorAll('[data-tab]').forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.tab === planView.tab) return;
          app.nav(b.dataset.tab);
        }),
    );
  },
};
