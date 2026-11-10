// Painel (telas largas): Hoje, Planejar e uma coluna de apoio na mesma tela, sem espaços vazios.
// Abaixo de 1200 px cada seção continua sendo uma tela (Hoje e Planejar separados).
import { P, app } from '../state.js';
import { todayView, planView } from './today.js';
import * as H from '../core/habits.js';
import { glance } from '../core/glance.js';
import { dayIPL, grade } from '../core/ipl.js';
import { today } from '../lib/clock.js';
import { esc, fmtDayLong, plural } from '../lib/util.js';
import { icon, toast } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { isBoardMode, viewBar, bindViewBar, kanban, bindKanban } from './kanban.js';
import { sprintCard, bindSprint } from './tasks.js';
import { buckets } from '../core/tasks.js';

export const BOARD_MQ = '(min-width: 1200px)';
export const isBoard = () => matchMedia(BOARD_MQ).matches;

// Três anéis concêntricos (tarefas, hábitos, água), os mesmos do widget.
export function ringsSvg(g, size = 132) {
  const rows = [
    ['var(--accent)', g.tasks.total ? g.tasks.done / g.tasks.total : 0],
    ['var(--pos)', g.habits.total ? g.habits.done / g.habits.total : 0],
    ['var(--p2)', g.water.goal ? g.water.ml / g.water.goal : 0],
  ];
  const sw = 11;
  const gap = 4;
  const c = size / 2;
  const arcs = rows
    .map(([col, f], i) => {
      const r = c - sw / 2 - i * (sw + gap) - 1;
      const L = 2 * Math.PI * r;
      return `<circle cx="${c}" cy="${c}" r="${r}" class="ring-track" stroke-width="${sw}"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - Math.min(1, f))}" transform="rotate(-90 ${c} ${c})" class="ring-arc"/>`;
    })
    .join('');
  return `<svg class="rings" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Tarefas ${g.tasks.done} de ${g.tasks.total}, hábitos ${g.habits.done} de ${g.habits.total}, água ${g.water.ml} de ${g.water.goal} ml">${arcs}</svg>`;
}

const L = (ml) => (ml >= 1000 ? `${(ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L` : `${ml} ml`);

function side(S) {
  const d = today();
  const g = glance(S, d);
  const ipl = dayIPL(S, d, { live: true });
  const hs = S.habit.filter((h) => !h.archived && H.isScheduled(h, d));
  return `
    <section class="side-card rings-card">
      ${ringsSvg(g)}
      <ul class="rings-legend">
        <li><i style="background:var(--accent)"></i><span>Tarefas</span><b>${g.tasks.done}/${g.tasks.total}</b></li>
        <li><i style="background:var(--pos)"></i><span>Hábitos</span><b>${g.habits.done}/${g.habits.total}</b></li>
        <li><i style="background:var(--p2)"></i><span>Água</span><b>${L(g.water.ml)}</b></li>
        ${ipl.score != null ? `<li class="ipl-mini"><a href="#eu" title="IPL de hoje, até agora"><span>IPL hoje</span><b>${ipl.score}</b><small>${grade(ipl.score)}</small></a></li>` : ''}
      </ul>
    </section>
    <section class="side-card">
      <div class="side-head"><h3>Hábitos de hoje</h3><a href="#habitos" class="link">Ver todos</a></div>
      ${
        hs.length
          ? `<ul class="side-habits">${hs
              .map((h) => {
                const done = H.isDone(S, h, d);
                const c = H.logOf(S, h, d)?.count || 0;
                return `<li><button type="button" class="sh-tap${done ? ' done' : ''}" data-sh="${esc(h.id)}" style="--c:${esc(h.color || 'var(--accent)')}" aria-label="${esc(h.title)}">${done ? icon('check', 'sm') : h.icon ? `<span>${esc(h.icon)}</span>` : `<b>${esc((h.title || '?')[0].toUpperCase())}</b>`}</button><span class="grow">${esc(h.title)}${(h.goal || 1) > 1 ? `<small>${c} de ${h.goal}</small>` : ''}</span></li>`;
              })
              .join('')}</ul>`
          : '<p class="hint">Nenhum hábito programado para hoje.</p>'
      }
    </section>
    <section class="side-card">
      <div class="side-head"><h3>Água</h3><span class="hint">${L(g.water.ml)} de ${L(g.water.goal)}</span></div>
      <div class="side-water"><span class="sw-bar"><i style="width:${Math.min(100, (g.water.ml / g.water.goal) * 100)}%"></i></span>
        <div class="sw-btns"><button type="button" class="btn small" data-sw="${H.waterGlass(S)}">Copo<small>${L(H.waterGlass(S))}</small></button><button type="button" class="btn small" data-sw="${H.waterBottle(S)}">Garrafa<small>${L(H.waterBottle(S))}</small></button></div></div>
    </section>`;
}

export const boardView = {
  title: 'Hoje',
  sub: () => fmtDayLong(today()),
  render(el) {
    const S = P();
    if (isBoardMode('painel')) {
      // Quadro no Painel: as colunas de tarefas ocupam o lugar de Hoje e Planejar; o resumo fica.
      const sp = buckets(S, today()).sprint;
      el.innerHTML = `<div class="board kb-wide">
        <div class="board-col b-kb">${viewBar('painel')}${sp ? sprintCard(sp) : ''}${kanban({ screen: 'painel' }, S)}</div>
        <aside class="board-col b-side" aria-label="Resumo do dia">${side(S)}</aside>
      </div>`;
      bindViewBar(el);
      bindKanban(el);
      bindSprint(el);
      bindSide(el);
      return;
    }
    el.innerHTML = `<div class="board">
      <div class="board-col b-today"></div>
      <div class="board-col b-plan"><div class="b-plan-title"><h2>Planejar</h2><span class="hint">${plural(S.task.filter((t) => !t.done && !t.failed && !t.archived && !t.due && t.kind !== 'routine').length, 'tarefa', 'tarefas')} na entrada</span></div><div class="b-plan-body"></div></div>
      <aside class="board-col b-side" aria-label="Resumo do dia">${side(S)}</aside>
    </div>`;
    todayView.render(el.querySelector('.b-today'));
    planView.render(el.querySelector('.b-plan-body'));
    bindSide(el);
  },
};

function bindSide(el) {
    el.querySelectorAll('[data-sh]').forEach(
      (b) =>
        (b.onclick = async () => {
          const h = P().byId.get(b.dataset.sh);
          if (!h) return;
          haptic('tick');
          const r = await H.tap(h);
          if (r.completed) play('complete');
          app.refresh();
        }),
    );
    el.querySelectorAll('[data-sw]').forEach(
      (b) =>
        (b.onclick = async () => {
          const r = await H.addWater(Number(b.dataset.sw));
          play('water');
          if (r.hit) play('complete');
          if (r.streakPrize) toast(`Ofensiva de ${r.streakPrize.days} dias de água: +200 XP e +200 de ouro!`, { ms: 5000 });
          app.refresh();
        }),
    );
}
