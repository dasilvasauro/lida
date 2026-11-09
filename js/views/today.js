// Telas de tarefas: Hoje e Planejar (Entrada e Próximos dias).
import { P, prefs, setPref, displayName, app, personal } from '../state.js';
import { buckets, updateTask } from '../core/tasks.js';
import { today, now } from '../lib/clock.js';
import { esc, fmtInt, fmtDayLong, relDay, addDays, plural, daysBetween, cap, WD, weekday } from '../lib/util.js';
import { icon, ring, empty, toast, bar, sheet, confirmDialog, colorPicker, readForm, COLORS } from '../ui/ui.js';
import { checkinState, claimCheckin, CHECKIN } from '../core/game.js';
import { celebrate } from './celebrate.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { taskList, bindTasks, quickAdd, bindQuick, sprintCard, bindSprint } from './tasks.js';
import { moodPicker, bindMood } from './me.js';
import { focusCard, bindFocusCard } from './focus.js';
import { focusedTask } from '../core/focus.js';
import { viewBar, bindViewBar, isBoardMode, kanban, bindKanban } from './kanban.js';

function greeting() {
  const h = now().getHours();
  const name = displayName();
  const g = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  return name ? `${g}, ${name}` : g;
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
    // No Painel (telas largas) o botão Lista/Quadro vale para o painel inteiro (ver board.js).
    const inPanel = !!el.closest?.('.board');
    const kb = !inPanel && isBoardMode('hoje');
    el.innerHTML = `
      <div class="hello"><div class="grow"><h2>${esc(greeting())}</h2><p class="hint">${
        total ? `${fmtInt(B.doneToday.length)} de ${plural(total, 'tarefa concluída', 'tarefas concluídas')} hoje` : 'Nenhuma tarefa marcada para hoje'
      }</p></div>${total ? ring(B.doneToday.length / total, { size: 48, stroke: 5, label: `${B.doneToday.length} de ${total} concluídas` }) : ''}</div>
      ${focusCard(S)}
      ${checkinCard(S, day)}
      ${moodPicker(S, day)}
      <div class="tools">
        ${focusedTask(S) ? '' : `<button type="button" class="tool" data-tool="pick-focus">${icon('target')}<span>Focar</span></button>`}
        <button type="button" class="tool" data-tool="focus">${icon('timer')}<span>Pomodoro</span></button>
        <button type="button" class="tool" data-tool="brain">${icon('brain')}<span>Esvaziar a mente</span>${S.brain.length ? `<small>${S.brain.length}</small>` : ''}</button>
      </div>
      ${B.sprint ? sprintCard(B.sprint) : ''}
      ${viewBar(inPanel ? 'painel' : 'hoje')}
      ${kb ? `<section class="block kb-block">${kanban({ screen: 'hoje' }, S)}</section>` : ''}
      ${
        B.overdue.length && !kb
          ? `<section class="block"><div class="block-head"><h2>Atrasadas<span class="count">${B.overdue.length}</span></h2><button type="button" class="link" data-resched>Trazer para hoje</button></div>${taskList(B.overdue, { S })}</section>`
          : ''
      }
      ${
        B.failedToday.length
          ? `<section class="block failed-block"><div class="block-head"><h2>Venceram ontem<span class="count">${B.failedToday.length}</span></h2><button type="button" class="link" data-retry>Reagendar para hoje</button></div>
            <p class="hint">Ainda dá para concluir, mas sem recompensa. Reagendar devolve a tarefa para hoje.</p>${taskList(B.failedToday, { S })}</section>`
          : ''
      }
      ${kb ? '' : `<section class="block"><div class="block-head"><h2>${esc(relDay(day))}<span class="count">${B.today.length || ''}</span></h2></div>
        ${taskList(B.today, { S })}
        ${quickAdd({ due: day })}
        ${!B.today.length && !B.overdue.length ? empty({ ic: 'sparkles', title: B.doneToday.length ? 'Tudo feito por hoje' : 'Dia livre', text: B.doneToday.length ? 'Bom trabalho. Aproveite o resto do dia.' : 'Adicione o que você quer fazer hoje, ou traga algo da Entrada.' }) : ''}
      </section>`}
      ${
        B.doneToday.length
          ? `<section class="block"><button type="button" class="block-head toggle-done" data-toggledone aria-expanded="${showDone}"><h2>Concluídas<span class="count">${B.doneToday.length}</span></h2>${icon(showDone ? 'up' : 'down', 'sm')}</button>${showDone ? taskList(B.doneToday, { S }) : ''}</section>`
          : ''
      }`;
    bindTasks(el);
    if (!kb) bindQuick(el);
    bindViewBar(el);
    bindKanban(el);
    bindSprint(el);
    bindMood(el);
    bindCheckin(el);
    bindFocusCard(el);
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

// Planejar: Próximos dias, Entrada (sem data) e Projetos.
export const planView = {
  title: 'Planejar',
  sub: () => ({ entrada: 'Tarefas sem data', 'em-breve': 'Próximos dias', projetos: 'Projetos', projeto: P().byId.get(planView.pid)?.name || 'Projeto' })[planView.tab] || '',
  tab: 'em-breve',
  pid: null,
  render(el) {
    const S = P();
    const day = today();
    const B = buckets(S, day);
    const tab = planView.tab;
    const inPanel = !!el.closest?.('.board');
    const kb = !inPanel && isBoardMode('planejar');
    const vbar = inPanel ? '' : viewBar('planejar');
    const isTab = (k) => tab === k || (k === 'projetos' && tab === 'projeto') || (kb && k === 'em-breve' && tab === 'entrada');
    // No quadro, Próximos dias e Entrada viram uma aba só: as colunas já separam por data.
    const head = `<div class="seg small plan-tabs" role="tablist">
      <button type="button" role="tab" class="${isTab('em-breve') ? 'on' : ''}" aria-selected="${isTab('em-breve')}" data-tab="em-breve">${kb ? 'Quadro' : 'Próximos dias'}</button>
      ${kb ? '' : `<button type="button" role="tab" class="${isTab('entrada') ? 'on' : ''}" aria-selected="${isTab('entrada')}" data-tab="entrada">Entrada${B.inbox.length ? ` <span class="count">${B.inbox.length}</span>` : ''}</button>`}
      <button type="button" role="tab" class="${isTab('projetos') ? 'on' : ''}" aria-selected="${isTab('projetos')}" data-tab="projetos">Projetos</button>
    </div>`;
    if (kb && (tab === 'em-breve' || tab === 'entrada')) {
      el.innerHTML = `${head}${vbar}<section class="block kb-block">${kanban({ screen: 'planejar' }, S)}</section>`;
      bindKanban(el);
    } else if (tab === 'entrada') {
      el.innerHTML = `${head}${vbar}<section class="block">
        ${taskList(B.inbox, { S })}
        ${quickAdd({})}
        ${B.inbox.length ? '' : empty({ ic: 'inbox', title: 'Entrada vazia', text: 'Anote aqui tudo o que surgir. Depois é só dar uma data ou uma prioridade.' })}
      </section>`;
      bindTasks(el);
      bindQuick(el);
    } else if (tab === 'projetos') {
      el.innerHTML = head + projectList(S);
      el.querySelectorAll('[data-pid]').forEach((b) => (b.onclick = () => app.nav(`projeto-${b.dataset.pid}`)));
      el.querySelector('[data-pnew]').onclick = () => editProject(null);
    } else if (tab === 'projeto') {
      const p = S.byId.get(planView.pid);
      if (!p) {
        el.innerHTML = head + empty({ ic: 'folder', title: 'Projeto não encontrado' });
      } else {
        const all = S.task.filter((t) => t.projectId === p.id && !t.archived);
        const open = all.filter((t) => !t.done && !t.failed);
        const done = all.filter((t) => t.done);
        const dated = open.filter((t) => t.due).sort((a, b) => a.due.localeCompare(b.due));
        const undated = open.filter((t) => !t.due);
        el.innerHTML = `${head}<section class="proj-head" style="--c:${esc(p.color || 'var(--accent)')}">
            <button type="button" class="icon-btn" data-back aria-label="Voltar aos projetos">${icon('back')}</button>
            <i class="dot big"></i><div class="grow"><h2>${esc(p.name)}</h2><small>${plural(open.length, 'tarefa aberta', 'tarefas abertas')}${done.length ? ` · ${done.length} concluídas` : ''}</small></div>
            <button type="button" class="btn small" data-pedit>${icon('edit')}Editar</button></section>
          ${all.length ? bar(all.length ? done.length / all.length : 0, { label: 'Progresso do projeto' }) : ''}
          ${viewBar('projeto')}
          ${isBoardMode('projeto') ? `<section class="block kb-block">${kanban({ screen: 'projeto', projectId: p.id }, S)}</section>` : `${dated.length ? `<section class="block"><div class="block-head"><h2>Com data</h2></div>${taskList(dated, { S, showDue: true })}</section>` : ''}
          <section class="block"><div class="block-head"><h2>Sem data</h2></div>${taskList(undated, { S })}${quickAdd({ projectId: p.id })}</section>`}
          ${done.length ? `<section class="block"><div class="block-head"><h2>Concluídas<span class="count">${done.length}</span></h2></div>${taskList(done.slice(-10).reverse(), { S, showDue: true })}</section>` : ''}`;
        bindTasks(el);
        if (!isBoardMode('projeto')) bindQuick(el);
        bindKanban(el);
        el.querySelector('[data-back]').onclick = () => app.nav('projetos');
        el.querySelector('[data-pedit]').onclick = () => editProject(p);
      }
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
        vbar +
        days
          .map(
            (d, i) => `<section class="block day-block" style="--i:${i}"><div class="block-head"><h2>${esc(daysBetween(day, d) < 7 ? relDay(d, day) : cap(WD[weekday(d)]))}<span class="count">${esc(fmtDayLong(d).split(', ')[1] || '')}</span></h2></div>
          ${taskList(groups.get(d), { S })}${quickAdd({ due: d })}</section>`,
          )
          .join('');
      bindTasks(el);
      el.querySelectorAll('.day-block').forEach(bindQuick);
    }
    bindViewBar(el);
    el.querySelectorAll('[data-tab]').forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.tab === planView.tab) return;
          app.nav(b.dataset.tab);
        }),
    );
  },
};

