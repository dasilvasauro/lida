// "?" ao lado dos títulos das seções (explicação curta) e o manual completo (Ajustes > Ajuda e manual).
import { CHAPTERS, TOPICS } from '../core/help.js';
import { esc, norm } from '../lib/util.js';
import { icon, sheet } from './ui.js';
import { tr } from '../core/i18n.js';
import { HUB_CARD } from '../core/hub.js';
import { openHubCard } from '../views/hub.js';

// Botão "?" (dentro de um título). id: tópico de core/help.js.
const QMARK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.7 6.1a2.35 2.35 0 0 1 4.6.6c0 1.55-2.3 1.95-2.3 3.35"/><path d="M8 12.6h.01" stroke-width="2.6"/></svg>';
export const helpQ = (id) => (TOPICS[id] ? `<button type="button" class="help-q" data-help="${id}" aria-label="Ajuda: ${esc(TOPICS[id].title)}">${QMARK}</button>` : '');

let pop = null;
const hide = () => {
  pop?.remove();
  pop = null;
};
export function initHelp() {
  document.addEventListener(
    'click',
    (e) => {
      const b = e.target.closest('[data-help]');
      if (!b) {
        if (pop && !e.target.closest('.help-pop')) hide();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (pop?._for === b) return hide();
      hide();
      const tp = TOPICS[b.dataset.help];
      pop = document.createElement('div');
      pop.className = 'help-pop';
      pop.setAttribute('role', 'dialog');
      pop._for = b;
      const hc = tp.hub && HUB_CARD.get(tp.hub);
      pop.innerHTML = `<b>${esc(tp.title)}</b><p>${esc(tp.short)}</p><button type="button" class="link" data-more>${icon('right', 'sm')}Ler mais no manual</button>${hc ? `<button type="button" class="link" data-hub>${icon('book', 'sm')}<span>No Hub: <span>${esc(tr(hc.title))}</span></span></button>` : ''}`;
      document.body.appendChild(pop);
      const r = b.getBoundingClientRect();
      const w = Math.min(300, window.innerWidth - 24);
      pop.style.maxWidth = `${w}px`;
      const pw = pop.offsetWidth;
      const left = Math.min(Math.max(12, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 12);
      let top = r.bottom + 8;
      if (top + pop.offsetHeight > window.innerHeight - 12) top = r.top - pop.offsetHeight - 8;
      pop.style.left = `${left}px`;
      pop.style.top = `${Math.max(8, top)}px`;
      pop.querySelector('[data-hub]')?.addEventListener('click', () => {
        hide();
        openHubCard(tp.hub);
      });
      pop.querySelector('[data-more]').onclick = () => {
        const id = b.dataset.help;
        hide();
        openManual(id);
      };
    },
    true,
  );
  window.addEventListener('scroll', hide, { passive: true });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && hide());
}

// Manual: capítulos com os tópicos (abre no tópico pedido), busca e "Rever o tour".
export function openManual(topicId = null, { onTour } = {}) {
  sheet({
    title: 'Ajuda e manual',
    wide: true,
    body: `<div class="manual">
      <div class="manual-top">
        <label class="field manual-search"><span class="sr-only">Buscar no manual</span><input type="search" placeholder="Buscar no manual" data-msearch></label>
        ${onTour ? `<button type="button" class="btn small" data-tour>${icon('sparkles')}Rever o tour</button>` : ''}
        <a class="btn small" href="#hub" data-mhubidx>${icon('book')}Hub de Produtividade</a>
      </div>
      ${CHAPTERS.map(
        (c) => `<section class="manual-ch" data-ch><h3>${esc(c.title)}</h3>${c.topics
          .map(
            (tp) => `<details class="manual-tp" data-tp="${tp.id}"${tp.id === topicId ? ' open' : ''}><summary>${esc(tp.title)}</summary><p class="manual-short">${esc(tp.short)}</p>${tp.body.map((p) => `<p>${esc(p)}</p>`).join('')}${tp.hub && HUB_CARD.get(tp.hub) ? `<p class="manual-hub"><button type="button" class="link" data-mhub="${tp.hub}">${icon('book', 'sm')}<span>No Hub: <span>${esc(tr(HUB_CARD.get(tp.hub).title))}</span></span></button></p>` : ''}</details>`,
          )
          .join('')}</section>`,
      ).join('')}
      <p class="hint manual-none" data-mnone hidden>Nada encontrado no manual.</p>
    </div>`,
    onMount(el, close) {
      if (topicId) setTimeout(() => el.querySelector(`[data-tp="${topicId}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250);
      el.querySelector('[data-tour]')?.addEventListener('click', () => (close(), setTimeout(onTour, 350)));
      el.querySelector('[data-mhubidx]').addEventListener('click', () => close());
      el.querySelectorAll('[data-mhub]').forEach((b) => (b.onclick = () => (close(), setTimeout(() => openHubCard(b.dataset.mhub), 300))));
      el.querySelector('[data-msearch]').oninput = (e) => {
        const q = norm(e.target.value);
        let any = false;
        el.querySelectorAll('[data-tp]').forEach((d) => {
          const hit = !q || norm(d.textContent).includes(q);
          d.hidden = !hit;
          if (q && hit) d.open = true;
          any ||= hit;
        });
        el.querySelectorAll('[data-ch]').forEach((c) => (c.hidden = ![...c.querySelectorAll('[data-tp]')].some((d) => !d.hidden)));
        el.querySelector('[data-mnone]').hidden = any;
      };
    },
  });
}
