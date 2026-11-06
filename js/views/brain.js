// Esvaziar a mente (brain dump): escrever tudo de uma vez e depois organizar em quatro caixas,
// inspiradas na matriz de Eisenhower. O que vira tarefa sai daqui.
import { personal, P } from '../state.js';
import { esc } from '../lib/util.js';
import { today } from '../lib/clock.js';
import { icon, sheet, toast } from '../ui/ui.js';
import { popover } from '../ui/pickers.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { editTask } from './tasks.js';

export const QUADS = [
  { id: 'now', name: 'Fazer agora', hint: 'Leva menos de 5 minutos', icon: 'bolt', tone: 'neg' },
  { id: 'schedule', name: 'Agendar', hint: 'Importante, mas tem hora', icon: 'plan', tone: 'acc' },
  { id: 'delegate', name: 'Delegar ou largar', hint: 'Outra pessoa faz, ou não precisa', icon: 'users', tone: 'warn' },
  { id: 'incubator', name: 'Incubadora', hint: 'Ideias para depois', icon: 'bulb', tone: 'pos' },
];

export function openBrain() {
  let closeSheet = null;
  const draw = (el) => {
    const S = P();
    const items = S.brain;
    const loose = items.filter((i) => !i.quadrant || i.quadrant === 'unorganized');
    el.innerHTML = `<form class="brain-in" data-in>
        <textarea name="t" rows="3" placeholder="Escreva tudo o que está na sua cabeça, uma coisa por linha." aria-label="O que está na sua cabeça"></textarea>
        <div class="row"><span class="hint grow">${items.length ? `${items.length} ${items.length === 1 ? 'item' : 'itens'} na mesa` : 'Sem filtro: organize depois.'}</span><button class="btn primary small">${icon('plus')}Anotar</button></div>
      </form>
      ${
        loose.length
          ? `<div class="brain-loose"><h3>Para organizar <span class="count">${loose.length}</span></h3><p class="hint">Toque em cada item para escolher a caixa.</p><ul class="brain-chips">${loose.map(chip).join('')}</ul></div>`
          : ''
      }
      <div class="quads">${QUADS.map((q) => {
        const list = items.filter((i) => i.quadrant === q.id);
        return `<section class="quad tone-${q.tone}"><header>${icon(q.icon)}<div><b>${q.name}</b><small>${q.hint}</small></div><span class="count">${list.length || ''}</span></header>
          <ul class="brain-chips">${list.map(chip).join('') || `<li class="quad-empty">Nada aqui</li>`}</ul></section>`;
      }).join('')}</div>
      ${items.length ? `<button type="button" class="link brain-clear" data-clear>Limpar a mesa</button>` : ''}`;
    const f = el.querySelector('[data-in]');
    f.t.onkeydown = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) f.requestSubmit();
    };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const lines = f.t.value.split('\n').map((x) => x.trim()).filter(Boolean);
      if (!lines.length) return;
      await personal.saveMany(lines.map((text) => ({ type: 'brain', data: { text, quadrant: 'unorganized' } })));
      play('tick');
      haptic('add');
      draw(el);
      el.querySelector('textarea').focus();
    };
    el.querySelectorAll('[data-item]').forEach((b) => (b.onclick = () => itemMenu(b, b.dataset.item, () => draw(el), () => closeSheet?.())));
    el.querySelector('[data-clear]')?.addEventListener('click', async () => {
      const ids = P().brain.map((i) => i.id);
      await personal.removeMany(ids);
      toast('Mesa limpa.');
      draw(el);
    });
  };
  closeSheet = sheet({
    title: 'Esvaziar a mente',
    wide: true,
    body: '<div class="brain" data-brain></div>',
    onMount(el) {
      draw(el.querySelector('[data-brain]'));
      setTimeout(() => el.querySelector('textarea')?.focus(), 120);
    },
  });
}

const chip = (i) => `<li><button type="button" class="brain-chip" data-item="${esc(i.id)}">${esc(i.text)}</button></li>`;

function itemMenu(anchor, id, redraw, closeAll) {
  const item = P().byId.get(id);
  if (!item) return;
  popover(
    anchor,
    (body, close) => {
      body.innerHTML = `<div class="menu">
        ${QUADS.map((q) => `<button type="button" class="pick-opt${item.quadrant === q.id ? ' on' : ''}" data-q="${q.id}"><span class="row">${icon(q.icon)}${q.name}</span></button>`).join('')}
        <hr>
        <button type="button" class="pick-opt" data-task><span class="row">${icon('check')}Virar tarefa</span></button>
        <button type="button" class="pick-opt danger-text" data-del><span class="row">${icon('trash')}Apagar</span></button>
      </div>`;
      body.querySelectorAll('[data-q]').forEach(
        (b) =>
          (b.onclick = async () => {
            close(false);
            await personal.patch(id, { quadrant: b.dataset.q });
            haptic('tick');
            redraw();
          }),
      );
      body.querySelector('[data-task]').onclick = async () => {
        close(false);
        const defaults = { title: item.text, ...(item.quadrant === 'now' ? { due: today(), priority: 'P1' } : {}), ...(item.quadrant === 'schedule' ? { due: today() } : {}) };
        await personal.remove(id);
        closeAll();
        setTimeout(() => editTask(null, defaults), 260);
      };
      body.querySelector('[data-del]').onclick = async () => {
        close(false);
        await personal.remove(id);
        redraw();
      };
    },
    { title: item.text.length > 40 ? item.text.slice(0, 40) + '…' : item.text, minWidth: 240 },
  );
}