function projectList(S) {
  const rows = S.project.map((p) => {
    const all = S.task.filter((t) => t.projectId === p.id && !t.archived);
    const open = all.filter((t) => !t.done && !t.failed).length;
    const done = all.filter((t) => t.done).length;
    return `<li><button type="button" class="proj-row" data-pid="${esc(p.id)}" style="--c:${esc(p.color || 'var(--accent)')}"><i class="dot big"></i><span class="grow"><b>${esc(p.name)}</b><small>${plural(open, 'aberta', 'abertas')}${done ? ` · ${done} concluídas` : ''}</small>${all.length ? bar(done / all.length, { cls: 'thin' }) : ''}</span>${icon('right', 'sm')}</button></li>`;
  });
  return `<section class="block"><div class="block-head"><h2>Projetos<span class="count">${S.project.length || ''}</span></h2><button type="button" class="btn small" data-pnew>${icon('plus')}Novo projeto</button></div>
    ${rows.length ? `<ul class="projects">${rows.join('')}</ul>` : empty({ ic: 'folder', title: 'Nenhum projeto ainda', text: 'Projetos agrupam tarefas de um mesmo assunto, como "Casa" ou "Trabalho". Na adição rápida, use #Nome para mandar a tarefa direto para um projeto.' })}</section>`;
}

