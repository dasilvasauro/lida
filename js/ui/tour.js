// Tour de boas-vindas: passo a passo pelas seções, destacando um elemento por vez e escurecendo o
// resto. Aparece na primeira abertura de uma conta nova (uma vez por aparelho) e pode ser
// visto de novo em Ajustes > Ajuda e manual.
import { icon } from './ui.js';
import { haptic } from './haptics.js';

const KEY = 'lida.tour';
const STEPS = [
  { title: 'Boas-vindas ao Lida', text: 'Um passeio rápido pelas partes principais. Leva menos de um minuto, e dá para ver de novo em Ajustes > Ajuda e manual.' },
  { route: 'hoje', sel: '[data-nav="hoje"]', title: 'Hoje', text: 'O que é para hoje: tarefas com data, atrasadas, rotinas e o que você já concluiu. Toque no círculo para concluir; segure para editar.', wide: { title: 'Painel', text: 'Na tela larga, o Painel junta o dia, a Entrada, os próximos dias e os projetos lado a lado. Toque no círculo para concluir; arraste entre as colunas para mudar a data.' } },
  { route: 'hoje', sel: '.fab, .nav-new', title: 'Adicionar tarefa', text: 'Escreva como você fala: "Pagar luz amanhã 9h p1 #Casa". Data, hora, prioridade e projeto saem sozinhos.' },
  { route: 'hoje', sel: '[data-streak]', title: 'Ofensiva', text: 'Dias seguidos cumprindo a meta do dia. A chama acende quando você faz a parte combinada do que estava programado.' },
  { route: 'hoje', sel: '.tools, .rail-tools:not(.rail-projects)', title: 'Foco', text: 'Ponha uma tarefa em foco, use o Pomodoro (com tique e metrônomo, se quiser) ou esvazie a mente antes de organizar.' },
  { route: 'planejar', sel: '[data-nav="planejar"]', title: 'Planejar', text: 'A Entrada guarda o que ainda não tem data, Próximos dias mostra a semana e Projetos agrupa por assunto. Também em quadro.', narrow: true },
  { route: 'habitos', sel: '[data-nav="habitos"]', title: 'Hábitos', text: 'Hábitos com meta e sequência, água, rotinas e o Desapego, para o que você quer largar.' },
  { route: 'loja', sel: '[data-nav="loja"]', title: 'Loja', text: 'Concluir rende XP e ouro. Na Loja, o ouro e os vouchers viram itens, temas e sons.' },
  { route: 'eu', sel: '[data-nav="eu"]', title: 'Eu', text: 'Seu nível, o Lidinho, o IPL (a nota do dia), conquistas, humor, visão e reflexões.' },
  { route: 'eu', sel: '[data-me]', title: 'Ajustes e ajuda', text: 'Aparência, idioma, lembretes, alarmes, backup e a chave de recuperação. O manual completo também fica lá, e o "?" ao lado das seções explica cada uma.' },
];

export const tourSeen = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* sem armazenamento */
  }
};

let running = false;
// nav: (route) => void, para trocar de seção durante o tour
export function startTour(nav) {
  if (running) return;
  running = true;
  const wrap = document.createElement('div');
  wrap.className = 'tour';
  wrap.innerHTML = `<div class="tour-hole" aria-hidden="true"></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-live="polite">
      <small class="tour-n" data-n></small><h3 data-t></h3><p data-x></p>
      <div class="tour-btns"><button type="button" class="link" data-skip>Pular</button><span class="grow"></span>
        <button type="button" class="icon-btn round" data-prev aria-label="Anterior">${icon('left')}</button>
        <button type="button" class="btn primary" data-next></button></div>
    </div>`;
  document.body.appendChild(wrap);
  const hole = wrap.querySelector('.tour-hole');
  const card = wrap.querySelector('.tour-card');
  // Tela larga: o Painel faz o papel de Planejar (que some do menu).
  const wide = document.documentElement.classList.contains('board-wide');
  const steps = STEPS.filter((s) => !(wide && s.narrow)).map((s) => (wide && s.wide ? { ...s, ...s.wide } : s));
  let i = 0;
  let target = null;

  const place = () => {
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!target) {
      hole.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0;`;
      card.style.cssText = `left:${Math.max(12, (vw - card.offsetWidth) / 2)}px;top:${Math.max(12, (vh - card.offsetHeight) / 2)}px;`;
      return;
    }
    const r = target.getBoundingClientRect();
    const w = r.width + pad * 2;
    const h = r.height + pad * 2;
    hole.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${w}px;height:${h}px;border-radius:${Math.min(22, h / 2)}px;`;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const below = r.bottom + pad + 12;
    const top = below + ch < vh - 12 ? below : Math.max(12, r.top - pad - 12 - ch);
    const left = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), vw - cw - 12);
    card.style.cssText = `left:${left}px;top:${top}px;`;
  };
  // (offsetParent não serve: é nulo em elementos fixos, como o botão de adicionar)
  const find = (sel) => [...document.querySelectorAll(sel)].find((el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]')) || null;

  const show = async () => {
    const s = steps[i];
    if (s.route && !location.hash.startsWith(`#${s.route}`)) {
      nav(s.route);
      await new Promise((r) => setTimeout(r, 450));
    }
    target = s.sel ? find(s.sel) : null;
    if (target) target.scrollIntoView({ block: 'center', behavior: 'instant' });
    card.querySelector('[data-n]').textContent = `${i + 1} / ${steps.length}`;
    card.querySelector('[data-t]').textContent = s.title;
    card.querySelector('[data-x]').textContent = s.text;
    card.querySelector('[data-prev]').hidden = i === 0;
    card.querySelector('[data-next]').textContent = i === steps.length - 1 ? 'Começar a usar' : 'Próximo';
    wrap.classList.toggle('center', !target);
    requestAnimationFrame(place);
    setTimeout(place, 60);
  };
  const end = () => {
    markSeen();
    running = false;
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey, true);
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 250);
    nav('hoje');
  };
  const go = (d) => {
    i += d;
    if (i >= steps.length) return end();
    i = Math.max(0, i);
    haptic('tick');
    show();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') (e.stopPropagation(), end());
    else if (e.key === 'ArrowRight' || e.key === 'Enter') (e.preventDefault(), go(1));
    else if (e.key === 'ArrowLeft') go(-1);
  };
  card.querySelector('[data-next]').onclick = () => go(1);
  card.querySelector('[data-prev]').onclick = () => go(-1);
  card.querySelector('[data-skip]').onclick = end;
  // toque fora do cartão: segue (como num carrossel)
  wrap.addEventListener('click', (e) => !e.target.closest('.tour-card') && go(1));
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  document.addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => wrap.classList.add('open'));
  show();
}
