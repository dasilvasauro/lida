// Revisão de ontem (antes de fechar o dia): o que era para ontem e ficou sem marcar — tarefas,
// hábitos e água. Marcar aqui vale para ontem (recompensa normal, conta no IPL de ontem).
// Só aparece quando o último dia aberto foi ontem (ver main.js). Fechar a folha fecha o dia.
import { P } from '../state.js';
import { toggleTask } from '../core/tasks.js';
import * as H from '../core/habits.js';
import { esc, fmtTime, fmtDayLong, fmtMl, cap } from '../lib/util.js';
import { icon, sheet, COLORS } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';

export const leftovers = H.leftovers;

function taskMeta(S, t) {
  const p = t.projectId && S.byId.get(t.projectId);
  const m = [t.time ? `<span>${icon('timer')}${esc(fmtTime(t.time))}</span>` : '', t.kind === 'routine' ? `<span>${icon('repeat')}Rotina</span>` : '', p ? `<span class="tag"><i class="dot" style="--c:${esc(p.color || 'var(--dim)')}"></i>${esc(p.name)}</span>` : ''].filter(Boolean);
  return m.length ? `<div class="task-meta">${m.join('')}</div>` : '';
}

export function reviewYesterday(y, left) {
  return new Promise((resolve) => {
    const S = P();
    const doneTasks = new Set();
    const doneHabits = new Map(); // id -> contagem anterior (para desfazer)
    let waterAdded = 0;
    const total = left.tasks.length + left.habits.length + (left.water ? 1 : 0);
    const sec = (ic, title, n, body, cls = '') => `<section class="rv-sec ${cls}"><header>${icon(ic)}<h3>${title}</h3>${n != null ? `<span class="count">${n}</span>` : ''}</header>${body}</section>`;
    const tasksHtml = left.tasks.length
      ? sec(
          'check',
          'Tarefas',
          left.tasks.length,
          `<ul class="tasks rv-list">${left.tasks
            .map(
              (t) => `<li class="task rv-item" data-rtask="${esc(t.id)}"><button type="button" class="task-check" data-p="${esc(t.kind === 'routine' ? 'R' : t.priority || 'P4')}" aria-label="Fiz: ${esc(t.title)}" aria-pressed="false">${icon('check')}</button>
                <div class="task-body"><span class="task-title">${esc(t.title)}</span>${taskMeta(S, t)}</div></li>`,
            )
            .join('')}</ul>`,
        )
      : '';
    const habitsHtml = left.habits.length
      ? sec(
          'habit',
          'Hábitos',
          left.habits.length,
          `<div class="rv-habits">${left.habits
            .map((h, i) => {
              const c = H.logOf(S, h, y)?.count || 0;
              const goal = h.goal || 1;
              const color = h.color || COLORS[i % COLORS.length];
              return `<button type="button" class="rv-habit" data-rhab="${esc(h.id)}" style="--c:${esc(color)}" aria-pressed="false">
                <span class="rvh-face">${h.icon ? `<span class="emoji">${esc(h.icon)}</span>` : `<b>${esc((h.title || '?')[0].toUpperCase())}</b>`}<i class="rvh-ok">${icon('check', 'sm')}</i></span>
                <span class="rvh-txt"><b>${esc(h.title || 'Hábito')}</b><small data-rhsub>${goal > 1 ? `${c} de ${goal}${h.unit ? ` ${esc(h.unit)}` : ''}` : 'Não marcado'}</small></span>
              </button>`;
            })
            .join('')}</div>`,
        )
      : '';
    const waterHtml = left.water
      ? sec(
          'water',
          'Água',
          null,
          `<div class="rv-water"><div class="rvw-top"><b data-rwml>${fmtMl(left.water.ml)}</b><span>de ${fmtMl(left.water.goal)}</span></div>
            <span class="rvw-bar"><i data-rwbar style="width:${Math.min(100, (left.water.ml / left.water.goal) * 100)}%"></i></span>
            <div class="rvw-btns"><button type="button" class="btn small" data-rw="${H.waterGlass(S)}">${icon('plus', 'sm')}Copo<small>${fmtMl(H.waterGlass(S))}</small></button><button type="button" class="btn small" data-rw="${H.waterBottle(S)}">${icon('plus', 'sm')}Garrafa<small>${fmtMl(H.waterBottle(S))}</small></button><button type="button" class="btn small" data-rwgoal>${icon('check', 'sm')}Bati a meta</button><button type="button" class="btn small ghost" data-rwundo hidden>Desfazer</button></div></div>`,
          'rv-water-sec',
        )
      : '';
    sheet({
      title: 'Antes de fechar ontem',
      body: `<div class="rv">
        <p class="rv-date">${esc(cap(fmtDayLong(y)))}</p>
        <p class="sheet-text">${total === 1 ? 'Ficou uma coisa' : `Ficaram ${total} coisas`} de ontem sem marcar. Se você fez e esqueceu, marque agora: conta para ontem, com a recompensa normal. O que ficar sem marcar conta como não feito, e só então o IPL de ontem é calculado.</p>
        ${tasksHtml}${habitsHtml}${waterHtml}
        <div class="sheet-actions rv-actions"><button type="button" class="btn primary wide" data-closeday>${icon('check')}<span data-cdl>Fechar o dia de ontem</span></button></div>
      </div>`,
      onMount(el, close) {
        const label = el.querySelector('[data-cdl]');
        const paint = () => {
          const n = doneTasks.size + doneHabits.size + (left.water && waterAdded && left.water.ml + waterAdded >= left.water.goal ? 1 : 0);
          label.textContent = n ? `Fechar o dia · ${n} de ${total} em dia` : 'Fechar o dia de ontem';
        };
        const busy = async (b, fn) => {
          if (b.disabled) return;
          b.disabled = true;
          try {
            await fn();
          } finally {
            b.disabled = false;
            paint();
          }
        };
        // Tarefas
        el.querySelectorAll('[data-rtask]').forEach((li) => {
          const btn = li.querySelector('.task-check');
          const id = li.dataset.rtask;
          btn.onclick = () =>
            busy(btn, async () => {
              const on = !doneTasks.has(id);
              li.classList.toggle('done', on);
              btn.classList.toggle('on', on);
              btn.setAttribute('aria-pressed', String(on));
              if (on) {
                btn.classList.add('popping');
                setTimeout(() => btn.classList.remove('popping'), 450);
                play('complete');
                haptic('done');
                await toggleTask(id, { on: y });
                doneTasks.add(id);
              } else {
                play('uncheck');
                await toggleTask(id);
                doneTasks.delete(id);
              }
            });
        });
        // Hábitos: um toque marca a meta de ontem inteira; outro toque volta como estava.
        el.querySelectorAll('[data-rhab]').forEach((b) => {
          const h = P().byId.get(b.dataset.rhab);
          b.onclick = () =>
            busy(b, async () => {
              const on = !doneHabits.has(h.id);
              b.classList.toggle('on', on);
              b.setAttribute('aria-pressed', String(on));
              const sub = b.querySelector('[data-rhsub]');
              if (on) {
                doneHabits.set(h.id, H.logOf(P(), h, y)?.count || 0);
                play('progress', { fraction: 1 });
                haptic('done');
                await H.setCount(h, h.goal || 1, y);
                sub.textContent = 'Feito ontem';
              } else {
                const prev = doneHabits.get(h.id) || 0;
                doneHabits.delete(h.id);
                play('uncheck');
                await H.setCount(h, prev, y);
                sub.textContent = (h.goal || 1) > 1 ? `${prev} de ${h.goal}${h.unit ? ` ${h.unit}` : ''}` : 'Não marcado';
              }
            });
        });
        // Água
        const ws = el.querySelector('.rv-water-sec');
        if (ws) {
          const paintWater = () => {
            const ml = left.water.ml + waterAdded;
            ws.querySelector('[data-rwml]').textContent = fmtMl(ml);
            ws.querySelector('[data-rwbar]').style.width = `${Math.min(100, (ml / left.water.goal) * 100)}%`;
            ws.classList.toggle('hit', ml >= left.water.goal);
            ws.querySelector('[data-rwundo]').hidden = !waterAdded;
          };
          const add = async (ml) => {
            await H.addWater(ml, y);
            waterAdded += ml;
            play('water');
            haptic('tick');
            if (left.water.ml + waterAdded >= left.water.goal) play('complete');
            paintWater();
          };
          ws.querySelectorAll('[data-rw]').forEach((b) => (b.onclick = () => busy(b, () => add(Number(b.dataset.rw)))));
          const g = ws.querySelector('[data-rwgoal]');
          g.onclick = () => busy(g, () => add(Math.max(0, left.water.goal - left.water.ml - waterAdded) || H.waterGlass(P())));
          const u = ws.querySelector('[data-rwundo]');
          u.onclick = () =>
            busy(u, async () => {
              // Desfaz tudo o que foi somado aqui (um registro por toque).
              while (waterAdded > 0) {
                const before = H.waterToday(P(), y);
                await H.undoWater(y);
                const after = H.waterToday(P(), y);
                if (after >= before) break;
                waterAdded = Math.max(0, waterAdded - (before - after));
              }
              play('uncheck');
              paintWater();
            });
        }
        el.querySelector('[data-closeday]').onclick = close;
      },
      onClose: () => resolve({ tasks: doneTasks.size, habits: doneHabits.size, water: waterAdded }),
    });
  });
}