export function editProject(p) {
  sheet({
    title: p ? 'Editar projeto' : 'Novo projeto',
    body: `<form class="form" data-f>
      <label class="field"><span>Nome</span><input name="name" value="${esc(p?.name || '')}" required autocomplete="off" ${p ? '' : 'autofocus'}></label>
      <div class="field"><span>Cor</span>${colorPicker('color', p?.color || COLORS[P().project.length % COLORS.length])}</div>
      <div class="sheet-actions">${p ? `<button type="button" class="btn ghost danger-text" data-del>${icon('trash')}Excluir</button>` : '<span></span>'}<button class="btn primary">${p ? 'Salvar' : 'Criar projeto'}</button></div></form>`,
    onMount(el, close) {
      el.querySelector('[data-f]').onsubmit = async (e) => {
        e.preventDefault();
        const v = readForm(e.target);
        const id = await personal.save('project', { ...(p ? { order: p.order } : { order: P().project.length }), name: v.name.trim(), color: v.color }, p?.id);
        close();
        if (!p) app.nav(`projeto-${id}`);
      };
      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        const n = P().task.filter((t) => t.projectId === p.id).length;
        if (!(await confirmDialog(`Excluir o projeto "${p.name}"?${n ? ` As ${n} tarefas dele continuam, sem projeto.` : ''}`, { ok: 'Excluir', danger: true, title: 'Excluir projeto' }))) return;
        close();
        for (const t of P().task.filter((x) => x.projectId === p.id)) await updateTask(t.id, { projectId: undefined });
        await personal.remove(p.id);
        app.nav('projetos');
      });
    },
  });
}

/* ---------- Prêmio do dia ---------- */
const prizeText = (p) => [p.gold ? `${p.gold} de ouro` : '', p.xp ? `${p.xp} XP` : '', p.vouchers ? `${p.vouchers} ${p.vouchers === 1 ? 'voucher' : 'vouchers'}` : ''].filter(Boolean).join(' + ');
function checkinCard(S, day) {
  const st = checkinState(S, day);
  const slots = CHECKIN.map((p, i) => {
    const k = i + 1;
    const cls = k < st.n || (st.claimed && k === st.n) ? 'got' : k === st.n ? 'now' : '';
    const ic = p.vouchers ? 'card' : p.xp ? 'sparkles' : 'coin';
    return `<li class="${cls}${k === 7 ? ' big' : ''}"><span class="ci-ic">${icon(cls === 'got' ? 'check' : ic)}</span><b>${p.gold}</b><small>Dia ${k}</small></li>`;
  }).join('');
  if (st.claimed)
    return `<section class="ci done" aria-label="Prêmio do dia"><span class="ci-mini">${icon('gift')}</span><span class="grow">Prêmio do dia resgatado. Amanhã: <b>${esc(prizeText(st.next))}</b></span><ol class="ci-dots" aria-hidden="true">${CHECKIN.map((_, i) => `<i class="${i < st.n ? 'on' : ''}"></i>`).join('')}</ol></section>`;
  return `<section class="ci card" aria-label="Prêmio do dia">
    <div class="ci-head"><div class="grow"><b>Prêmio do dia</b><small>${st.reset ? 'A sequência recomeçou: hoje é o dia 1.' : `Dia ${st.n} de 7. Volte todo dia: o prêmio cresce e o maior vem no 7º.`}</small></div></div>
    <ol class="ci-days">${slots}</ol>
    <button type="button" class="btn primary wide ci-claim" data-claim>${icon('gift')}Resgatar ${esc(prizeText(st.prize))}</button>
  </section>`;
}
function bindCheckin(el) {
  el.querySelector('[data-claim]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const card = btn.closest('.ci');
    card.classList.add('claiming');
    haptic('done');
    play(checkinState().n === 7 ? 'levelup' : 'purchase');
    app.hold = true;
    const r = await claimCheckin();
    setTimeout(() => {
      app.hold = false;
      app.refresh();
    }, 700);
    if (!r) return;
    setTimeout(() => celebrate(r.n === 7 ? 'Semana completa! Prêmio máximo' : `Prêmio do dia ${r.n}`, { xp: r.prize.xp || 0, gold: r.prize.gold }, r), 250);
  });
}
